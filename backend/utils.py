"""
Utility functions used across all CO Attainment Automation stages.
"""

import re
import pandas as pd
from pathlib import Path


def validate_file_exists(filepath):
    """Validate that input file exists."""
    if not Path(filepath).exists():
        raise FileNotFoundError(f"File not found: {filepath}")


def normalize_question_id(q):
    """
    Normalize question identifiers for matching between files.
    - Removes all dots (e.g., "A.1" → "A1")
    - Strips whitespace and converts to uppercase
    - Returns None if q is None or empty
    """
    if q is None:
        return None
    q_str = str(q).strip()
    if not q_str:
        return None
    q_str = re.sub(r'\.', '', q_str).upper()
    return q_str if q_str else None


def clean_numeric(val):
    """
    Convert value to numeric (int or float) or None.
    Handles strings, strips quotes, and validates numeric format.
    Returns None for non-numeric values ("Absent", "NA", blanks, etc.)
    """
    if val is None:
        return None

    if isinstance(val, (int, float)):
        return val

    if isinstance(val, str):
        s = val.strip().replace("'", "")
        if not s:
            return None

        # Try integer
        if re.fullmatch(r"-?\d+", s):
            return int(s)

        # Try float
        if re.fullmatch(r"-?\d*\.\d+", s):
            return float(s)

    # Cannot convert
    return None


def find_value_after_keyword(tables, keyword):
    """
    Search for a keyword in the tables list and return the adjacent value.

    Args:
        tables: List of table rows (list of lists of strings)
        keyword: String to search for

    Returns:
        Value found or "NA" if not found

    Strategy:
    - Search for keyword (case-insensitive) in any cell
    - First try: return cell to the right (same row, next column)
    - Second try: return cell below (next row, same column)
    """
    keyword_lower = keyword.lower()

    for i, row in enumerate(tables):
        for j, cell in enumerate(row):
            if keyword_lower in str(cell).lower():
                # Try cell to the right
                if j + 1 < len(row):
                    val = str(row[j + 1]).strip()
                    if val and val.lower() not in ["", "nan", "none"]:
                        return val

                # Try cell below
                if i + 1 < len(tables) and j < len(tables[i + 1]):
                    val = str(tables[i + 1][j]).strip()
                    if val and val.lower() not in ["", "nan", "none"]:
                        return val

    return "NA"


def get_column_letter(col_num):
    """
    Convert column number (1-based) to letter(s).
    E.g., 1 → A, 26 → Z, 27 → AA
    """
    result = ""
    while col_num > 0:
        col_num -= 1
        result = chr(ord('A') + col_num % 26) + result
        col_num //= 26
    return result
