# 🚀 KCET Exam Platform

A full-stack application for generating, managing, and taking custom Mock and Practice exams. 

## 🏗 Architecture Overview
This project is separated into a Python/FastAPI backend and a React/Vite frontend.

* **Frontend:** React (TypeScript), Vite, Tailwind CSS, Shadcn UI (`app/components/ui`)[cite: 2].
* **Backend:** Python (FastAPI, SQLAlchemy, Uvicorn)[cite: 3].
* **Database:** SQLite (Local file-based at `app/db/exam_engine.db`)[cite: 3].

## 💻 Local Development Setup

You will need **Python 3.10+**, **Node.js 18+**, and **pnpm** installed.

### 1. Database Setup
The application relies on a local SQLite database[cite: 3]. 
* We track users, questions, generated mock exams (`generated_exams`), attempts, and responses[cite: 1].
* To initialize your local database with practice questions, navigate to the backend folder and run the seed script:
  `python app/scripts/seed_db.py`[cite: 3].

### 2. Backend Setup
1. Navigate to the `backend/` directory[cite: 3].
2. Create and activate a virtual environment (`python -m venv .venv`).
3. Install dependencies: `pip install -r requirements.txt`[cite: 3].
4. Make sure your `.env` file is present in the `backend/` root[cite: 3].
5. Start the server: `uvicorn app.main:app --reload`[cite: 3].

### 3. Frontend Setup
1. Navigate to the `frontend/` directory[cite: 3].
2. Install dependencies using PNPM: `pnpm install`[cite: 2].
3. Start the development server: `pnpm run dev`[cite: 2].

### 🚀 Quick Start
If dependencies are already installed, you can start the entire stack from the root directory by running:
`./run.sh`# 🚀 KCET Exam Platform

A full-stack application for generating, managing, and taking custom Mock and Practice exams. 

## 🏗 Architecture Overview
This project is separated into a Python/FastAPI backend and a React/Vite frontend.

* **Frontend:** React (TypeScript), Vite, Tailwind CSS, Shadcn UI (`app/components/ui`)[cite: 2].
* **Backend:** Python (FastAPI, SQLAlchemy, Uvicorn)[cite: 3].
* **Database:** SQLite (Local file-based at `app/db/exam_engine.db`)[cite: 3].

## 💻 Local Development Setup

You will need **Python 3.10+**, **Node.js 18+**, and **pnpm** installed.

### 1. Database Setup
The application relies on a local SQLite database[cite: 3]. 
* We track users, questions, generated mock exams (`generated_exams`), attempts, and responses[cite: 1].
* To initialize your local database with practice questions, navigate to the backend folder and run the seed script:
  `python app/scripts/seed_db.py`[cite: 3].

### 2. Backend Setup
1. Navigate to the `backend/` directory[cite: 3].
2. Create and activate a virtual environment (`python -m venv .venv`).
3. Install dependencies: `pip install -r requirements.txt`[cite: 3].
4. Make sure your `.env` file is present in the `backend/` root[cite: 3].
5. Start the server: `uvicorn app.main:app --reload`[cite: 3].

### 3. Frontend Setup
1. Navigate to the `frontend/` directory[cite: 3].
2. Install dependencies using PNPM: `pnpm install`[cite: 2].
3. Start the development server: `pnpm run dev`[cite: 2].

### 🚀 Quick Start
If dependencies are already installed, you can start the entire stack from the root directory by running:
`./run.sh`