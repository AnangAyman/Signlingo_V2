# Instructions for AI: Implementing the SignLingo Inference Pipeline

You have been tasked with building the AI inferencing game. To ensure your game correctly interfaces with our pre-trained model (`signlingo_v2_gru_4.h5`), **you MUST replicate our exact data collection and preprocessing pipeline**. If the input data is not formatted and normalized identically to the training data, the model's predictions will fail.

Here is exactly what you need to implement:

## 1. System Architecture & Workflow (CRITICAL)
**Do NOT send raw images from the frontend to the backend.** Sending 30 webcam images (2-5 MB) via HTTP POST will cause massive network lag and freeze the real-time game.

You must implement the following split workflow:
1. **Frontend (JavaScript):**
   - Capture video using the webcam in the browser.
   - Run **MediaPipe Holistic (JS library)** directly in the browser on the incoming video frames.
   - For every frame, extract and normalize the landmarks using the math described below.
   - Collect exactly **30 frames** of these normalized landmarks.
   - Send the tiny JSON array of dimensions `(30, 447)` to the Python backend via a single HTTP POST request.
2. **Backend (Python/Django):**
   - Receive the `(30, 447)` float array.
   - Convert it to a NumPy tensor of shape `(1, 30, 447)`.
   - Run `model.predict()` using the GRU model.
   - Return the predicted word string back to the frontend.

## 2. Video Capture Length (Frame Count)
Our model was trained on exactly **30 frames** of data per sequence (`SEQUENCE_LENGTH = 30`).
- **Do not use a fixed time duration (e.g., 1 second)** for inference! Depending on the user's hardware, processing 30 frames with MediaPipe can take anywhere from **1 to 3 seconds**. 
- In our test trigger (`test_webcam_trigger.py`), we simply start recording and capture exactly the next 30 frames processed by MediaPipe in real-time. 
- **Requirement:** Your JS frontend must keep appending the extracted frames to an array until it hits exactly `length == 30` before sending it to the backend.

## 3. Keypoint Extraction (MediaPipe)
For each of the 30 frames, you must extract specific landmarks to match the training features (447 total dimensions per frame). You must extract:
- **Pose:** All 33 landmarks.
- **Left Hand:** All 21 landmarks.
- **Right Hand:** All 21 landmarks.
- **Face (Crucial):** Do NOT extract all 468 face landmarks. You must extract **only these specific 74 indices** (Lips, Eyebrows, and Cheeks):
  `[0, 13, 14, 17, 37, 39, 40, 61, 78, 80, 81, 82, 84, 87, 88, 91, 95, 146, 178, 181, 191, 267, 269, 270, 291, 308, 310, 311, 312, 314, 317, 318, 321, 324, 375, 402, 405, 415, 46, 52, 53, 55, 65, 70, 105, 107, 276, 282, 283, 285, 295, 300, 334, 336, 50, 118, 123, 137, 205, 206, 207, 212, 214, 216, 280, 347, 352, 366, 425, 426, 427, 432, 434, 436]`

*(Note: 33 Pose + 74 Face + 21 L.Hand + 21 R.Hand = 149 points. 149 points * 3 coordinates (x,y,z) = 447 dimensions).*

## 4. Data Normalization (CRITICAL)
Before flattening the keypoints, you must normalize them. Our model is translation and scale-invariant because we applied **Shoulder Normalization**. 

For **every single frame**, you must apply this exact math to all extracted `(x, y, z)` keypoints:

1. **Calculate the Origin (Translation):**
   - Find the coordinates of the Left Shoulder (`pose_landmarks[11]`) and Right Shoulder (`pose_landmarks[12]`).
   - Calculate the midpoint: `cx = (l_sh.x + r_sh.x)/2`, `cy = (l_sh.y + r_sh.y)/2`, `cz = (l_sh.z + r_sh.z)/2`.
   - Subtract `(cx, cy, cz)` from every single keypoint in the frame.

2. **Calculate the Scale (Scale Invariance):**
   - Calculate the Euclidean distance between the Left and Right Shoulders: `Math.sqrt((l_sh.x - r_sh.x)**2 + (l_sh.y - r_sh.y)**2 + (l_sh.z - r_sh.z)**2)`.
   - Divide every keypoint's `(x, y, z)` coordinates by this distance.

*(If no pose is detected in a frame, you must pad the frame with an array of zeros to maintain the shape).*

## 5. Final Input Shape
Once normalized, flatten the arrays for each frame in this exact order: `[Pose, Face, Left Hand, Right Hand]`.
This results in a 1D array of **447** values per frame.
The final payload sent to the backend will be a 2D JSON array of length 30, where each element is a 1D array of length 447.
