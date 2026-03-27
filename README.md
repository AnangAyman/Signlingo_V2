# SignLingo: Sign Language Learning Platform

SignLingo is an interactive web application designed to make learning sign language accessible and engaging. The platform utilizes a variety of multimedia components, including video tutorials, image-based quizzes, and a real-time, AI-powered hand sign recognition game that provides instant feedback using a device's webcam.

## Features

* **User Authentication System:** Secure user registration, login, logout, and password recovery.
* **Profile Management:** Users can view and edit their personal information (name, age, email) and change their password.
* **Centralized Learning Dashboard:** A personalized hub that greets users and provides an at-a-glance overview of their learning progress.
* **Interactive Learning Activities:**
    * **Video Lessons:** Instructional videos for foundational knowledge.
    * **Multiple-Choice Quizzes:** Tests knowledge with image-based questions, immediate feedback, and sound effects.
    * **AI Hand Sign Recognition:** A real-time practice environment that uses a machine learning model to analyze a user's signs via their webcam.
* **Gamification & Progress Tracking:**
    * **Dynamic Progress Monitoring:** Visual progress bars and lesson statuses (`Completed`, `Current`, `Not Started`) track user advancement.
    * **Motivational Elements:** A daily streak counter encourages consistent practice.
* **Responsive and Animated UI:** The interface provides smooth visual feedback on user interactions, with animations on buttons, links, and other elements.

## Technology Stack

* **Backend:** Python, Flask, SQLAlchemy
* **Database:** SQLite (with Flask-Migrate for schema migrations)
* **Frontend:** HTML, CSS, JavaScript
* **Machine Learning:** TensorFlow/Keras, OpenCV, MediaPipe
* **Containerization:** Docker, Docker Compose

---

## How to Run This Project

There are two methods to run this application: using Docker (easiest and most reliable) or setting it up locally in a Python virtual environment.

### Method 1: Running with Docker (Recommended)

This is the easiest way to run the application, as it handles all dependencies and setup within a self-contained environment.

**1. Prerequisite:**
* You must have **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** installed and running on your machine.

**2. Build and Run the Application:**
Open your terminal or command prompt, navigate to the project's root directory (the one containing `docker-compose.yml`), and run this single command:

```bash
docker compose up --build
```
* The `--build` flag will build the Docker image from the `Dockerfile` the first time you run it. This might take several minutes as it downloads the Python image and installs all dependencies, including TensorFlow.
* Once the build is complete, the container will start, and you will see server logs in your terminal.

**3. Access the Application:**
Open your web browser and navigate to:

**[http://localhost:5001](http://localhost:5001)**

*(Note: We use port 5001 because the `docker-compose.yml` file maps it from the container's port 5000 to avoid potential conflicts on the host machine).*

**4. Stopping the Application:**
To stop the application, go back to your terminal and press `Ctrl+C`.

---

### Method 2: Local Setup (Without Docker)

If you prefer to run the application directly on your machine, follow these steps.

**1. Prerequisites:**
* Python 3.10
* Git

**2. Setup Instructions:**

* **a. Clone the Repository:**
    ```bash
    git clone [https://github.com/AnangAyman/Software-engineering-S4.git](https://github.com/AnangAyman/Software-engineering-S4.git)
    cd Software-engineering-S4
    ```

* **b. Create and Activate a Virtual Environment:**
    * On macOS/Linux:
        ```bash
        python3 -m venv venv
        source venv/bin/activate
        ```
    * On Windows:
        ```bash
        python -m venv venv
        .\venv\Scripts\activate
        ```

* **c. Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
    *(Note: This step may take a significant amount of time due to the size of the machine learning libraries.)*

* **d. Set Up the Database:**
    This command will apply the migration scripts to create the `users.sqlite` file and all necessary tables.
    ```bash
    flask db upgrade
    ```

* **e. Seed the Database with Initial Data:**
    This command populates the database with the lessons.
    ```bash
    flask seed_lessons
    ```

* **f. Run the Application:**
    ```bash
    flask run
    ```

* **g. Access the Application:**
    Open your web browser and navigate to: **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

### Using the Application

1.  Navigate to the site and click **Sign Up** to create an account.
2.  **Log In** with your new credentials.
3.  You will be directed to the **Dashboard**, where you can start learning.
4.  For the **Hand Sign Recognition** game, your browser will ask for permission to use your webcam. You must **Allow** it for the feature to work.