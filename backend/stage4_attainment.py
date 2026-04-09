"""
Stage 4: Final CO Attainment Calculation (Internal + Terminal → Final Report)

Loads CO_ATTAINMENT_FINAL.xlsx from Stage 3 and Terminal marks Excel.
Builds Sheet2 with final CO calculations, attainment summary, ELA, and relative attainment.
"""

import sys
import json
import re
from openpyxl import load_workbook
from openpyxl.styles import Alignment
from openpyxl.utils import get_column_letter
from utils import validate_file_exists


def rewrite_formula(formula):
    """
    Rewrite Excel formula to add Sheet1! prefix to cell references.

    When copying formulas from Sheet1 to Sheet2, all cell references must
    be prefixed with "Sheet1!" to still point to Sheet1 data.

    Example: =A1+B2 → =Sheet1!A1+Sheet1!B2
    """
    if formula is None or not str(formula).startswith("="):
        return formula

    formula_str = str(formula)
    # Remove leading =
    content = formula_str[1:]

    # Find all cell references and add Sheet1! prefix
    def add_sheet_prefix(match):
        return f"Sheet1!{match.group(0)}"

    # Regex to match cell references: $?[A-Z]{1,3}$?\d+
    rewritten = re.sub(r"(\$?[A-Z]{1,3}\$?\d+)", add_sheet_prefix, content)

    return "=" + rewritten


def main():
    try:
        # Parse arguments
        args = json.loads(sys.argv[1])
        co_attainment_path = args["co_attainment_path"]
        terminal_path = args["terminal_path"]
        output_path = args["output_path"]
        ep = float(args["ep"])
        constraint = float(args["constraint"])
        ela = args["ela"]  # Dict: {"CO1": 75, "CO2": 75, ...}

        # Validate inputs
        validate_file_exists(co_attainment_path)
        validate_file_exists(terminal_path)

        # Load files
        wb = load_workbook(co_attainment_path, data_only=False)
        sheet1 = wb["Sheet1"]

        # Create Sheet2 if doesn't exist
        if "Sheet2" not in wb.sheetnames:
            sheet2 = wb.create_sheet("Sheet2")
        else:
            sheet2 = wb["Sheet2"]

        term_wb = load_workbook(terminal_path, data_only=False)
        term_ws = term_wb.active

        # Constants
        START_ROW = 5
        LAST_ROW = sheet1.max_row
        SRC_START = 80  # Column CB (where CO-based internal % is stored)
        DST_START = 5  # Column E (where to write internal %)

        # ========== STEP A: Copy identity columns (A, B, C) ==========
        for r in range(START_ROW, LAST_ROW + 1):
            s_no = sheet1.cell(r, 1).value
            if s_no is None or str(s_no).strip() == "":
                continue

            # Copy S.No, REGNO, Name
            sheet2.cell(r, 1).value = sheet1.cell(r, 1).value
            sheet2.cell(r, 2).value = sheet1.cell(r, 2).value
            sheet2.cell(r, 3).value = sheet1.cell(r, 3).value

            # Alignment
            sheet2.cell(r, 1).alignment = Alignment(horizontal="center")
            sheet2.cell(r, 2).alignment = Alignment(horizontal="center")
            sheet2.cell(r, 3).alignment = Alignment(horizontal="left")

        # ========== STEP B: Internal % section (columns E-J) ==========
        sheet2.merge_cells("E3:J3")
        sheet2["E3"] = "CO BASED Percentage of marks (Internal Assessment only)"
        sheet2["E3"].alignment = Alignment(horizontal="center", vertical="center")

        for r in range(START_ROW, LAST_ROW + 1):
            src_cell = sheet1.cell(r, SRC_START)
            if src_cell.value is None:
                continue

            for i in range(6):  # 6 COs
                src = sheet1.cell(r, SRC_START + i)
                dst = sheet2.cell(r, DST_START + i)

                # Check if source is formula
                if src.data_type == "f":
                    dst.value = rewrite_formula(src.value)
                else:
                    dst.value = src.value

                dst.number_format = "0.00"
                dst.alignment = Alignment(horizontal="center")

        # ========== STEP C: Terminal marks section (columns L-Q) ==========
        sheet2.merge_cells("L3:Q3")
        sheet2["L3"] = "Terminal Assessment"
        sheet2["L3"].alignment = Alignment(horizontal="center", vertical="center")

        # Write CO headers from terminal file
        for i in range(6):
            co_header = term_ws.cell(2, 7 + i).value
            sheet2.cell(5, 12 + i).value = co_header

        # Copy terminal marks (offset: term_row + 4 = sheet2_row)
        for r in range(3, term_ws.max_row + 1):
            for i in range(6):
                sheet2.cell(r + 4, 12 + i).value = term_ws.cell(r, 7 + i).value

        # ========== STEP D: Final CO column headers (columns S-X) ==========
        for i in range(6):
            sheet2.cell(5, 19 + i).value = f"CO{i + 1}"

        # ========== STEP E: Final CO formula (0.7*Internal + 0.3*Terminal) ==========
        for r in range(8, LAST_ROW + 1):
            if sheet2.cell(r, 2).value is None:
                continue

            for i in range(6):
                e = get_column_letter(5 + i)  # E, F, G, H, I, J
                l = get_column_letter(12 + i)  # L, M, N, O, P, Q
                s_col = 19 + i  # S, T, U, V, W, X

                cell = sheet2.cell(r, s_col)
                cell.value = f"=0.7*{e}{r}+0.3*{l}{r}"
                cell.number_format = "0.00"

        # ========== STEP F: Attainment summary rows ==========
        # Find last student row
        last_student = 8
        while sheet2.cell(last_student, 2).value is not None:
            last_student += 1
        last_student -= 1

        summary_row = last_student + 3

        # Row: Total (count of students)
        sheet2.cell(summary_row, 18).value = "Total"
        for i in range(6):
            col = get_column_letter(19 + i)
            sheet2.cell(summary_row, 19 + i).value = (
                f"=COUNT({col}8:{col}{last_student})"
            )

        # Row: EP (Expected Proficiency)
        sheet2.cell(summary_row + 1, 18).value = "EP"
        for i in range(6):
            sheet2.cell(summary_row + 1, 19 + i).value = ep

        # Row: Constraint (count >= constraint)
        sheet2.cell(summary_row + 2, 18).value = "Constraint"
        for i in range(6):
            col = get_column_letter(19 + i)
            sheet2.cell(summary_row + 2, 19 + i).value = (
                f'=COUNTIF({col}8:{col}{last_student},">={constraint}")'
            )

        # Row: Actual Attainment %
        sheet2.cell(summary_row + 3, 18).value = "Actual Attainment (%)"
        for i in range(6):
            c_cell = get_column_letter(19 + i) + str(summary_row + 2)
            e_cell = get_column_letter(19 + i) + str(summary_row + 1)
            cell = sheet2.cell(summary_row + 3, 19 + i)
            cell.value = f"=({c_cell}/{e_cell})*100"
            cell.number_format = "0.00"

        # ========== STEP G: ELA and Relative Attainment ==========
        ela_row = summary_row + 5
        rel_row = ela_row + 1

        sheet2.cell(ela_row, 18).value = "ELA"
        sheet2.cell(rel_row, 18).value = "Relative Attainment (%)"

        # Convert ELA dict to ordered list
        ela_values = [
            ela.get(f"CO{i + 1}", 0) for i in range(6)
        ]

        for i in range(6):
            # Write ELA value
            sheet2.cell(ela_row, 19 + i).value = ela_values[i]

            # Write Relative Attainment formula
            actual_cell = get_column_letter(19 + i) + str(summary_row + 3)
            ela_cell = get_column_letter(19 + i) + str(ela_row)

            cell = sheet2.cell(rel_row, 19 + i)
            cell.value = f"=MIN(({ela_cell}/{actual_cell})*100,100)"
            cell.number_format = "0.00"
            cell.alignment = Alignment(horizontal="center")

        # ========== Save ==========
        wb.save(output_path)

        # Return success
        print(json.dumps({"status": "ok", "output_path": output_path}))

    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
