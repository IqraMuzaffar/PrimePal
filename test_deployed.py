"""
PrimePal Deployed Instance — Full Smoke Test (with auth)

Usage:
  python test_deployed.py --backend https://your-backend-url.com
  python test_deployed.py --backend https://your-backend-url.com --frontend https://your-frontend-url.com
  python test_deployed.py --backend https://your-backend-url.com --class-code ABC123 --student-id <uuid> --pin 1234
"""

import argparse
import json
import sys
import time
from urllib.parse import urljoin

try:
    import requests
except ImportError:
    print("Install requests: pip install requests")
    sys.exit(1)


# ── Helpers ──────────────────────────────────────────────────────────────────

class TestRunner:
    def __init__(self, backend_url: str, frontend_url: str = ""):
        self.backend = backend_url.rstrip("/")
        self.api = f"{self.backend}/api/v1"
        self.frontend = frontend_url.rstrip("/") if frontend_url else ""
        self.passed = 0
        self.failed = 0
        self.warnings = 0
        self.failures = []
        self.student_token = None
        self.timeout = 15

    def _pass(self, desc: str):
        self.passed += 1
        print(f"  \033[92mPASS\033[0m {desc}")

    def _fail(self, desc: str, detail: str = ""):
        self.failed += 1
        msg = f"{desc} — {detail}" if detail else desc
        self.failures.append(msg)
        print(f"  \033[91mFAIL\033[0m {msg}")

    def _warn(self, desc: str, detail: str = ""):
        self.warnings += 1
        msg = f"{desc} — {detail}" if detail else desc
        print(f"  \033[93mWARN\033[0m {msg}")

    def _get(self, path: str, token: str = None) -> requests.Response:
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return requests.get(f"{self.api}{path}", headers=headers, timeout=self.timeout)

    def _post(self, path: str, data: dict, token: str = None) -> requests.Response:
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return requests.post(f"{self.api}{path}", json=data, headers=headers, timeout=self.timeout)

    # ── Test Sections ────────────────────────────────────────────────────

    def test_health(self):
        print("\n\033[96m[1/8] HEALTH & CONNECTIVITY\033[0m")

        # Basic health
        try:
            r = requests.get(f"{self.backend}/health", timeout=self.timeout)
            if r.status_code == 200:
                body = r.json()
                self._pass(f"Basic health check — {body}")
            else:
                self._fail("Basic health check", f"HTTP {r.status_code}")
        except Exception as e:
            self._fail("Basic health check", f"Connection failed: {e}")
            return  # No point continuing if we can't connect

        # Detailed health
        try:
            r = requests.get(f"{self.backend}/health/detailed", timeout=self.timeout)
            if r.status_code == 200:
                self._pass("Detailed health check")
                body = r.json()
                for svc in ["database", "redis", "openai"]:
                    status = body.get(svc, {}).get("status", "unknown")
                    if status in ("ok", "connected", "healthy"):
                        self._pass(f"  {svc}: {status}")
                    else:
                        self._warn(f"  {svc}", status)
            else:
                self._warn("Detailed health check", f"HTTP {r.status_code}")
        except Exception as e:
            self._warn("Detailed health check", str(e))

        # API docs
        try:
            r = requests.get(f"{self.backend}/docs", timeout=self.timeout)
            if r.status_code == 200:
                self._pass("API docs (/docs) accessible")
            else:
                self._warn("API docs", f"HTTP {r.status_code}")
        except Exception as e:
            self._warn("API docs", str(e))

    def test_cors(self):
        print("\n\033[96m[2/8] CORS CONFIGURATION\033[0m")

        origin = "https://prime-pal-alpha.vercel.app"
        try:
            r = requests.options(
                f"{self.backend}/health",
                headers={
                    "Origin": origin,
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "Content-Type,Authorization",
                },
                timeout=self.timeout,
            )
            if r.status_code in (200, 204):
                self._pass(f"CORS preflight (HTTP {r.status_code})")
            else:
                self._fail("CORS preflight", f"HTTP {r.status_code}")

            acao = r.headers.get("access-control-allow-origin", "")
            if acao:
                self._pass(f"CORS Allow-Origin: {acao}")
            else:
                self._warn("CORS Allow-Origin header", "Missing — check ALLOWED_ORIGINS")

            acah = r.headers.get("access-control-allow-headers", "")
            if "authorization" in acah.lower() or "*" in acah:
                self._pass("CORS allows Authorization header")
            else:
                self._warn("CORS headers", f"Allow-Headers: {acah}")

        except Exception as e:
            self._fail("CORS check", str(e))

    def test_public_endpoints(self):
        print("\n\033[96m[3/8] PUBLIC ENDPOINTS (No Auth)\033[0m")

        endpoints = [
            ("/topics?grade_level=1", "Topics grade 1"),
            ("/topics?grade_level=4", "Topics grade 4"),
            ("/topics?grade_level=5", "Topics grade 5"),
        ]
        for path, desc in endpoints:
            try:
                r = self._get(path)
                if r.status_code == 200:
                    data = r.json()
                    count = len(data) if isinstance(data, list) else "N/A"
                    self._pass(f"{desc} — {count} items")
                else:
                    self._fail(desc, f"HTTP {r.status_code}")
            except Exception as e:
                self._fail(desc, str(e))

    def test_auth_rejection(self):
        print("\n\033[96m[4/8] AUTH — INVALID CREDENTIALS REJECTED\033[0m")

        # Invalid student login should not return 500
        try:
            r = self._post("/auth/student/login", {
                "student_id": "00000000-0000-0000-0000-000000000000",
                "class_code": "FAKECODE",
                "secret_pin": "0000",
            })
            if r.status_code in (401, 404, 400, 422):
                self._pass(f"Invalid student login rejected (HTTP {r.status_code})")
            elif r.status_code == 500:
                self._fail("Invalid student login", "Got 500 — server error instead of 401/404")
            else:
                self._warn("Invalid student login", f"Unexpected HTTP {r.status_code}")
        except Exception as e:
            self._fail("Invalid student login", str(e))

    def test_protected_endpoints(self):
        print("\n\033[96m[5/8] PROTECTED ENDPOINTS REJECT UNAUTHENTICATED\033[0m")

        endpoints = [
            ("GET", "/missions/daily", "Missions daily"),
            ("GET", "/missions/me", "Student profile"),
            ("GET", "/classroom/", "Classroom list"),
            ("GET", "/teacher/analytics", "Teacher analytics"),
            ("GET", "/curriculum/uploads", "Curriculum uploads"),
            ("GET", "/auth/me", "Auth me"),
            ("GET", "/achievements/me", "Achievements"),
        ]
        for method, path, desc in endpoints:
            try:
                r = requests.request(
                    method, f"{self.api}{path}",
                    headers={"Content-Type": "application/json"},
                    timeout=self.timeout,
                )
                if r.status_code in (401, 403):
                    self._pass(f"{desc} rejects unauthenticated (HTTP {r.status_code})")
                elif r.status_code == 500:
                    self._fail(desc, "Returns 500 without auth — should be 401/403")
                else:
                    self._warn(desc, f"HTTP {r.status_code} without auth (expected 401/403)")
            except Exception as e:
                self._fail(desc, str(e))

    def test_student_login(self, class_code: str, student_id: str, pin: str):
        print("\n\033[96m[6/8] AUTHENTICATED STUDENT FLOW\033[0m")

        # Login
        try:
            r = self._post("/auth/student/login", {
                "student_id": student_id,
                "class_code": class_code,
                "secret_pin": pin,
            })
            if r.status_code == 200:
                body = r.json()
                self.student_token = body.get("access_token")
                if self.student_token:
                    self._pass(f"Student login successful (token: {self.student_token[:20]}...)")
                else:
                    self._fail("Student login", "200 but no access_token in response")
                    return
            else:
                self._fail("Student login", f"HTTP {r.status_code} — {r.text[:200]}")
                return
        except Exception as e:
            self._fail("Student login", str(e))
            return

        # Authenticated endpoints
        auth_endpoints = [
            ("/missions/me", "Student profile"),
            ("/missions/weekly-progress", "Weekly progress"),
            ("/missions/performance", "Performance profile"),
        ]
        for path, desc in auth_endpoints:
            try:
                r = self._get(path, token=self.student_token)
                if r.status_code == 200:
                    self._pass(f"{desc} (HTTP 200)")
                else:
                    self._fail(desc, f"HTTP {r.status_code} — {r.text[:150]}")
            except Exception as e:
                self._fail(desc, str(e))

    def test_frontend(self):
        if not self.frontend:
            print("\n\033[96m[7/8] FRONTEND — SKIPPED (no URL provided)\033[0m")
            return

        print("\n\033[96m[7/8] FRONTEND CONNECTIVITY\033[0m")

        pages = [
            ("/", "Landing page"),
            ("/teacher/login", "Teacher login"),
            ("/admin/login", "Admin login"),
            ("/student/play", "Student play"),
        ]
        for path, desc in pages:
            try:
                r = requests.get(f"{self.frontend}{path}", timeout=self.timeout, allow_redirects=True)
                if r.status_code == 200:
                    self._pass(f"{desc} loads (HTTP 200)")
                elif r.status_code in (301, 302, 307):
                    self._pass(f"{desc} redirects (HTTP {r.status_code})")
                else:
                    self._fail(desc, f"HTTP {r.status_code}")
            except Exception as e:
                self._fail(desc, str(e))

    def test_response_times(self):
        print("\n\033[96m[8/8] RESPONSE TIMES\033[0m")

        endpoints = [
            (f"{self.backend}/health", "Health"),
            (f"{self.api}/topics?grade_level=1", "Topics"),
        ]
        for url, desc in endpoints:
            try:
                start = time.time()
                r = requests.get(url, timeout=self.timeout)
                elapsed = (time.time() - start) * 1000

                if elapsed < 2000:
                    self._pass(f"{desc}: {elapsed:.0f}ms")
                elif elapsed < 5000:
                    self._warn(f"{desc}", f"{elapsed:.0f}ms (slow)")
                else:
                    self._fail(f"{desc} response time", f"{elapsed:.0f}ms (>5s)")
            except Exception as e:
                self._fail(f"{desc} response time", str(e))

    # ── Summary ──────────────────────────────────────────────────────────

    def summary(self):
        print(f"\n\033[96m{'='*45}\033[0m")
        print(f"\033[96m  RESULTS SUMMARY\033[0m")
        print(f"\033[96m{'='*45}\033[0m")
        print(f"  \033[92mPASSED:   {self.passed}\033[0m")
        print(f"  \033[91mFAILED:   {self.failed}\033[0m")
        print(f"  \033[93mWARNINGS: {self.warnings}\033[0m")

        if self.failures:
            print(f"\n  \033[91mFAILURES:\033[0m")
            for f in self.failures:
                print(f"  \033[91mX\033[0m {f}")

        print()
        if self.failed == 0:
            print("  \033[92mAll critical checks passed!\033[0m")
        else:
            print(f"  \033[91m{self.failed} critical check(s) failed — review above\033[0m")

        return self.failed == 0


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="PrimePal Deployment Smoke Test")
    parser.add_argument("--backend", required=True, help="Backend URL (e.g. https://api.primepal.com)")
    parser.add_argument("--frontend", default="", help="Frontend URL (e.g. https://primepal.com)")
    parser.add_argument("--class-code", default="", help="Class code for student login test")
    parser.add_argument("--student-id", default="", help="Student UUID for login test")
    parser.add_argument("--pin", default="", help="Student PIN for login test")
    args = parser.parse_args()

    print(f"\n\033[96m{'='*45}\033[0m")
    print(f"\033[96m  PrimePal Deployment Smoke Test\033[0m")
    print(f"\033[96m  Backend:  {args.backend}\033[0m")
    if args.frontend:
        print(f"\033[96m  Frontend: {args.frontend}\033[0m")
    print(f"\033[96m{'='*45}\033[0m")

    runner = TestRunner(args.backend, args.frontend)

    # Run all test sections
    runner.test_health()
    runner.test_cors()
    runner.test_public_endpoints()
    runner.test_auth_rejection()
    runner.test_protected_endpoints()

    if args.class_code and args.student_id and args.pin:
        runner.test_student_login(args.class_code, args.student_id, args.pin)
    else:
        print("\n\033[96m[6/8] AUTHENTICATED FLOW — SKIPPED\033[0m")
        print("  \033[93mNOTE\033[0m Pass --class-code, --student-id, --pin for authenticated tests")

    runner.test_frontend()
    runner.test_response_times()

    success = runner.summary()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
