const video = document.getElementById("webcam");
const currentPredictionEl = document.getElementById("current-prediction");
const recordingIndicator = document.getElementById("recording-indicator");
const wordsList = document.getElementById("words-list");
const btnClear = document.getElementById("btn-clear");
const btnRecord = document.getElementById("btn-record");
const btnTranslate = document.getElementById("btn-translate");
const translationResult = document.getElementById("translation-result");
const translatedTextEl = document.getElementById("translated-text");
const btnSpeak = document.getElementById("btn-speak");

const SELECTED_FACE_IDS = [
  0, 13, 14, 17, 37, 39, 40, 61, 78, 80, 81, 82, 84, 87, 88, 91, 95, 146, 178, 181, 191,
  267, 269, 270, 291, 308, 310, 311, 312, 314, 317, 318, 321, 324, 375, 402, 405, 415,
  46, 52, 53, 55, 65, 70, 105, 107, 276, 282, 283, 285, 295, 300, 334, 336,
  50, 118, 123, 137, 205, 206, 207, 212, 214, 216,
  280, 347, 352, 366, 425, 426, 427, 432, 434, 436,
];

let holistic;
let camera;
let isRecording = false;
let recordingBuffer = [];
let recordingStartTime = 0;
const RECORDING_DURATION = 1500;

let recordedWords = [];
let lastSpokenText = "";

function initializeMediaPipe() {
  holistic = new Holistic({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`,
  });

  holistic.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    refineFaceLandmarks: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  holistic.onResults(onResults);

  camera = new Camera(video, {
    onFrame: async () => {
      await holistic.send({ image: video });
    },
    width: 640,
    height: 480,
  });
  camera.start();
}

function extractAndNormalizeKeypoints(results) {
  let cx = 0.0;
  let cy = 0.0;
  let cz = 0.0;
  let scale = 1.0;

  if (results.poseLandmarks) {
    const leftShoulder = results.poseLandmarks[11];
    const rightShoulder = results.poseLandmarks[12];

    cx = (leftShoulder.x + rightShoulder.x) / 2.0;
    cy = (leftShoulder.y + rightShoulder.y) / 2.0;
    cz = (leftShoulder.z + rightShoulder.z) / 2.0;

    const shoulderDistance = Math.sqrt(
      (leftShoulder.x - rightShoulder.x) ** 2 +
        (leftShoulder.y - rightShoulder.y) ** 2 +
        (leftShoulder.z - rightShoulder.z) ** 2
    );
    if (shoulderDistance > 0) scale = shoulderDistance;
  }

  function normalizeLandmarks(landmarkList, isFace = false) {
    if (!landmarkList) {
      return new Array((isFace ? SELECTED_FACE_IDS.length : 21) * 3).fill(0);
    }

    const data = [];
    for (let index = 0; index < landmarkList.length; index += 1) {
      if (isFace && !SELECTED_FACE_IDS.includes(index)) continue;
      const landmark = landmarkList[index];
      data.push((landmark.x - cx) / scale, (landmark.y - cy) / scale, (landmark.z - cz) / scale);
    }
    return data;
  }

  let pose = [];
  if (results.poseLandmarks) {
    for (const landmark of results.poseLandmarks) {
      pose.push((landmark.x - cx) / scale, (landmark.y - cy) / scale, (landmark.z - cz) / scale);
    }
  } else {
    pose = new Array(33 * 3).fill(0);
  }

  const face = normalizeLandmarks(results.faceLandmarks, true);
  const leftHand = normalizeLandmarks(results.leftHandLandmarks, false);
  const rightHand = normalizeLandmarks(results.rightHandLandmarks, false);

  return [].concat(pose, face, leftHand, rightHand);
}

async function onResults(results) {
  if (!isRecording) return;

  recordingBuffer.push(extractAndNormalizeKeypoints(results));
  const elapsed = performance.now() - recordingStartTime;

  if (elapsed < RECORDING_DURATION) return;

  isRecording = false;
  recordingIndicator.classList.remove("active");
  currentPredictionEl.innerText = "Predicting...";
  btnRecord.disabled = false;

  const sampledSequence = [];
  const totalFrames = recordingBuffer.length;
  if (totalFrames > 0) {
    for (let index = 0; index < 30; index += 1) {
      const frameIndex = totalFrames === 1 ? 0 : Math.floor((index / 29) * (totalFrames - 1));
      sampledSequence.push(recordingBuffer[frameIndex]);
    }
  } else {
    for (let index = 0; index < 30; index += 1) sampledSequence.push(new Array(447).fill(0));
  }

  await sendSequenceForPrediction(sampledSequence);
  recordingBuffer = [];
}

async function sendSequenceForPrediction(sequence) {
  try {
    const response = await fetch("/predict_gru", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sequence }),
    });

    if (response.ok) {
      const data = await response.json();
      handlePrediction(data.result, data.confidence);
    } else {
      currentPredictionEl.innerText = "Prediction Error";
    }
  } catch (error) {
    console.error(error);
    currentPredictionEl.innerText = "Prediction Error";
  }
}

function handlePrediction(predictedWord, confidence) {
  const confidencePercent = Math.round(confidence * 100);

  if (confidence > 0.6) {
    currentPredictionEl.innerText = `${predictedWord} (${confidencePercent}%)`;
    currentPredictionEl.style.color = "#16a34a";
    addWord(predictedWord);
  } else {
    currentPredictionEl.innerText = `${predictedWord} (${confidencePercent}%) - Too low`;
    currentPredictionEl.style.color = "#dc2626";
  }

  setTimeout(() => {
    if (!isRecording) {
      currentPredictionEl.innerText = "Ready";
      currentPredictionEl.style.color = "#000";
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
  wordsList.innerHTML = "";
  recordedWords.forEach((word, index) => {
    const chip = document.createElement("div");
    chip.className = "word-chip";
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
  recordingIndicator.classList.add("active");
  currentPredictionEl.innerText = "Recording...";
  currentPredictionEl.style.color = "#ef4444";
  btnRecord.disabled = true;
}

document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    triggerRecording();
  }
});

btnRecord.addEventListener("click", () => {
  triggerRecording();
});

btnClear.addEventListener("click", () => {
  recordedWords = [];
  renderWords();
  translationResult.style.display = "none";
});

btnTranslate.addEventListener("click", async () => {
  if (recordedWords.length === 0) {
    alert("Please record some words first.");
    return;
  }

  const originalText = btnTranslate.innerHTML;
  btnTranslate.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Translating...';
  btnTranslate.disabled = true;
  translationResult.style.display = "none";

  try {
    const response = await fetch("/translate_sequence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ words: recordedWords }),
    });
    const data = await response.json().catch(() => ({}));

    if (response.ok && data.translated) {
      lastSpokenText = data.translated;
      translatedTextEl.innerText = lastSpokenText;
      translationResult.style.display = "block";
      speakText(lastSpokenText);
    } else {
      alert(`Translation failed: ${data.error || `HTTP ${response.status}`}`);
    }
  } catch (error) {
    console.error(error);
    alert("Error connecting to translation service.");
  } finally {
    btnTranslate.innerHTML = originalText;
    btnTranslate.disabled = false;
  }
});

btnSpeak.addEventListener("click", () => {
  if (lastSpokenText) speakText(lastSpokenText);
});

function speakText(text) {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  } else {
    alert("Text-to-speech is not supported in this browser.");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  initializeMediaPipe();
});
