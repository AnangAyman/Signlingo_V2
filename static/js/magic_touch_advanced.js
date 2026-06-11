// Global Variables
const video = document.getElementById('webcam');
const gameArea = document.getElementById('game-area');
const scoreValue = document.getElementById('score-value');
const livesContainer = document.getElementById('lives-container');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const startBtn = document.getElementById('start-game-btn');
const restartBtn = document.getElementById('restart-game-btn');
const popSound = document.getElementById('pop-sound');
const hurtSound = document.getElementById('hurt-sound');
const currentPredictionEl = document.getElementById('current-prediction');
const startGestureBtn = document.getElementById('start-gesture-btn');

let isPlaying = false;
let score = 0;
let lives = 3;
let enemies = [];
let spawnInterval;
let gameLoopRef;
let spawnRate = 4000;
let enemySpeed = 0.6;

const ACTIONS = [
    'Apa', 'Apa Kabar', 'Bagaimana', 'Baik', 'Belajar', 'Berapa', 'Berdiri', 'Bingung',
    'Dia', 'Dimana', 'Duduk', 'Halo', 'Kalian', 'Kami', 'Kamu', 'Kapan', 'Kemana', 'Kita',
    'Makan', 'Mandi', 'Marah', 'Melihat', 'Membaca', 'Menulis', 'Mereka', 'Minum', 'Pendek',
    'Ramah', 'Sabar', 'Saya', 'Sedih', 'Selamat Malam', 'Selamat Pagi', 'Selamat Siang',
    'Selamat Sore', 'Senang', 'Siapa', 'Terima Kasih', 'Tidur', 'Tinggi'
];

const SELECTED_FACE_IDS = [
    0, 13, 14, 17, 37, 39, 40, 61, 78, 80, 81, 82, 84, 87, 88, 91, 95, 146, 178, 181, 191, 267, 269, 270, 291, 308, 310, 311, 312, 314, 317, 318, 321, 324, 375, 402, 405, 415,
    46, 52, 53, 55, 65, 70, 105, 107, 276, 282, 283, 285, 295, 300, 334, 336,
    50, 118, 123, 137, 205, 206, 207, 212, 214, 216,
    280, 347, 352, 366, 425, 426, 427, 432, 434, 436
];

// MediaPipe Recording State
let recordingBuffer = [];
let recordingStartTime = 0;
const RECORDING_DURATION = 1500; // 2.5 seconds
let isRecording = false;
let holistic;
let camera;

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
    if (!isPlaying) return;

    if (isRecording) {
        let keypoints = extractAndNormalizeKeypoints(results);
        recordingBuffer.push(keypoints);

        let elapsed = performance.now() - recordingStartTime;
        let progress = Math.min(100, (elapsed / RECORDING_DURATION) * 100);

        currentPredictionEl.innerText = `Recording: ${Math.round(progress)}%`;
        startGestureBtn.innerText = `Recording (${Math.round(progress)}%)...`;
        startGestureBtn.disabled = true;

        if (elapsed >= RECORDING_DURATION) {
            isRecording = false;
            startGestureBtn.innerText = "Processing...";
            currentPredictionEl.innerText = `Predicting...`;

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
            startGestureBtn.innerText = "Start Gesturing (Space)";
            startGestureBtn.disabled = false;
        }
    }
}

async function sendSequenceForPrediction(seq) {
    try {
        const res = await fetch('/predict_gru', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sequence: seq })
        });

        if (res.ok) {
            const data = await res.json();
            handlePrediction(data.result, data.confidence);
        } else {
            console.error("Prediction failed");
            currentPredictionEl.innerText = "Prediction Error";
        }
    } catch (e) {
        console.error(e);
        currentPredictionEl.innerText = "Prediction Error";
    }
}

// Event Listeners
if (startBtn) startBtn.addEventListener('click', startGame);
if (restartBtn) restartBtn.addEventListener('click', startGame);

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (!isRecording && isPlaying) {
            e.preventDefault(); // prevent scrolling
            triggerRecording();
        }
    }
});

startGestureBtn.addEventListener('click', () => {
    if (!isRecording && isPlaying) {
        triggerRecording();
    }
});

function triggerRecording() {
    isRecording = true;
    recordingBuffer = [];
    recordingStartTime = performance.now();
}


function startGame() {
    isPlaying = true;
    score = 0;
    lives = 3;
    enemies.forEach(e => { if (e.element) e.element.remove(); });
    enemies = [];
    spawnRate = 4000;
    enemySpeed = 0.6;

    updateScoreUI();
    updateLivesUI();

    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    currentPredictionEl.innerText = "-";
    startGestureBtn.innerText = "Start Gesturing (Space)";

    if (!holistic) {
        initializeMediaPipe();
    }

    scheduleSpawn();
    gameLoopRef = requestAnimationFrame(gameLoop);
}

function stopGame() {
    isPlaying = false;
    isRecording = false;
    clearTimeout(spawnInterval);
    cancelAnimationFrame(gameLoopRef);
    finalScoreEl.innerText = score;
    gameOverScreen.style.display = 'flex';
}

function scheduleSpawn() {
    if (!isPlaying) return;
    spawnInterval = setTimeout(() => {
        spawnEnemy();
        spawnRate = Math.max(800, spawnRate * 0.98);
        enemySpeed += 0.05;
        scheduleSpawn();
    }, spawnRate);
}

function spawnEnemy() {
    let isBoss = Math.random() < 0.2;
    let wordCount = isBoss ? Math.floor(Math.random() * 2) + 2 : 1; // 1 for normal, 2-3 for boss
    let words = [];

    for (let i = 0; i < wordCount; i++) {
        let randomWord = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
        words.push(randomWord);
    }

    const enemyEl = document.createElement('div');
    enemyEl.classList.add('enemy');
    if (isBoss) enemyEl.classList.add('boss');

    const balloonContainer = document.createElement('div');
    balloonContainer.classList.add('balloon-container');
    // Align items stacked for bosses
    balloonContainer.style.flexDirection = 'column';

    let balloonEls = [];
    for (let i = 0; i < words.length; i++) {
        const b = document.createElement('div');
        b.classList.add('balloon');
        // Override padding and size for word text
        b.style.width = 'auto';
        b.style.padding = '5px 15px';
        b.style.borderRadius = '20px';
        b.innerText = words[i];
        balloonContainer.appendChild(b);
        balloonEls.push({ word: words[i], element: b });
    }

    const stringEl = document.createElement('div');
    stringEl.classList.add('string');

    const characterEl = document.createElement('div');
    characterEl.classList.add('enemy-character');

    enemyEl.appendChild(balloonContainer);
    enemyEl.appendChild(stringEl);
    enemyEl.appendChild(characterEl);

    const randomX = Math.random() * 80 + 10;
    enemyEl.style.left = `${randomX}%`;
    enemyEl.style.top = `-100px`;

    gameArea.appendChild(enemyEl);

    enemies.push({
        element: enemyEl,
        x: randomX,
        y: -100,
        speed: enemySpeed * (isBoss ? 0.7 : 1.0),
        words: words,
        balloons: balloonEls,
        isBoss: isBoss,
        isDefeated: false
    });
}

function gameLoop() {
    if (!isPlaying) return;

    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        e.y += e.speed;
        e.element.style.top = `${e.y}px`;

        const areaHeight = gameArea.clientHeight;
        if (e.y > areaHeight) {
            e.element.remove();
            enemies.splice(i, 1);
            if (!e.isDefeated) {
                loseLife();
            }
        }
    }

    gameLoopRef = requestAnimationFrame(gameLoop);
}

function playSound(audioEl) {
    if (audioEl) {
        audioEl.currentTime = 0;
        audioEl.play().catch(e => console.log(e));
    }
}

function loseLife() {
    playSound(hurtSound);
    lives--;
    updateLivesUI();

    livesContainer.classList.remove('pulse');
    void livesContainer.offsetWidth;
    livesContainer.classList.add('pulse');

    if (lives <= 0) {
        stopGame();
    }
}

function updateScoreUI() {
    scoreValue.innerText = score;
}

function updateLivesUI() {
    livesContainer.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const icon = document.createElement('i');
        icon.className = i < lives ? 'fa-solid fa-heart life-icon' : 'fa-regular fa-heart life-icon';
        livesContainer.appendChild(icon);
    }
}

function handlePrediction(predictedWord, confidence) {
    const cfPercent = Math.round(confidence * 100);
    currentPredictionEl.innerText = `${predictedWord} (${cfPercent}%)`;

    if (confidence > 0.60) {
        currentPredictionEl.classList.add('confident');

        let targetEnemy = null;
        let highestY = -Infinity;
        let targetBalloonIndex = -1;

        for (let i = 0; i < enemies.length; i++) {
            let e = enemies[i];
            let foundIndex = e.balloons.findIndex(b => b.word === predictedWord);

            if (foundIndex !== -1) {
                if (e.y > highestY) {
                    highestY = e.y;
                    targetEnemy = e;
                    targetBalloonIndex = foundIndex;
                }
            }
        }

        if (targetEnemy && targetBalloonIndex !== -1) {
            registerHit(targetEnemy, targetBalloonIndex);
        }
    } else {
        currentPredictionEl.classList.remove('confident');
        currentPredictionEl.innerText += " - Try again";
    }
}

function registerHit(targetEnemy, balloonIndex) {
    playSound(popSound);

    let poppedBalloon = targetEnemy.balloons.splice(balloonIndex, 1)[0];

    poppedBalloon.element.classList.add('popping');
    setTimeout(() => {
        if (poppedBalloon.element.parentNode) {
            poppedBalloon.element.parentNode.removeChild(poppedBalloon.element);
        }
    }, 200);

    score += 20;
    updateScoreUI();

    if (targetEnemy.balloons.length === 0) {
        targetEnemy.element.classList.add('falling');
        targetEnemy.speed += 15;
        targetEnemy.isDefeated = true;

        score += targetEnemy.isBoss ? 100 : 20;
        updateScoreUI();
    }
}
