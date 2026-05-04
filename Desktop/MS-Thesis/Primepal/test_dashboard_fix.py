"""Quick test to verify dashboard endpoints work after permissions fix"""
import requests

BASE_URL = "http://localhost:8000/api/v1"

print("Testing classroom endpoints (should be accessible with any teacher auth)...")
print("Note: You need to login and get a valid token to test this properly")
print()
print("Steps to test:")
print("1. Open http://localhost:3000/teacher/login")
print("2. Login with any teacher account")
print("3. Navigate to http://localhost:3000/teacher/dashboard")
print("4. You should now see all classrooms (not just owned ones)")
print()
print("What to verify:")
print("✓ Dashboard shows all 7 classrooms globally")
print("✓ Teacher can VIEW all data (students, classrooms, reports)")
print("✓ Teacher CANNOT create/edit/delete classrooms (buttons hidden/disabled)")
print()
print("Admin test:")
print("1. Login with admin teacher account (role='admin' in database)")
print("2. Navigate to classroom page")
print("3. Admin should see 'Create Classroom' button and can create/edit/delete")
