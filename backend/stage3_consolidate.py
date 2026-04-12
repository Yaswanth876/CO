"""
Stage 3: Incremental Master Template Consolidation.

Supported phases:
- early: template + CAT1 + ASS1 -> output
- mid: existing output + CAT2 + ASS2 -> output
- end: no new consolidation; validate output exists
"""

import json
import os
import sys
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


def resolve_default_template_path():
    """Resolve default template path from common project locations."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(script_dir, "..", "data", "CO ATTAINMENT TEMPLATE (1).xlsx"),
        os.path.join(script_dir, "data", "CO ATTAINMENT TEMPLATE (1).xlsx"),
        os.path.join("data", "CO ATTAINMENT TEMPLATE (1).xlsx"),
    ]

    for candidate in candidates:
        normalized = os.path.normpath(candidate)
        if os.path.exists(normalized):
            return normalized

    return None


def require_path(path_value, key_name):
    if not path_value:
        raise ValueError(f"Missing required path: {key_name}")
    return path_value


def load_workbook_for_phase(phase, template_path, output_path):
    if phase == "early":
        source = require_path(template_path, "template_path")
        validate_file_exists(source)
        return load_workbook(source)

    if phase == "mid":
        source = require_path(output_path, "output_path")
        validate_file_exists(source)
        return load_workbook(source)

    if phase == "end":
        source = require_path(output_path, "output_path")
        validate_file_exists(source)
        return None

    raise ValueError("Invalid phase. Expected one of: early, mid, end")


def main():
    try:
        if len(sys.argv) < 2:
            raise ValueError("Missing JSON argument payload")

        args = json.loads(sys.argv[1])

        phase_raw = args.get("phase")
        phase = str(phase_raw).strip().lower() if phase_raw is not None else None
        output_path = require_path(args.get("output_path"), "output_path")

        template_path = args.get("template_path") or resolve_default_template_path()
        cat1_path = args.get("cat1_path")
        cat2_path = args.get("cat2_path")
        ass1_path = args.get("ass1_path")
        ass2_path = args.get("ass2_path")

        if phase is None:
            # Backward-compatible legacy behavior: process all four files at once.
            validate_file_exists(require_path(template_path, "template_path"))
            validate_file_exists(require_path(cat1_path, "cat1_path"))
            validate_file_exists(require_path(cat2_path, "cat2_path"))
            validate_file_exists(require_path(ass1_path, "ass1_path"))
            validate_file_exists(require_path(ass2_path, "ass2_path"))

            template_wb = load_workbook(template_path)
            template_ws = template_wb.worksheets[1]  # SECOND sheet (index 1)

            process_cat(cat1_path, template_ws, 5, 25)
            process_cat(cat2_path, template_ws, 27, 46)
            process_assignment(ass1_path, template_ws, source_start_col=7, template_start_col=56)
            process_assignment(ass2_path, template_ws, source_start_col=7, template_start_col=64)

            template_wb.save(output_path)

        elif phase == "early":
            validate_file_exists(require_path(cat1_path, "cat1_path"))
            validate_file_exists(require_path(ass1_path, "ass1_path"))

            template_wb = load_workbook_for_phase(phase, template_path, output_path)
            template_ws = template_wb.worksheets[1]  # SECOND sheet (index 1)

            # CAT1: columns 5-25
            process_cat(cat1_path, template_ws, 5, 25)

            # ASS1: columns 56-61 (source starts at column 7)
            process_assignment(ass1_path, template_ws, source_start_col=7, template_start_col=56)

            template_wb.save(output_path)

        elif phase == "mid":
            validate_file_exists(require_path(cat2_path, "cat2_path"))
            validate_file_exists(require_path(ass2_path, "ass2_path"))

            template_wb = load_workbook_for_phase(phase, template_path, output_path)
            template_ws = template_wb.worksheets[1]  # SECOND sheet (index 1)

            # CAT2: columns 27-46
            process_cat(cat2_path, template_ws, 27, 46)

            # ASS2: columns 64-69 (source starts at column 7)
            process_assignment(ass2_path, template_ws, source_start_col=7, template_start_col=64)

            template_wb.save(output_path)

        elif phase == "end":
            # Stage 3 bypass for end-sem; just validate that progressive file exists.
            load_workbook_for_phase(phase, template_path, output_path)

        else:
            raise ValueError("Invalid phase. Expected one of: early, mid, end")

        print(json.dumps({"status": "ok", "output_path": output_path}))

    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
