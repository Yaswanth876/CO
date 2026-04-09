"""
Stage 2: Student Database Injection (Marks Matrix → QP Excel)

Reads student marks Excel (exported from CAMU), extracts register numbers and names,
then injects them into the Stage 1 output Excel file with question marks.
"""

import sys
import json
import pandas as pd
from openpyxl import load_workbook
from openpyxl.utils import get_column_letter
from utils import validate_file_exists


def process_marks(qp_excel_path, student_db_path):
    """
    Read student marks from CAMU export and inject into QP Excel.

    CAMU structure:
    - Rows 0-2 (0-based): header rows, SKIP
    - Row 3+: student data
    - Column 0: Register Number
    - Column 1: Student Name
    - Column 6+: marks for questions
    """

    # Read student database
    db = pd.read_excel(student_db_path, header=None)

    # Extract student data starting from row 3 (0-based)
    regnos = []
    names = []

    for i in range(3, len(db)):
        reg = str(db.iloc[i, 0]).strip()
        name = str(db.iloc[i, 1]).strip()

        # Skip invalid rows
        if reg.lower() in ["nan", "none", ""]:
            continue
        if "instruction" in reg.lower():
            continue

        regnos.append(reg)
        names.append("" if name.lower() == "nan" else name)

    # Read marks matrix (from column 6 = column G onward)
    marks_matrix = []
    for i in range(3, 3 + len(regnos)):
        row = []
        for j in range(6, len(db.columns)):
            v = db.iloc[i, j]
            row.append("" if pd.isna(v) else v)
        marks_matrix.append(row)

    # Load and modify QP Excel
    wb = load_workbook(qp_excel_path)
    ws = wb.active

    # Write headers at fixed positions
    ws["A10"] = "S.No"
    ws["B10"] = "REGNO"
    ws["C10"] = "Student NAME"

    # Clear rows 11-12
    for row_num in [11, 12]:
        ws[f"A{row_num}"] = ""
        ws[f"B{row_num}"] = ""
        ws[f"C{row_num}"] = ""

    start_row = 13

    # Write student identity data
    for i in range(len(regnos)):
        ws[f"A{start_row + i}"] = i + 1  # Serial number
        ws[f"B{start_row + i}"] = regnos[i]  # Register number
        ws[f"C{start_row + i}"] = names[i]  # Student name

    # Write marks matrix (column D = column index 4 onward)
    for i in range(len(marks_matrix)):
        for j in range(len(marks_matrix[i])):
            ws.cell(row=start_row + i, column=4 + j).value = marks_matrix[i][j]

    # Auto-width columns
    for col_cells in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col_cells[0].column)

        for cell in col_cells:
            if cell.value:
                max_len = max(max_len, len(str(cell.value)))

        ws.column_dimensions[col_letter].width = max_len + 4

    # Save modified Excel
    wb.save(qp_excel_path)


def main():
    try:
        # Parse arguments
        args = json.loads(sys.argv[1])
        qp_excel_path = args["qp_excel_path"]
        student_db_path = args["student_db_path"]

        # Validate inputs
        validate_file_exists(qp_excel_path)
        validate_file_exists(student_db_path)

        # Process
        process_marks(qp_excel_path, student_db_path)

        # Return success
        print(json.dumps({"status": "ok", "output_path": qp_excel_path}))

    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
