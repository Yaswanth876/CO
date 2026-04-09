# CO Attainment Automation Backend

Production-ready Python processing engine for Course Outcome (CO) Attainment Automation. This backend processes question papers, student marks, and generates CO attainment reports following exact specifications for Excel structure and calculations.

## Setup

### Prerequisites
- Python 3.8+
- Tesseract OCR (for image text extraction)

**Linux:**
```bash
sudo apt install tesseract-ocr
```

**macOS:**
```bash
brew install tesseract
```

**Windows:**
Download and install from: https://github.com/UB-Mannheim/tesseract/wiki

### Installation

```bash
pip install -r requirements.txt
```

## Architecture

All stages are standalone Python scripts callable via `child_process` from Node.js.

### Calling Pattern

Each stage accepts a JSON argument via command line and returns JSON status:

```javascript
const { spawn } = require('child_process');

function runPythonStage(scriptPath, args) {
  return new Promise((resolve, reject) => {
    const py = spawn('python3', [scriptPath, JSON.stringify(args)]);
    let stdout = '', stderr = '';
    py.stdout.on('data', d => stdout += d.toString());
    py.stderr.on('data', d => stderr += d.toString());
    py.on('close', code => {
      if (code !== 0) return reject(new Error(stderr));
      try { resolve(JSON.parse(stdout)); }
      catch (e) { reject(new Error('Invalid JSON: ' + stdout)); }
    });
  });
}
```

## Stages

### Stage 1: Question Paper Parsing (DOCX → Excel)
**File:** `stage1_qp.py`

Reads a .docx question paper and extracts:
- Course metadata (code, name, faculty, date, academic year)
- Course outcomes (COs) and their target proficiency scores (TPS)
- Question structure with marks and CO mappings

**Input:**
```json
{
  "docx_path": "/path/to/question_paper.docx",
  "output_path": "/path/to/output_QP_FINAL.xlsx"
}
```

**Output:** Excel file with structured metadata and question layout ready for student marks injection

---

### Stage 2: Student Database Injection (Marks Matrix → QP Excel)
**File:** `stage2_marks.py`

Reads student marks from CAMU export and injects into Stage 1 output:
- Extracts register numbers and student names
- Injects full marks matrix (from column D onward)
- Auto-formats columns

**Input:**
```json
{
  "qp_excel_path": "/path/to/QP_FINAL.xlsx",
  "student_db_path": "/path/to/student_marks.xlsx"
}
```

**Notes:**
- CAMU export structure: rows 0-2 are headers, actual data from row 3
- Marks start at column G (index 6)
- Student data injected at Excel row 13 onward
- File is modified in-place and saved

---

### Stage 3: Master Template Consolidation (CAT1, CAT2, ASS1, ASS2 → Template)
**File:** `stage3_consolidate.py`

Consolidates 4 assessment files into the CO Attainment Master Template:
- **CAT1** (Continuous Assessment Test 1): columns 5-25
- **CAT2** (Continuous Assessment Test 2): columns 27-46
- **ASS1** (Assignment 1): columns 56-61, total = 40 marks
- **ASS2** (Assignment 2): columns 64-69, total = 40 marks

**Input:**
```json
{
  "template_path": "/path/to/CO_ATTAINMENT_TEMPLATE.xlsx",
  "cat1_path": "/path/to/CAT1_FINAL.xlsx",
  "cat2_path": "/path/to/CAT2_FINAL.xlsx",
  "ass1_path": "/path/to/ASS1.xlsx",
  "ass2_path": "/path/to/ASS2.xlsx",
  "output_path": "/path/to/CO_ATTAINMENT_FINAL.xlsx"
}
```

**Key Business Rules:**
- Template uses Sheet1 (worksheets[1], 0-indexed)
- Question matching uses normalized identifiers (removes dots, case-insensitive)
- Assignment marks are auto-adjusted to total 40 per subject
- Max 6 columns per assignment

---

### Stage 4: Final CO Attainment Calculation
**File:** `stage4_attainment.py`

Generates the final CO attainment report in Sheet2 with:
- **Internal Assessment %** (columns E-J)
- **Terminal Assessment marks** (columns L-Q)
- **Final CO scores** (columns S-X) = 0.7×Internal + 0.3×Terminal
- **Attainment Summary:**
  - Total student count
  - Expected Proficiency (EP)
  - Students meeting constraint (score ≥ threshold)
  - Actual Attainment % = (passing students / EP) × 100
- **ELA & Relative Attainment:**
  - ELA: Expected Level of Attainment (user-provided per CO)
  - Relative Attainment % = MIN((ELA / Actual Attainment) × 100, 100)

**Input:**
```json
{
  "co_attainment_path": "/path/to/CO_ATTAINMENT_FINAL.xlsx",
  "terminal_path": "/path/to/TERMINAL.xlsx",
  "output_path": "/path/to/CO_ATTAINMENT_COMPLETE.xlsx",
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
```

**Output:** Complete Excel workbook with:
- Sheet1: All source assessment data
- Sheet2: Final attainment report with formulas

---

## Data Flow

```
Faculty uploads Question Paper (DOCX)
           ↓
    Stage 1: Extract metadata & structure
           ↓
    QP_FINAL.xlsx (template + no student data)
           ↓
Faculty uploads CAMU marks Excel
           ↓
    Stage 2: Inject student marks
           ↓
    CAT1_FINAL.xlsx (or repeat for CAT2)
           ↓
[Repeat Stage 1+2 for other assessments]
           ↓
Faculty uploads Template + 4 assessment files
           ↓
    Stage 3: Consolidate into master template
           ↓
    CO_ATTAINMENT_FINAL.xlsx
           ↓
Faculty uploads Terminal marks + provides EP, Constraint, ELA
           ↓
    Stage 4: Calculate final attainment
           ↓
    CO_ATTAINMENT_COMPLETE.xlsx ← FINAL REPORT (DOWNLOADABLE)
```

## Error Handling

All stages return JSON with status:

**Success:**
```json
{
  "status": "ok",
  "output_path": "/path/to/output.xlsx"
}
```

**Error:**
```json
{
  "status": "error",
  "message": "Detailed error message"
}
```

Exit code: 0 (success), 1 (error)

## Hardcoded Constants

These are business rule constants and should NOT be changed without specification update:

**Stage 2:**
- Student data starts at Excel row 13 (1-based)
- Marks matrix starts at column D (column index 4, 1-based)
- CAMU export: student rows from DataFrame row 3 onward (0-based)
- CAMU export: marks from DataFrame column 6 onward (0-based)

**Stage 3:**
- Template: Sheet1 = worksheets[1] (index 1)
- Template row structure: 5=COs, 6=Questions, 7=Max marks, 8+=Students
- CAT1: template columns 5-25
- CAT2: template columns 27-46
- ASS1: template columns 56-61 (6 columns, total 40 marks)
- ASS2: template columns 64-69 (6 columns, total 40 marks)

**Stage 4:**
- Sheet1 internal % stored at column 80 (CB)
- Sheet2 internal %: columns 5-10 (E-J)
- Sheet2 terminal marks: columns 12-17 (L-Q)
- Sheet2 final CO: columns 19-24 (S-X)
- Terminal file CO headers at row 2, columns 7-12
- First student row in Sheet2: row 8
- Final CO formula: 0.7×Internal + 0.3×Terminal

## Utilities

**File:** `utils.py`

Common helper functions:
- `validate_file_exists(filepath)`: Check input file exists
- `normalize_question_id(q)`: Normalize question IDs for matching (removes dots, case-insensitive)
- `clean_numeric(val)`: Convert values to int/float, handling edge cases (NaN, "Absent", etc.)
- `find_value_after_keyword(tables, keyword)`: Search tables for keyword and return adjacent value
- `get_column_letter(col_num)`: Convert column number to letter (1→A, 27→AA)

## Testing

Each stage can be tested independently:

```bash
# Test Stage 1
python3 stage1_qp.py '{"docx_path": "test.docx", "output_path": "output.xlsx"}'

# Test Stage 2
python3 stage2_marks.py '{"qp_excel_path": "qp.xlsx", "student_db_path": "marks.xlsx"}'
```

## License

Internal use only - CO Attainment Automation System
