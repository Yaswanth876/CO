-- CO Attainment Automation Database Schema
-- PostgreSQL

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'faculty',  -- 'faculty', 'admin'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subjects table (represents a course/batch)
CREATE TABLE subjects (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_code VARCHAR(50) NOT NULL,
  subject_name VARCHAR(255) NOT NULL,
  academic_year VARCHAR(20),
  semester INTEGER,
  current_phase INTEGER DEFAULT 0,  -- 0=created, 1=CAT1_done, 2=CAT2_done, 3=final_done
  status VARCHAR(50) DEFAULT 'active',  -- 'active', 'completed', 'archived'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, subject_code)
);

-- Files table (tracks all uploaded files)
CREATE TABLE files (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  file_type VARCHAR(50) NOT NULL,  -- 'CAT1_MARKS', 'CAT2_MARKS', 'ASS1', 'ASS2', 'TERMINAL'
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,  -- timestamp_subjectCode_type_filename
  file_path VARCHAR(500) NOT NULL,  -- Absolute path on server
  file_size INTEGER,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uploaded_by INTEGER REFERENCES users(id),
  processing_status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'processing', 'success', 'failed'
  processing_error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



-- Configuration table (stores EP, ELA, Constraint per subject)
CREATE TABLE configurations (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL UNIQUE REFERENCES subjects(id) ON DELETE CASCADE,
  ep DECIMAL(10, 2) DEFAULT 80.00,  -- Expected Proficiency
  constraint_value DECIMAL(10, 2) DEFAULT 79.99,
  ela_co1 DECIMAL(10, 2) DEFAULT 75.00,
  ela_co2 DECIMAL(10, 2) DEFAULT 75.00,
  ela_co3 DECIMAL(10, 2) DEFAULT 70.00,
  ela_co4 DECIMAL(10, 2) DEFAULT 85.00,
  ela_co5 DECIMAL(10, 2) DEFAULT 80.00,
  ela_co6 DECIMAL(10, 2) DEFAULT 78.00,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Processing logs table (audit trail)
CREATE TABLE processing_logs (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL,
  status VARCHAR(50),  -- 'started', 'completed', 'failed'
  input_files TEXT,  -- JSON array of file paths
  output_file VARCHAR(500),
  error_message TEXT,
  execution_time_ms INTEGER,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_subjects_user_id ON subjects(user_id);
CREATE INDEX idx_subjects_status ON subjects(status);
CREATE INDEX idx_files_subject_id ON files(subject_id);
CREATE INDEX idx_files_file_type ON files(file_type);
CREATE INDEX idx_files_status ON files(processing_status);

CREATE INDEX idx_logs_subject ON processing_logs(subject_id);

-- Insert default admin user (password: admin123 - hash this in production!)
INSERT INTO users (email, password_hash, full_name, role)
VALUES ('admin@college.edu', '$2b$10$gcb8FF.RcRP61asWxN5ga.vSq70jQM2KUhFc6CHI8DAEpbFCnRDXO', 'System Admin', 'admin');
