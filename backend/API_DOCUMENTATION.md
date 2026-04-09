# CO Attainment Backend - Express.js API

Complete Express.js backend for multi-phase CO Attainment Automation system with persistent state tracking.

## 📋 Quick Start

### Prerequisites
- Node.js 14+ and npm
- PostgreSQL 12+
- Python 3.8+ (for the Python processing scripts)
- Tesseract OCR (for DOCX image extraction)

### Installation

1. **Clone/copy the backend folder**
```bash
cd backend
```

2. **Install Node dependencies**
```bash
npm install
```

3. **Create `.env` file from template**
```bash
cp .env.example .env
```

4. **Update `.env` with your database credentials:**
```
DATABASE_URL=postgresql://user:password@localhost:5432/co_attainment
JWT_SECRET=your_secret_key_here
UPLOADS_DIR=/path/to/uploads
OUTPUTS_DIR=/path/to/outputs
PYTHON_STAGE_DIR=./python  # Path to Python stage scripts
```

5. **Create PostgreSQL database**
```bash
createdb co_attainment
```

6. **Run database migrations**
```bash
npm run migrate
```

7. **Start the server**
```bash
npm start                # Production
npm run dev             # Development (with nodemon)
```

Server runs on `http://localhost:5000` by default.

---

## 🏗️ Architecture

### Directory Structure
```
backend/
├── config/
│   └── database.js              # Sequelize configuration
├── models/
│   ├── index.js                # Model exports & associations
│   ├── User.js                 # User model
│   ├── Subject.js              # Subject (course/batch)
│   ├── File.js                 # Uploaded files tracking
│   ├── Configuration.js        # EP, ELA, Constraint
│   ├── IntermediateOutput.js   # Processed Excel files
│   └── ProcessingLog.js        # Audit trail
├── routes/
│   ├── auth.js                 # Authentication (login/register)
│   ├── subjects.js             # Subject CRUD
│   ├── phase1.js               # CAT1 upload & processing
│   ├── phase2.js               # CAT2 + Assignments
│   ├── phase3.js               # Terminal & final report
│   ├── configuration.js        # EP, ELA, Constraint settings
│   └── reports.js              # Report download
├── middleware/
│   ├── auth.js                 # JWT authentication
│   ├── upload.js               # Multer file upload
│   └── errorHandler.js         # Global error handling
├── utils/
│   ├── pythonExecutor.js       # Run Python scripts
│   ├── fileManager.js          # File operations
│   └── phaseTracker.js         # Phase state tracking
├── server.js                   # Main Express app
├── package.json               # Dependencies
├── database.sql               # SQL schema
└── .env.example               # Environment template
```

---

## 🔌 API Endpoints

### Authentication

#### POST `/api/auth/register`
Register a new faculty member.

**Request:**
```json
{
  "email": "faculty@college.edu",
  "password": "secure_password",
  "full_name": "Dr. John Smith"
}
```

**Response:**
```json
{
  "status": "success",
  "user": {
    "id": 1,
    "email": "faculty@college.edu",
    "full_name": "Dr. John Smith",
    "role": "faculty"
  }
}
```

#### POST `/api/auth/login`
Login and receive JWT token.

**Request:**
```json
{
  "email": "faculty@college.edu",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "faculty@college.edu",
    "full_name": "Dr. John Smith",
    "role": "faculty"
  }
}
```

---

### Subjects

All subject endpoints require `Authorization: Bearer <token>` header.

#### POST `/api/subjects`
Create a new subject.

**Request:**
```json
{
  "subject_code": "CS1101",
  "subject_name": "Data Structures",
  "academic_year": "2024-25",
  "semester": 2
}
```

**Response:**
```json
{
  "status": "success",
  "subject": {
    "id": 1,
    "subject_code": "CS1101",
    "subject_name": "Data Structures",
    "academic_year": "2024-25",
    "semester": 2,
    "current_phase": 0
  }
}
```

#### GET `/api/subjects`
List all subjects for logged-in user with phase status.

**Response:**
```json
{
  "status": "success",
  "count": 2,
  "subjects": [
    {
      "id": 1,
      "subject_code": "CS1101",
      "subject_name": "Data Structures",
      "current_phase": 1,
      "status": "active",
      "phase1": {
        "cat1_qp": true,
        "cat1_marks": true,
        "completed": true
      },
      "phase2": {
        "cat2_qp": false,
        "cat2_marks": false,
        "ass1": false,
        "ass2": false,
        "completed": false
      },
      "phase3": {
        "terminal": false,
        "configuration_set": true,
        "completed": false
      }
    }
  ]
}
```

#### GET `/api/subjects/:id`
Get subject details and full status.

#### PUT `/api/subjects/:id`
Update subject information (name, year, semester).

#### DELETE `/api/subjects/:id`
Archive a subject (soft delete).

---

### Phase 1 - CAT1 (Continuous Assessment Test 1)

#### POST `/api/phase1/upload-qp`
Upload CAT1 Question Paper (DOCX).

**Form Data:**
- `subject_id` (number): Subject ID
- `file` (file): DOCX file

**Response:**
```json
{
  "status": "success",
  "file": {
    "id": 1,
    "file_type": "CAT1_QP",
    "stored_filename": "1712680000_CS1101_CAT1_QP_a1b2c3d4.docx",
    "file_size": "2.45",
    "processing_status": "pending"
  }
}
```

#### POST `/api/phase1/upload-marks`
Upload CAT1 Marks (XLSX from CAMU).

**Form Data:**
- `subject_id` (number)
- `file` (file): XLSX file

#### POST `/api/phase1/process`
Process CAT1 files with Stage 1 & 2.

**Request:**
```json
{
  "subject_id": 1
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Phase 1 processing complete",
  "output_path": "/outputs/QP_FINAL_1_1712680123.xlsx",
  "execution_time_ms": 15234
}
```

---

### Phase 2 - CAT2 & Assignments

#### POST `/api/phase2/upload`
Upload CAT2 QP, CAT2 Marks, ASS1, or ASS2.

**Form Data:**
- `subject_id` (number)
- `file_type` (string): One of `CAT2_QP`, `CAT2_MARKS`, `ASS1`, `ASS2`
- `file` (file)

#### POST `/api/phase2/process`
Consolidate CAT2 and Assignment files with Stage 3.

**Request:**
```json
{
  "subject_id": 1,
  "template_path": "/templates/CO_ATTAINMENT_TEMPLATE.xlsx"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Phase 2 processing complete",
  "output_path": "/outputs/CO_ATTAINMENT_FINAL_1_1712680456.xlsx",
  "execution_time_ms": 28900
}
```

---

### Phase 3 - Terminal & Final Report

#### POST `/api/phase3/upload-terminal`
Upload Terminal Marks (XLSX).

**Form Data:**
- `subject_id` (number)
- `file` (file)

#### POST `/api/phase3/finalize`
Generate final CO attainment report (Stage 4).

**Request:**
```json
{
  "subject_id": 1
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Final CO attainment report generated",
  "output_path": "/outputs/CO_ATTAINMENT_COMPLETE_1_1712680789.xlsx",
  "execution_time_ms": 12456,
  "configuration": {
    "ep": 80,
    "constraint": 79.99,
    "ela": {
      "CO1": 75,
      "CO2": 75,
      "CO3": 70,
      "CO4": 85,
      "CO5": 80,
      "CO6": 78
    }
  }
}
```

---

### Configuration - EP, ELA, Constraint

#### GET `/api/configuration/:subject_id`
Get current configuration values.

**Response:**
```json
{
  "status": "success",
  "configuration": {
    "subject_id": 1,
    "ep": 80,
    "constraint": 79.99,
    "ela": {
      "CO1": 75,
      "CO2": 75,
      "CO3": 70,
      "CO4": 85,
      "CO5": 80,
      "CO6": 78
    }
  }
}
```

#### PUT `/api/configuration/:subject_id`
Update configuration values.

**Request:**
```json
{
  "ep": 85,
  "constraint": 80,
  "ela": {
    "CO1": 75,
    "CO2": 78,
    "CO3": 72,
    "CO4": 86,
    "CO5": 82,
    "CO6": 80
  }
}
```

---

### Reports - Download & Retrieve

#### GET `/api/reports/:subject_id`
List all available reports for a subject.

**Response:**
```json
{
  "status": "success",
  "subject_id": 1,
  "count": 3,
  "reports": [
    {
      "id": 1,
      "stage": 2,
      "type": "CAT1_FINAL",
      "generated_at": "2024-04-09T12:30:00Z",
      "file_exists": true,
      "download_url": "/api/reports/download/1"
    },
    {
      "id": 2,
      "stage": 3,
      "type": "CO_ATTAINMENT_FINAL",
      "generated_at": "2024-04-09T14:45:00Z",
      "file_exists": true,
      "download_url": "/api/reports/download/2"
    },
    {
      "id": 3,
      "stage": 4,
      "type": "CO_ATTAINMENT_COMPLETE",
      "generated_at": "2024-04-09T15:20:00Z",
      "file_exists": true,
      "download_url": "/api/reports/download/3"
    }
  ]
}
```

#### GET `/api/reports/latest/:subject_id/:output_type`
Get latest report of a specific type.

Example: `/api/reports/latest/1/CO_ATTAINMENT_COMPLETE`

#### GET `/api/reports/download/:id`
Download a specific report by ID.

#### GET `/api/reports/download/:subject_id/:output_type`
Download latest report of a specific type.

---

## 🗄️ Database Schema

### Users Table
- **id** (PK): Integer
- **email** (UNIQUE): String
- **password_hash**: String (bcrypt)
- **full_name**: String
- **role**: ENUM ('faculty', 'admin')
- **created_at, updated_at**: Timestamps

### Subjects Table
- **id** (PK): Integer
- **user_id** (FK): Integer → Users
- **subject_code**: String
- **subject_name**: String
- **academic_year**: String
- **semester**: Integer
- **current_phase**: Integer (0-3)
- **status**: ENUM ('active', 'completed', 'archived')
- **created_at, updated_at**: Timestamps
- **UNIQUE(user_id, subject_code)**

### Files Table
- **id** (PK): Integer
- **subject_id** (FK): Integer → Subjects
- **file_type**: String (CAT1_QP, CAT1_MARKS, CAT2_QP, etc.)
- **original_filename**: String
- **stored_filename**: String
- **file_path**: String (absolute path on server)
- **file_size**: Integer (MB)
- **uploaded_by** (FK): Integer → Users
- **processing_status**: ENUM ('pending', 'processing', 'success', 'failed')
- **processing_error**: Text
- **created_at**: Timestamp

### Configuration Table
- **id** (PK): Integer
- **subject_id** (FK, UNIQUE): Integer → Subjects
- **ep**: Decimal(10,2)
- **constraint_value**: Decimal(10,2)
- **ela_co1 to ela_co6**: Decimal(10,2)
- **created_at, updated_at**: Timestamps

### IntermediateOutput Table
- **id** (PK): Integer
- **subject_id** (FK): Integer → Subjects
- **stage_number**: Integer (1-4)
- **output_type**: String (QP_FINAL, CAT1_FINAL, CAT2_FINAL, CO_ATTAINMENT_FINAL, CO_ATTAINMENT_COMPLETE)
- **file_path**: String (absolute path)
- **is_latest**: Boolean
- **created_at**: Timestamp

### ProcessingLog Table
For audit trail of all Python stage executions.
- **id** (PK): Integer
- **subject_id** (FK): Integer → Subjects
- **stage_number**: Integer
- **status**: String ('started', 'completed', 'failed')
- **input_files**: Text (JSON)
- **output_file**: String
- **error_message**: Text
- **execution_time_ms**: Integer
- **started_at, completed_at**: Timestamps

---

## 🔐 Authentication & Authorization

- JWT tokens: Valid for 7 days
- All protected routes require `Authorization: Bearer <token>` header
- Users can only access their own subjects
- Admin role for system administration

---

## ⚙️ File Management

### Naming Convention
```
timestamp_subjectCode_fileType_uuid.extension
```

Example:
```
1712680000_CS1101_CAT1_QP_a1b2c3d4.docx
1712680123_CS1101_CAT1_MARKS_x9y8z7w6.xlsx
```

### Storage
- **Uploads**: `${UPLOADS_DIR}/` - Temporary user uploads
- **Outputs**: `${OUTPUTS_DIR}/` - Processed Excel reports
- Configure paths in `.env`

### Cleanup
Old files are automatically archived (keep last 5 of each type).

---

## 🚀 Deployment

### Production Checklist
- [ ] Generate strong JWT_SECRET
- [ ] Use PostgreSQL (not SQLite)
- [ ] Set NODE_ENV=production
- [ ] Configure CORS with specific frontend domain
- [ ] Use HTTPS
- [ ] Set up automated backups for database
- [ ] Monitor disk space for uploads/outputs
- [ ] Configure reverse proxy (nginx/Apache)
- [ ] Add rate limiting
- [ ] Set up application logging

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5000
CMD ["npm", "start"]
```

---

## 📊 State Management - Phase Tracking

### Phase Logic
- **Phase 0**: Subject created, no files
- **Phase 1**: CAT1 QP + Marks processed
- **Phase 2**: CAT2 + Assignments processed
- **Phase 3**: Terminal marks + configuration complete

### Request Flow
```
POST /phase1/upload-qp
    ↓
POST /phase1/upload-marks
    ↓
POST /phase1/process
    ↓ [Runs Stage 1 & 2, generates CAT1_FINAL.xlsx]
    ↓ [Updates current_phase to 1]
    ↓
POST /phase2/upload (CAT2_QP, CAT2_MARKS, ASS1, ASS2)
    ↓
POST /phase2/process (with template_path)
    ↓ [Runs Stage 1 & 2 for CAT2, then Stage 3]
    ↓ [Generates CO_ATTAINMENT_FINAL.xlsx]
    ↓ [Updates current_phase to 2]
    ↓
POST /phase3/upload-terminal
    ↓
PUT /api/configuration/:subject_id (set EP, ELA, constraint)
    ↓
POST /phase3/finalize
    ↓ [Runs Stage 4]
    ↓ [Generates CO_ATTAINMENT_COMPLETE.xlsx]
    ↓ [Sets status to 'completed', phase to 3]
    ↓
GET /api/reports/download/:subject_id/CO_ATTAINMENT_COMPLETE
    ↓ [Faculty downloads final report]
```

---

## 🐛 Error Handling

All endpoints return consistent error format:

```json
{
  "error": "Detailed error message",
  "details": {}  // Optional additional info
}
```

HTTP Status Codes:
- **200**: Success
- **201**: Created
- **400**: Bad request
- **401**: Unauthorized (missing/invalid token)
- **403**: Forbidden (no access)
- **404**: Not found
- **500**: Server error

---

## 📝 Logging

- Morgan logs all HTTP requests
- ProcessingLog table stores audit trail of all Python executions
- Errors logged with stack traces in development mode

---

## 🔄 Workflow Summary

### Semester-Long Faculty Workflow

**Week 5 (Mid-Semester) - Phase 1**
1. Faculty uploads CAT1 QP (DOCX)
2. Faculty uploads CAT1 Marks (XLSX from CAMU)
3. System runs Stage 1 & 2 → generates CAT1_FINAL.xlsx
4. Faculty views/downloads CAT1 attainment report

**Week 10 (Late-Semester) - Phase 2**
1. Faculty uploads CAT2 QP (DOCX)
2. Faculty uploads CAT2 Marks (XLSX)
3. Faculty uploads ASS1 and ASS2 (XLSX)
4. System runs Stage 1 & 2 for CAT2, then Stage 3 → generates CO_ATTAINMENT_FINAL.xlsx
5. Faculty views intermediate report

**Week 17 (End-Semester) - Phase 3**
1. Faculty uploads Terminal Marks (XLSX)
2. Faculty sets configuration (EP, ELA, Constraint)
3. System runs Stage 4 → generates CO_ATTAINMENT_COMPLETE.xlsx
4. Faculty downloads final CO attainment report

All previous data is persistent in the database. No re-uploading of earlier phases needed.

---

## 📞 Support

For issues:
1. Check backend logs: `npm run dev` shows detailed errors
2. Check database: Verify PostgreSQL connection
3. Check file paths: Ensure uploads/outputs directories exist and are writeable
4. Check Python: Verify Python scripts are accessible at `PYTHON_STAGE_DIR`
