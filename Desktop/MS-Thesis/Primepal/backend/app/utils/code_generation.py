"""
Memorable Mnemonic Code Generator for Classroom Access.

Generates easy-to-remember codes like '1YEL42' (Grade 1 Yellow with random digits)
instead of random hex strings like 'A17A4E', making it easier for primary school
students to enter classroom join codes.
"""

import random
import re
from typing import Tuple


def generate_memorable_code(grade: int, classroom_name: str) -> str:
    """
    Generate a memorable mnemonic code based on grade and classroom name.

    Format: {grade}{3-letter-identifier}{random-digits}
    Examples: '1YEL42', '3BLU19', '5SEC93'

    Args:
        grade: Grade level (1-5)
        classroom_name: Classroom name (e.g., 'Grade 1 Yellow', 'Yellow Section', '3A')

    Returns:
        A 6-character memorable code string
    """
    # Step 1: Extract grade
    grade_str = str(grade)

    # Step 2: Clean classroom_name
    # Remove 'Grade' word (case-insensitive)
    cleaned = re.sub(r'\bGrade\b', '', classroom_name, flags=re.IGNORECASE)

    # Remove the grade number from the name
    cleaned = re.sub(r'\b' + str(grade) + r'\b', '', cleaned, flags=re.IGNORECASE)

    # Remove all non-alphabetic characters (spaces, dashes, etc.)
    cleaned = re.sub(r'[^a-zA-Z]', '', cleaned)

    # Step 3: Extract identifier (first 3 letters, uppercase)
    if len(cleaned) == 0:
        # Fallback: if name is empty after cleaning, use 'CLS' (classroom)
        identifier = 'CLS'
    elif len(cleaned) < 3:
        # If less than 3 letters, pad with 'X'
        identifier = (cleaned + 'X' * 3)[:3].upper()
    else:
        # Take first 3 letters
        identifier = cleaned[:3].upper()

    # Step 4: Combine grade + identifier
    prefix = f"{grade_str}{identifier}"

    # Step 5: Calculate remaining characters needed
    total_length = 6
    remaining_chars = total_length - len(prefix)

    # Step 6: Append random digits
    random_suffix = ''.join(random.choices('0123456789', k=remaining_chars))
    memorable_code = prefix + random_suffix

    return memorable_code


def validate_code_format(code: str) -> bool:
    """
    Validate that a code matches the memorable format.

    Expected format: {1-digit-grade}{3-letters}{2-3-digits}
    Examples: '1YEL42', '5BLU93'

    Args:
        code: Code string to validate

    Returns:
        True if valid format, False otherwise
    """
    pattern = r'^\d[A-Z]{3}\d+$'
    return bool(re.match(pattern, code))


def extract_code_info(code: str) -> Tuple[int, str]:
    """
    Extract grade and identifier from a memorable code.

    Args:
        code: Memorable code (e.g., '1YEL42')

    Returns:
        Tuple of (grade, identifier) where grade is int and identifier is str
        Example: (1, 'YEL')
    """
    if len(code) >= 4:
        grade = int(code[0])
        identifier = code[1:4]
        return grade, identifier
    raise ValueError(f"Invalid code format: {code}")
