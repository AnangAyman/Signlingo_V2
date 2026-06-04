const video = document.getElementById('webcam');
const currentPredictionEl = document.getElementById('current-prediction');
const recordingIndicator = document.getElementById('recording-indicator');
const wordsList = document.getElementById('words-list');
const btnClear = document.getElementById('btn-clear');
const btnRecord = document.getElementById('btn-record');
const btnTranslate = document.getElementById('btn-translate');
const translationResult = document.getElementById('translation-result');
const translatedTextEl = document.getElementById('translated-text');
const btnSpeak = document.getElementById('btn-speak');

const SELECTED_FACE_IDS = [
    0, 13, 14, 17, 37, 39, 40, 61, 78, 80, 81, 82, 84, 87, 88, 91, 95, 146, 178, 181, 191, 267, 269, 270, 291, 308, 310, 311, 312, 314, 317, 318, 321, 324, 375, 402, 405, 415,
    46, 52, 53, 55, 65, 70, 105, 107, 276, 282, 283, 285, 295, 300, 334, 336,
    50, 118, 123, 137, 205, 206, 207, 212, 214, 216,
    280, 347, 352, 366, 425, 426, 427, 432, 434, 436
];

let holistic;
let camera;
let isRecording = false;
let recordingBuffer = [];
let recordingStartTime = 0;
const RECORDING_DURATION = 1500; // 1.5 seconds

let recordedWords = [];
let lastSpokenText = "";

function initializeMediaPipe() {
    holistic = new Holistic({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
        }
    });

    holistic.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        refineFaceLandmarks: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    holistic.onResults(onResults);

    camera = new Camera(video, {
        onFrame: async () => {
            await holistic.send({ image: video });
        },
        width: 640,
        height: 480
    });
    camera.start();
}

function extractAndNormalizeKeypoints(results) {
    let cx = 0.0, cy = 0.0, cz = 0.0;
    let scale = 1.0;

    if (results.poseLandmarks) {
        let l_sh = results.poseLandmarks[11];
        let r_sh = results.poseLandmarks[12];

        cx = (l_sh.x + r_sh.x) / 2.0;
        cy = (l_sh.y + r_sh.y) / 2.0;
        cz = (l_sh.z + r_sh.z) / 2.0;

        let shoulder_dist = Math.sqrt(Math.pow(l_sh.x - r_sh.x, 2) + Math.pow(l_sh.y - r_sh.y, 2) + Math.pow(l_sh.z - r_sh.z, 2));
        if (shoulder_dist > 0) scale = shoulder_dist;
    }

    function norm(lmList, isFace = false) {
        if (!lmList) {
            return new Array((isFace ? SELECTED_FACE_IDS.length : 21) * 3).fill(0);
        }
        let data = [];
        for (let i = 0; i < lmList.length; i++) {
            if (isFace && !SELECTED_FACE_IDS.includes(i)) continue;
            let lm = lmList[i];
            data.push((lm.x - cx) / scale, (lm.y - cy) / scale, (lm.z - cz) / scale);
        }
        return data;
    }

    let pose = [];
    if (results.poseLandmarks) {
        for (let lm of results.poseLandmarks) {
            pose.push((lm.x - cx) / scale, (lm.y - cy) / scale, (lm.z - cz) / scale);
        }
    } else {
        pose = new Array(33 * 3).fill(0);
    }

    let face = norm(results.faceLandmarks, true);
    let lh = norm(results.leftHandLandmarks, false);
    let rh = norm(results.rightHandLandmarks, false);

    return [].concat(pose, face, lh, rh);
}

async function onResults(results) {
    if (isRecording) {
        let keypoints = extractAndNormalizeKeypoints(results);
        recordingBuffer.push(keypoints);

        let elapsed = performance.now() - recordingStartTime;
        
        if (elapsed >= RECORDING_DURATION) {
            isRecording = false;
            recordingIndicator.classList.remove('active');
            currentPredictionEl.innerText = `Predicting...`;
            btnRecord.disabled = false;

            // Uniformly sample exactly 30 frames from the buffer
            let sampledSequence = [];
            let total_f = recordingBuffer.length;
            if (total_f > 0) {
                for (let i = 0; i < 30; i++) {
                    let idx = total_f === 1 ? 0 : Math.floor((i / 29) * (total_f - 1));
                    sampledSequence.push(recordingBuffer[idx]);
                }
            } else {
                for (let i = 0; i < 30; i++) sampledSequence.push(new Array(447).fill(0));
            }

            await sendSequenceForPrediction(sampledSequence);
            recordingBuffer = [];
        }
    }
}

async function sendSequenceForPrediction(seq) {
    try {
        const res = await fetch('/predict_gru', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sequence: seq })
        });

        if (res.ok) {
            const data = await res.json();
            handlePrediction(data.result, data.confidence);
        } else {
            currentPredictionEl.innerText = "Prediction Error";
        }
    } catch (e) {
        console.error(e);
        currentPredictionEl.innerText = "Prediction Error";
    }
}

function handlePrediction(predictedWord, confidence) {
    const cfPercent = Math.round(confidence * 100);
    
    if (confidence > 0.60) {
        currentPredictionEl.innerText = `${predictedWord} (${cfPercent}%)`;
        currentPredictionEl.style.color = '#16a34a';
        addWord(predictedWord);
    } else {
        currentPredictionEl.innerText = `${predictedWord} (${cfPercent}%) - Too low`;
        currentPredictionEl.style.color = '#dc2626';
    }
    
    setTimeout(() => {
        if (!isRecording) {
            currentPredictionEl.innerText = 'Ready';
            currentPredictionEl.style.color = '#000';
        }
    }, 2000);
}

function addWord(word) {
    recordedWords.push(word);
    renderWords();
}

function removeWord(index) {
    recordedWords.splice(index, 1);
    renderWords();
}

function renderWords() {
    wordsList.innerHTML = '';
    recordedWords.forEach((word, index) => {
        const chip = document.createElement('div');
        chip.className = 'word-chip';
        chip.innerHTML = `
            ${word}
            <button onclick="removeWord(${index})" title="Remove"><i class="fa-solid fa-xmark"></i></button>
        `;
        wordsList.appendChild(chip);
    });
}

function triggerRecording() {
    if (isRecording) return;
    isRecording = true;
    recordingBuffer = [];
    recordingStartTime = performance.now();
    recordingIndicator.classList.add('active');
    currentPredictionEl.innerText = "Recording...";
    currentPredictionEl.style.color = '#ef4444';
    btnRecord.disabled = true;
}

// Event Listeners
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault(); // prevent scrolling
        triggerRecording();
    }
});

btnRecord.addEventListener('click', () => {
    triggerRecording();
});

btnClear.addEventListener('click', () => {
    recordedWords = [];
    renderWords();
    translationResult.style.display = 'none';
});

btnTranslate.addEventListener('click', async () => {
    if (recordedWords.length === 0) {
        alert("Please record some words first!");
        return;
    }

    const originalText = btnTranslate.innerHTML;
    btnTranslate.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Translating...';
    btnTranslate.disabled = true;
    translationResult.style.display = 'none';

    try {
        const res = await fetch('/translate_sequence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ words: recordedWords })
        });

        if (res.ok) {
            const data = await res.json();
            if (data.translated) {
                lastSpokenText = data.translated;
                translatedTextEl.innerText = lastSpokenText;
                translationResult.style.display = 'block';
                speakText(lastSpokenText);
            } else {
                alert("Translation failed: " + (data.error || "Unknown error"));
            }
        } else {
            alert("Translation request failed.");
        }
    } catch (e) {
        console.error(e);
        alert("Error connecting to translation service.");
    } finally {
        btnTranslate.innerHTML = originalText;
        btnTranslate.disabled = false;
    }
});

btnSpeak.addEventListener('click', () => {
    if (lastSpokenText) {
        speakText(lastSpokenText);
    }
});

function speakText(text) {
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'id-ID'; // Indonesian
        utterance.rate = 0.9; // Slightly slower for clarity
        window.speechSynthesis.speak(utterance);
    } else {
        alert("Text-to-Speech is not supported in this browser.");
    }
}

// Start camera on load
window.addEventListener('DOMContentLoaded', () => {
    initializeMediaPipe();
});
