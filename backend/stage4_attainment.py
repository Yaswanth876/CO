"""
Stage 4: Phase-wise CO Attainment Calculation.

Supports:
- early/mid: interim report from internal-only data
- end: final report from internal + terminal data
"""

import json
import re
import sys
from openpyxl import load_workbook
from openpyxl.styles import Alignment
from openpyxl.utils import get_column_letter
from utils import validate_file_exists


def rewrite_formula(formula):
    """
    Rewrite Excel formula to add Sheet1! prefix to cell references.

    When copying formulas from Sheet1 to Sheet2, all cell references must
    be prefixed with "Sheet1!" to still point to Sheet1 data.

    Example: =A1+B2 -> =Sheet1!A1+Sheet1!B2
    """
    if formula is None or not str(formula).startswith("="):
        return formula

    formula_str = str(formula)
    content = formula_str[1:]

    def add_sheet_prefix(match):
        return f"Sheet1!{match.group(0)}"

    rewritten = re.sub(r"(\$?[A-Z]{1,3}\$?\d+)", add_sheet_prefix, content)
    return "=" + rewritten


def parse_float(value, default=0.0):
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def extract_student_rows(sheet, start_row=8, regno_col=2):
    """Return continuous student rows based on REGNO column."""
    rows = []
    row = start_row
    max_guard = max(sheet.max_row + 5, start_row)

    while row <= max_guard:
        regno = sheet.cell(row=row, column=regno_col).value
        if regno is None or str(regno).strip() == "":
            break
        rows.append(row)
        row += 1

    return rows


def create_or_reset_sheet2(wb):
    if "Sheet2" in wb.sheetnames:
        sheet2 = wb["Sheet2"]
        if sheet2.max_row > 0:
            sheet2.delete_rows(1, sheet2.max_row)
    else:
        sheet2 = wb.create_sheet("Sheet2")
    return sheet2


def generate_feedback_sheet(wb, sheet2, student_rows, ep, phase, internal_start_col=5, co_count=6):
    """
    Create a Feedback sheet for early intervention.

    Includes students whose average internal CO score is below EP.
    """
    if phase not in {"early", "mid"}:
        return

    if "Feedback" in wb.sheetnames:
        feedback_ws = wb["Feedback"]
        if feedback_ws.max_row > 0:
            feedback_ws.delete_rows(1, feedback_ws.max_row)
    else:
        feedback_ws = wb.create_sheet("Feedback")

    feedback_ws.cell(row=1, column=1).value = "S.No"
    feedback_ws.cell(row=1, column=2).value = "REGNO"
    feedback_ws.cell(row=1, column=3).value = "Name"

    output_row = 2
    for row in student_rows:
        internal_values = []
        for i in range(co_count):
            val = sheet2.cell(row=row, column=internal_start_col + i).value
            parsed = parse_float(val, default=None)
            if parsed is not None:
                internal_values.append(parsed)

        if not internal_values:
            continue

        internal_score = sum(internal_values) / len(internal_values)
        if internal_score < ep:
            feedback_ws.cell(row=output_row, column=1).value = sheet2.cell(row=row, column=1).value
            feedback_ws.cell(row=output_row, column=2).value = sheet2.cell(row=row, column=2).value
            feedback_ws.cell(row=output_row, column=3).value = sheet2.cell(row=row, column=3).value
            output_row += 1


def main():
    try:
        if len(sys.argv) < 2:
            raise ValueError("Missing JSON argument payload")

        args = json.loads(sys.argv[1])
        phase = str(args.get("phase", "end")).strip().lower()

        co_attainment_path = args.get("co_attainment_path")
        terminal_path = args.get("terminal_path")
        output_path = args.get("output_path")
        ep = parse_float(args.get("ep"), 80)
        constraint = parse_float(args.get("constraint"), 79.99)
        ela = args.get("ela", {})

        if phase not in {"early", "mid", "end"}:
            raise ValueError("Invalid phase. Expected one of: early, mid, end")

        if not co_attainment_path:
            raise ValueError("Missing required path: co_attainment_path")
        if not output_path:
            raise ValueError("Missing required path: output_path")

        validate_file_exists(co_attainment_path)
        if phase == "end":
            if not terminal_path:
                raise ValueError("Missing required path for end phase: terminal_path")
            validate_file_exists(terminal_path)

        wb = load_workbook(co_attainment_path, data_only=False)
        sheet1 = wb["Sheet1"]
        sheet2 = create_or_reset_sheet2(wb)

        term_ws = None
        if phase == "end":
            term_wb = load_workbook(terminal_path, data_only=False)
            term_ws = term_wb.active

        start_row = 8
        src_start = 80  # Column CB
        dst_start = 5   # Column E
        student_rows = extract_student_rows(sheet1, start_row=start_row, regno_col=2)

        if not student_rows:
            raise ValueError("No student rows found in Sheet1")

        last_student = student_rows[-1]

        # Step A: Copy identity columns (A, B, C)
        for row in student_rows:
            sheet2.cell(row=row, column=1).value = sheet1.cell(row=row, column=1).value
            sheet2.cell(row=row, column=2).value = sheet1.cell(row=row, column=2).value
            sheet2.cell(row=row, column=3).value = sheet1.cell(row=row, column=3).value

            sheet2.cell(row=row, column=1).alignment = Alignment(horizontal="center")
            sheet2.cell(row=row, column=2).alignment = Alignment(horizontal="center")
            sheet2.cell(row=row, column=3).alignment = Alignment(horizontal="left")

        # Step B: Internal % section (E-J)
        sheet2.merge_cells("E3:J3")
        sheet2["E3"] = "CO BASED Percentage of marks (Internal Assessment only)"
        sheet2["E3"].alignment = Alignment(horizontal="center", vertical="center")

        for i in range(6):
            sheet2.cell(row=5, column=5 + i).value = f"CO{i + 1}"

        for row in student_rows:
            for i in range(6):
                src = sheet1.cell(row=row, column=src_start + i)
                dst = sheet2.cell(row=row, column=dst_start + i)

                if src.data_type == "f":
                    dst.value = rewrite_formula(src.value)
                else:
                    dst.value = src.value

                dst.number_format = "0.00"
                dst.alignment = Alignment(horizontal="center")

        # Step C: Terminal section (L-Q)
        sheet2.merge_cells("L3:Q3")
        if phase == "end":
            sheet2["L3"] = "Terminal Assessment"
        else:
            sheet2["L3"] = "Terminal Assessment (Not available in this phase)"
        sheet2["L3"].alignment = Alignment(horizontal="center", vertical="center")

        for i in range(6):
            if phase == "end":
                header = term_ws.cell(row=2, column=7 + i).value
                sheet2.cell(row=5, column=12 + i).value = header if header else f"CO{i + 1}"
            else:
                sheet2.cell(row=5, column=12 + i).value = f"CO{i + 1}"

        if phase == "end":
            # Preserve bounds by mapping only known student rows.
            for row in student_rows:
                term_row = row - 4
                if term_row < 3 or term_row > term_ws.max_row:
                    continue
                for i in range(6):
                    sheet2.cell(row=row, column=12 + i).value = term_ws.cell(
                        row=term_row, column=7 + i
                    ).value
        else:
            for row in student_rows:
                for i in range(6):
                    sheet2.cell(row=row, column=12 + i).value = 0

        # Step D: Final CO headers (S-X)
        for i in range(6):
            sheet2.cell(row=5, column=19 + i).value = f"CO{i + 1}"

        # Step E: Phase-aware final CO formula
        for row in student_rows:
            for i in range(6):
                e_col = get_column_letter(5 + i)
                l_col = get_column_letter(12 + i)
                dest_col = 19 + i

                cell = sheet2.cell(row=row, column=dest_col)
                if phase == "end":
                    cell.value = f"=0.6*{e_col}{row}+0.4*{l_col}{row}"
                else:
                    # Interim phases: internal-only attainment.
                    cell.value = f"={e_col}{row}"
                cell.number_format = "0.00"

        # Step F: Attainment summary rows
        summary_row = last_student + 3

        sheet2.cell(row=summary_row, column=18).value = "Total"
        for i in range(6):
            col = get_column_letter(19 + i)
            sheet2.cell(row=summary_row, column=19 + i).value = f"=COUNT({col}8:{col}{last_student})"

        sheet2.cell(row=summary_row + 1, column=18).value = "EP"
        for i in range(6):
            sheet2.cell(row=summary_row + 1, column=19 + i).value = ep

        sheet2.cell(row=summary_row + 2, column=18).value = ">EP"
        for i in range(6):
            col = get_column_letter(19 + i)
            sheet2.cell(row=summary_row + 2, column=19 + i).value = (
                f'=COUNTIF({col}8:{col}{last_student},">="&{get_column_letter(19 + i)}{summary_row + 1})'
            )

        sheet2.cell(row=summary_row + 3, column=18).value = "Actual Atta"
        for i in range(6):
            c_cell = f"{get_column_letter(19 + i)}{summary_row + 2}"
            t_cell = f"{get_column_letter(19 + i)}{summary_row}"
            cell = sheet2.cell(row=summary_row + 3, column=19 + i)
            cell.value = f"=IFERROR(({c_cell}/{t_cell})*100, 0)"
            cell.number_format = "0.00"

        # Step G: ELA and Relative Attainment
        ela_row = summary_row + 5
        rel_row = ela_row + 1

        sheet2.cell(row=ela_row, column=18).value = "ELA"
        sheet2.cell(row=rel_row, column=18).value = "Relative Attainment (%)"

        ela_values = [parse_float(ela.get(f"CO{i + 1}"), 0) for i in range(6)]

        for i in range(6):
            sheet2.cell(row=ela_row, column=19 + i).value = ela_values[i]

            actual_cell = f"{get_column_letter(19 + i)}{summary_row + 3}"
            ela_cell = f"{get_column_letter(19 + i)}{ela_row}"

            cell = sheet2.cell(row=rel_row, column=19 + i)
            # Correct logic: (Actual / ELA) * 100
            cell.value = f"=IFERROR(MIN(({actual_cell}/{ela_cell})*100, 100), 0)"
            cell.number_format = "0.00"
            cell.alignment = Alignment(horizontal="center")

        # Step H: Early intervention sheet for interim phases
        generate_feedback_sheet(
            wb=wb,
            sheet2=sheet2,
            student_rows=student_rows,
            ep=ep,
            phase=phase,
            internal_start_col=5,
            co_count=6,
        )

        wb.save(output_path)
        print(json.dumps({"status": "ok", "output_path": output_path}))

    except Exception as exc:
        print(json.dumps({"status": "error", "message": str(exc)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
