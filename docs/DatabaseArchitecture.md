# 🗄️ Database Architecture

This document outlines the SQLite database schema for the Exam Engine Platform.

## Core Tables

### 1. users

- **user_id**: Primary Key[cite: 4]
- **name**[cite: 4]
- **email**[cite: 4]
- **password hash**[cite: 4]
- **created at**[cite: 4]
- **last_active_date**: Helpful for calculating the "7 day streak" on the dashboard[cite: 4].

### 2. questions

- **question_id**: Primary Key[cite: 4]
- **exam**[cite: 4]
- **year**[cite: 4]
- **subject**[cite: 4]
- **topic**[cite: 4]
- **puc_level**[cite: 4]
- **difficulty**[cite: 4]
- **question_type**[cite: 4]
- **question_text**[cite: 4]
- **option_a, option_b, option_c, option_d**[cite: 4]
- **correct_option**[cite: 4]
- **solution_text**[cite: 4]
- **has image**: Boolean[cite: 4]
- **image_path, image2_path**[cite: 4]

## Exam & Session Tracking

### 3. generated_exams

This stores the "blueprint" of the mock test when a user clicks generate[cite: 4].

- **exam id**: Primary Key[cite: 4]
- **user id**: Foreign Key to users[cite: 4]
- **exam_type**: E.g., "Full Mock", "Physics", "Chemistry", etc.[cite: 4]
- **created_at**[cite: 4]

### 4. exam_questions (Mapping Table)

This links the random questions to a specific generated exam, taking up minimal space[cite: 4].

- **mapping_id**: Primary Key[cite: 4]
- **exam id**: Foreign Key to generated_exams[cite: 4]
- **question id**: Foreign Key to questions[cite: 4]
- **sequence_order**: Integer 1 to 60 to maintain exact question order for resumed sessions[cite: 4].

### 5. attempts

Links the student's actual test attempt back to the specific exam blueprint they generated[cite: 4].

- **attempt_id**: Primary Key[cite: 4]
- **user id**: Foreign Key to users[cite: 4]
- **generated_exam_id**: Foreign Key to generated_exams (Nullable for quick practice sessions)[cite: 4]
- **mode**: "mock" or "practice"[cite: 4]
- **start time**[cite: 4]
- **end time**[cite: 4]
- **score**[cite: 4]

### 6. responses

- **response_id**: Primary Key[cite: 4]
- **attempt_id**: Foreign Key to attempts[cite: 4]
- **question id**: Foreign Key to questions[cite: 4]
- **selected_option**: A, B, C, D, or Null if skipped[cite: 4]
- **is_correct**: Boolean (saves time during analytics queries)[cite: 4]
- **time_taken_seconds**: Optional but recommended for speed vs. accuracy analytics[cite: 4].

## Feedback & Reporting

### 7. question_reports

Used when students find a wrong question or typo[cite: 4].

- **report_id**: Primary Key[cite: 4]
- **user id**: Foreign Key to users[cite: 4]
- **question_id**: Foreign Key to questions[cite: 4]
- **issue type**: E.g., "Wrong Option", "Typo in Question"[cite: 4]
- **description**[cite: 4]
- **status**: "Pending", "Resolved"[cite: 4]

### 8. app_feedback

For general platform feedback[cite: 4].

- **feedback id**: Primary Key[cite: 4]
- **user id**: Foreign Key to users[cite: 4]
- **message**[cite: 4]
- **created_at**[cite: 4]