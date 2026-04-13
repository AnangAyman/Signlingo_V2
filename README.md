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
* **Database:** Oracle Cloud MySQL HeatWave via SQLAlchemy (SQLite fallback for local development)
* **Frontend:** HTML, CSS, JavaScript
* **Machine Learning:** TensorFlow/Keras, OpenCV, MediaPipe
* **Containerization:** Docker, Docker Compose

---

## How to Run This Project

There are two methods to run this application: using Docker or setting it up locally in a Python virtual environment.

### Oracle Cloud MySQL Setup

The shared cloud database runs on Oracle Cloud MySQL HeatWave. The DB system is private-only, so local development uses the Oracle Compute VM as an SSH tunnel.

**1. Set up SSH access:**

Do not share the original Oracle VM private key through GitHub, chat, or email. Each developer should generate their own SSH key pair and send only the public key to the DB/infra owner.

On each developer machine:

```bash
ssh-keygen -t ed25519 -C "your-name-signlingo"
```

Send this file's contents to the DB/infra owner:

```text
~/.ssh/id_ed25519.pub
```

Keep this file private and never share it:

```text
~/.ssh/id_ed25519
```

The DB/infra owner adds each developer's public key to the VM:

```bash
~/.ssh/authorized_keys
```

**2. Start the SSH tunnel:**

```bash
ssh -L 3307:10.0.1.50:3306 -i ~/.ssh/id_ed25519 ubuntu@134.185.98.192
```

Keep this terminal open while the app is running.

**3. Configure `.env`:**

Use `.env.example` as the template. For local conda execution, point SQLAlchemy at the local tunnel:

```env
DATABASE_URI=mysql+pymysql://admin:MYSQL_PASSWORD@127.0.0.1:3307/signlingo
```

For Docker Compose, use the host gateway name:

```env
DATABASE_URI=mysql+pymysql://admin:MYSQL_PASSWORD@host.docker.internal:3307/signlingo
```

**4. Initialize or migrate the database:**

Use `init-app` only when intentionally resetting and seeding the database. For a non-SQLite database, the command requires `ALLOW_DB_RESET=1`:

```bash
ALLOW_DB_RESET=1 flask --app app.py init-app
```

For existing data, prefer migrations:

```bash
flask --app app.py db upgrade
```

To seed the initial lessons, admin user, and shop items without dropping existing tables:

```bash
flask --app app.py seed-data
```

### Method 1: Running with Docker (Recommended)

This runs the application in a container while reading environment variables from `.env`.

**1. Prerequisite:**
* You must have **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** installed and running on your machine.
* The Oracle MySQL SSH tunnel must already be running if `.env` points to `host.docker.internal:3307`.

**2. Build and Run the Application:**
Open your terminal or command prompt, navigate to the project's root directory (the one containing `docker-compose.yml`), and run this single command:

```bash
docker compose up --build
```
* The `--build` flag will build the Docker image from the `Dockerfile` the first time you run it. This might take several minutes as it downloads the Python image and installs all dependencies, including TensorFlow.
* Once the build is complete, the container will start, and you will see server logs in your terminal.
* The Docker image no longer runs `flask init-app` during build, so cloud database resets must be run intentionally.

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
    git clone https://github.com/AnangAyman/Signlingo_V2.git
    cd Signlingo_V2
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
    For an existing database, apply migrations:
    ```bash
    flask --app app.py db upgrade
    ```

* **e. Seed Initial Data (Lessons/Admin/Shop):**
    ```bash
    flask --app app.py seed-data
    ```

* **f. Run the Application:**
    ```bash
    flask --app app.py run
    ```

* **g. Access the Application:**
    Open your web browser and navigate to: **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

### Using the Application

1.  Navigate to the site and click **Sign Up** to create an account.
2.  **Log In** with your new credentials.
3.  You will be directed to the **Dashboard**, where you can start learning.
4.  For the **Hand Sign Recognition** game, your browser will ask for permission to use your webcam. You must **Allow** it for the feature to work.
