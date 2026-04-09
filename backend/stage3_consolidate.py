"""
Stage 3: Master Template Consolidation (CAT1, CAT2, ASS1, ASS2 → Template)

Consolidates 4 processed assessment Excel files into CO Attainment Master Template.
"""

import sys
import json
from openpyxl import load_workbook
from utils import validate_file_exists, normalize_question_id, clean_numeric


def process_cat(cat_file, template_ws, template_start_col, template_end_col):
    """
    Process a CAT (Continuous Assessment Test) file and merge into template.

    CAT file structure:
    - Row 10: Question numbers
    - Row 11: Max marks
    - Row 12: CO tags
    - Row 13+: Student data

    Template structure:
    - Row 5: CO tags
    - Row 6: Question numbers
    - Row 7: Max marks
    - Row 8+: Student data
    """

    cat_wb = load_workbook(cat_file, data_only=True)
    cat_ws = cat_wb.active

    # Find student count
    row = 13
    while cat_ws.cell(row=row, column=2).value is not None:
        row += 1
    student_count = row - 13

    # Copy REGNO and Name into template
    for i in range(student_count):
        template_ws.cell(row=8 + i, column=2).value = cat_ws.cell(
            row=13 + i, column=2
        ).value
        template_ws.cell(row=8 + i, column=3).value = cat_ws.cell(
            row=13 + i, column=3
        ).value

    # Read CAT questions (row 10, starting from column 4)
    cat_q = {}  # {normalized_q: col}
    cat_max = {}  # {normalized_q: max_marks}
    cat_co = {}  # {normalized_q: CO}

    for col in range(4, cat_ws.max_column + 1):
        q = normalize_question_id(cat_ws.cell(row=10, column=col).value)
        if q:
            cat_q[q] = col
            cat_max[q] = clean_numeric(cat_ws.cell(row=11, column=col).value)
            cat_co[q] = cat_ws.cell(row=12, column=col).value

    # Read template questions
    template_q = {}  # {normalized_q: col}
    for col in range(template_start_col, template_end_col + 1):
        q = normalize_question_id(template_ws.cell(row=6, column=col).value)
        if q and q != "TOTAL":
            template_q[q] = col

    # Match and write CO tags and max marks
    for q, tcol in template_q.items():
        if q in cat_q:
            template_ws.cell(row=5, column=tcol).value = cat_co[q]
            template_ws.cell(row=7, column=tcol).value = cat_max[q]
        else:
            template_ws.cell(row=5, column=tcol).value = None
            template_ws.cell(row=7, column=tcol).value = None

    # Write student marks
    for q, cat_col in cat_q.items():
        if q not in template_q:
            continue
        tcol = template_q[q]

        for i in range(student_count):
            val = clean_numeric(cat_ws.cell(row=13 + i, column=cat_col).value)
            template_ws.cell(row=8 + i, column=tcol).value = val


def process_assignment(
    ass_file, template_ws, source_start_col, template_start_col, max_cols=6, target_total=40
):
    """
    Process an assignment file and merge into template.

    Assignment file structure:
    - Row 4+: Student data (different from CAT!)
    - source_start_col: where marks begin in assignment file

    Critical business rule:
    - Assignment marks must total 40 across all columns
    - Auto-adjust last column to enforce this
    """

    ass_wb = load_workbook(ass_file, data_only=True)
    ass_ws = ass_wb.active

    # Find student count
    row = 4
    while ass_ws.cell(row=row, column=source_start_col).value is not None:
        row += 1
    student_count = row - 4

    # Validate column count
    ass_cols = ass_ws.max_column - source_start_col + 1
    if ass_cols > max_cols:
        raise ValueError(
            f"Assignment file has {ass_cols} columns, max allowed is {max_cols}"
        )

    # Read marks and collect max values
    col_max_values = []
    for c in range(ass_cols):
        values = []
        for i in range(student_count):
            val = clean_numeric(
                ass_ws.cell(row=4 + i, column=source_start_col + c).value
            )
            template_ws.cell(row=8 + i, column=template_start_col + c).value = val

            if isinstance(val, (int, float)):
                values.append(val)

        col_max = max(values) if values else 0
        col_max_values.append(col_max)

    # Enforce 40-mark total rule (critical business rule)
    current_sum = sum(col_max_values)
    diff = target_total - current_sum

    if diff != 0 and col_max_values:
        col_max_values[-1] += diff

    # Write max marks to template row 7
    for idx, val in enumerate(col_max_values):
        template_ws.cell(row=7, column=template_start_col + idx).value = val


def main():
    try:
        # Parse arguments
        args = json.loads(sys.argv[1])
        template_path = args["template_path"]
        cat1_path = args["cat1_path"]
        cat2_path = args["cat2_path"]
        ass1_path = args["ass1_path"]
        ass2_path = args["ass2_path"]
        output_path = args["output_path"]

        # Validate inputs
        for path in [template_path, cat1_path, cat2_path, ass1_path, ass2_path]:
            validate_file_exists(path)

        # Load template
        template_wb = load_workbook(template_path)
        template_ws = template_wb.worksheets[1]  # SECOND sheet (index 1)

        # Process CAT files
        # CAT1: columns 5-25, CAT2: columns 27-46
        process_cat(cat1_path, template_ws, 5, 25)
        process_cat(cat2_path, template_ws, 27, 46)

        # Process assignment files
        # ASS1: columns 56-61, ASS2: columns 64-69
        # Source starts at column 7 (G) in assignment files
        process_assignment(ass1_path, template_ws, source_start_col=7, template_start_col=56)
        process_assignment(ass2_path, template_ws, source_start_col=7, template_start_col=64)

        # Save
        template_wb.save(output_path)

        # Return success
        print(json.dumps({"status": "ok", "output_path": output_path}))

    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
