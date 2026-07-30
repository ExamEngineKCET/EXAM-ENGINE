import os
import sys
import json

# --- 1. BULLETPROOF PATH RESOLUTION ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
sys.path.append(BACKEND_DIR)

# --- 2. CORE IMPORTS ---
from app.core.database import SessionLocal, engine, Base

# --- 3. IMPORT ALL MODELS (Crucial for table creation) ---
from app.models.user import User
from app.models.question import Question
from app.models.attempt import Attempt, Response
from app.models.exam import GeneratedExam, ExamQuestion
from app.models.interactions import QuestionReport, AppFeedback

# --- 4. DATA DIRECTORY ---
DATA_DIR = os.path.join(BACKEND_DIR, "app", "data")

def seed_database():
    # THE NUKE OPTION: Destroy existing tables if they exist
    print("Wiping old database schema...")
    Base.metadata.drop_all(bind=engine)
    
    # REBUILD: Create all 8 imported tables
    print("Building all 8 tables from scratch...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    total_added = 0

    # CREATE DEFAULT TEST USER
    print("Creating default test user (Rohith)...")
    test_user = User(
        name="user",
        email="r@r.r",
        password_hash="1"
    )
    db.add(test_user)
    db.commit()

    # FIND JSON FILES
    json_files = [f for f in os.listdir(DATA_DIR) if f.endswith('.json')]
    if not json_files:
        print(f"No JSON files found in {DATA_DIR}")
        return

    # INSERT QUESTIONS
    for filename in json_files:
        filepath = os.path.join(DATA_DIR, filename)
        print(f"Processing: {filename}...")

        with open(filepath, 'r', encoding='utf-8') as file:
            try:
                data = json.load(file)
                metadata = data.get("metadata", {})
                questions = data.get("questions", [])

                # Clean and normalize the subject text once per file
                raw_subject = metadata.get("subject")
                clean_subject = str(raw_subject).strip().title() if raw_subject else "Unknown"

                for q in questions:
                    classification = q.get("classification", {})
                    options = q.get("options", {})
                    correct_answer = q.get("correct_answer", {})
                    media = q.get("media", {})
                    solution = q.get("solution", {})

                    question_obj = Question(
                        question_id=q.get("question_id"),
                        exam=metadata.get("exam_name", "KCET"),
                        year=metadata.get("year"),
                        subject=clean_subject,  #   FIXED: Enforces "Physics", "Chemistry", "Mathematics"
                        topic=classification.get("topic"),
                        chapter=classification.get("chapter"),
                        puc_level=classification.get("puc_level"),
                        difficulty=q.get("difficulty_level"),
                        question_type=q.get("question_type"),
                        question_text=q.get("question_text"),
                        option_a=options.get("A"),
                        option_b=options.get("B"),
                        option_c=options.get("C"),
                        option_d=options.get("D"),
                        correct_option=correct_answer.get("option"),
                        solution_text=solution.get("solution_text"),
                        has_image=media.get("has_image", False),
                        image_path=media.get("image_placeholder_path"),
                        image2_path=media.get("image2_placeholder_path")
                    )
                    db.merge(question_obj)
                    total_added += 1

                db.commit()
                print(f"  -> Successfully loaded {len(questions)} questions from {filename}")
            except Exception as e:
                print(f"  -> Error processing {filename}: {e}")
                db.rollback()

    db.close()
    print(f"\nSeeding complete! {total_added} total questions are now in the database.")

if __name__ == "__main__":
    seed_database()