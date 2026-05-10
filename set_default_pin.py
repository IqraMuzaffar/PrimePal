"""
Script to set default PIN '1234' for all students.
Run from project root: python set_default_pin.py
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent / "backend" / ".env"
if env_path.exists():
    load_dotenv(env_path)
else:
    print(f"Warning: .env file not found at {env_path}")

# Add backend to path for imports
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

from app.core.supabase_client import get_supabase_admin


def main():
    print("Setting default PIN '1234' for all students...")

    supabase = get_supabase_admin()

    # Get all students first
    students_resp = supabase.table("students").select("id, student_name, secret_pin").execute()
    students = students_resp.data or []

    print(f"\nFound {len(students)} students")

    # Count students that need updating
    needs_update = [s for s in students if s.get("secret_pin") != "1234"]
    print(f"{len(needs_update)} students need PIN update")

    if not needs_update:
        print("\nAll students already have PIN '1234'. No updates needed.")
        return

    # Update all students to have PIN '1234'
    update_resp = supabase.table("students").update({"secret_pin": "1234"}).neq("secret_pin", "1234").execute()

    print(f"\n✓ Updated {len(update_resp.data or [])} students")

    # Verify
    verify_resp = supabase.table("students").select("id, secret_pin").execute()
    all_students = verify_resp.data or []
    with_1234 = [s for s in all_students if s.get("secret_pin") == "1234"]

    print(f"\nVerification:")
    print(f"  Total students: {len(all_students)}")
    print(f"  Students with PIN '1234': {len(with_1234)}")
    print(f"  Success: {len(with_1234) == len(all_students)}")


if __name__ == "__main__":
    main()
