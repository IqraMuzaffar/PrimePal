"""
Comprehensive test suite for PrimePal architecture optimizations.
Tests: Caching, Timeouts, Database queries, API response times.
"""
import asyncio
import json
import time
import logging
from datetime import datetime

import httpx
from app.core.cache import init_redis, cache_get, cache_set, make_cache_key, close_redis

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Test configuration
BASE_URL = "http://localhost:8000"
API_VERSION = "/api/v1"
TIMEOUT = 30.0

# Mock student token (replace with real token from your system)
STUDENT_TOKEN = None  # Will be set by test


class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.total = 0
        self.results = []

    def add(self, test_name: str, passed: bool, details: dict = None):
        self.total += 1
        if passed:
            self.passed += 1
            status = "✓ PASS"
        else:
            self.failed += 1
            status = "✗ FAIL"

        msg = f"{status}: {test_name}"
        if details:
            msg += f" | {details}"
        print(msg)
        self.results.append({"name": test_name, "passed": passed, "details": details})

    def summary(self):
        print(f"\n{'='*60}")
        print(f"TEST SUMMARY: {self.passed}/{self.total} passed ({100*self.passed//self.total}%)")
        print(f"{'='*60}")
        return self.passed == self.total


async def test_redis_connection():
    """Test 1: Redis connection and basic caching"""
    print("\n" + "="*60)
    print("TEST 1: Redis Connection & Caching")
    print("="*60)
    results = TestResults()

    try:
        await init_redis("redis://localhost:6379")
        results.add("Redis initialization", True)
    except Exception as e:
        results.add("Redis initialization", False, str(e))
        return results

    # Test cache set/get
    try:
        test_key = make_cache_key("test", "key1")
        test_value = {"message": "Hello Cache", "timestamp": datetime.now().isoformat()}

        await cache_set(test_key, test_value, ttl=3600)
        cached = await cache_get(test_key)

        if cached and cached.get("message") == "Hello Cache":
            results.add("Cache SET/GET", True, f"Key: {test_key}")
        else:
            results.add("Cache SET/GET", False, f"Retrieved: {cached}")
    except Exception as e:
        results.add("Cache SET/GET", False, str(e))

    await close_redis()
    results.summary()
    return results


async def test_health_endpoint():
    """Test 2: Health check endpoint"""
    print("\n" + "="*60)
    print("TEST 2: Health Endpoint")
    print("="*60)
    results = TestResults()

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        try:
            start = time.time()
            resp = await client.get(f"{BASE_URL}/health")
            elapsed = time.time() - start

            if resp.status_code == 200:
                results.add("Health check endpoint", True, f"Response time: {elapsed:.3f}s")
                data = resp.json()
                if data.get("status") == "ok":
                    results.add("Health check response format", True)
                else:
                    results.add("Health check response format", False, f"Data: {data}")
            else:
                results.add("Health check endpoint", False, f"Status: {resp.status_code}")
        except Exception as e:
            results.add("Health check endpoint", False, str(e))

    results.summary()
    return results


async def test_cache_hit_performance():
    """Test 3: Cache hit vs miss performance"""
    print("\n" + "="*60)
    print("TEST 3: Cache Hit Performance")
    print("="*60)
    results = TestResults()

    await init_redis("redis://localhost:6379")

    # Create test data
    cache_key = make_cache_key("perf_test", "missions")
    test_data = {
        "grade_level": 3,
        "topic": "Test Topic",
        "questions": [{"id": i, "text": f"Question {i}"} for i in range(3)]
    }

    try:
        # First write (cold cache)
        await cache_set(cache_key, test_data, ttl=3600)

        # Measure cache hits
        times = []
        for i in range(5):
            start = time.time()
            cached = await cache_get(cache_key)
            elapsed = time.time() - start
            times.append(elapsed)

        avg_time = sum(times) / len(times)
        max_time = max(times)

        if avg_time < 0.01:  # Should be < 10ms
            results.add("Cache hit latency", True, f"Avg: {avg_time*1000:.2f}ms, Max: {max_time*1000:.2f}ms")
        else:
            results.add("Cache hit latency", False, f"Avg: {avg_time*1000:.2f}ms (expected <10ms)")

    except Exception as e:
        results.add("Cache hit performance", False, str(e))

    await close_redis()
    results.summary()
    return results


async def test_student_endpoints():
    """Test 4: Student endpoints (missions, profile, leaderboard)"""
    print("\n" + "="*60)
    print("TEST 4: Student Endpoints")
    print("="*60)
    results = TestResults()

    if not STUDENT_TOKEN:
        results.add("Student endpoints", False, "No student token provided - skipping")
        results.summary()
        return results

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        headers = {"Authorization": f"Bearer {STUDENT_TOKEN}"}

        # Test /missions/me
        try:
            start = time.time()
            resp = await client.get(f"{BASE_URL}{API_VERSION}/missions/me", headers=headers)
            elapsed = time.time() - start

            if resp.status_code == 200:
                results.add("/missions/me", True, f"Response time: {elapsed:.3f}s")
            elif resp.status_code == 401:
                results.add("/missions/me", False, "Unauthorized - invalid token")
            else:
                results.add("/missions/me", False, f"Status: {resp.status_code}")
        except httpx.TimeoutException:
            results.add("/missions/me", False, f"Timeout (>{TIMEOUT}s)")
        except Exception as e:
            results.add("/missions/me", False, str(e)[:50])

        # Test /missions/daily (should use cache)
        try:
            start = time.time()
            resp = await client.get(f"{BASE_URL}{API_VERSION}/missions/daily", headers=headers)
            elapsed = time.time() - start

            if resp.status_code == 200:
                is_cached = elapsed < 0.5  # Cached should be fast
                results.add("/missions/daily", True, f"Response time: {elapsed:.3f}s {'(cached)' if is_cached else '(LLM)'}")
            else:
                results.add("/missions/daily", False, f"Status: {resp.status_code}")
        except httpx.TimeoutException:
            results.add("/missions/daily", False, f"Timeout (>{TIMEOUT}s) - timeout protection working")
        except Exception as e:
            results.add("/missions/daily", False, str(e)[:50])

        # Test /missions/leaderboard
        try:
            start = time.time()
            resp = await client.get(f"{BASE_URL}{API_VERSION}/missions/leaderboard", headers=headers)
            elapsed = time.time() - start

            if resp.status_code == 200:
                results.add("/missions/leaderboard", True, f"Response time: {elapsed:.3f}s")
            else:
                results.add("/missions/leaderboard", False, f"Status: {resp.status_code}")
        except httpx.TimeoutException:
            results.add("/missions/leaderboard", False, f"Timeout (>{TIMEOUT}s)")
        except Exception as e:
            results.add("/missions/leaderboard", False, str(e)[:50])

        # Test /missions/weekly-progress
        try:
            start = time.time()
            resp = await client.get(f"{BASE_URL}{API_VERSION}/missions/weekly-progress", headers=headers)
            elapsed = time.time() - start

            if resp.status_code == 200:
                results.add("/missions/weekly-progress", True, f"Response time: {elapsed:.3f}s")
            else:
                results.add("/missions/weekly-progress", False, f"Status: {resp.status_code}")
        except httpx.TimeoutException:
            results.add("/missions/weekly-progress", False, f"Timeout (>{TIMEOUT}s)")
        except Exception as e:
            results.add("/missions/weekly-progress", False, str(e)[:50])

    results.summary()
    return results


async def test_concurrent_requests():
    """Test 5: Concurrent request handling (simulate 10 users)"""
    print("\n" + "="*60)
    print("TEST 5: Concurrent Requests (10 simultaneous)")
    print("="*60)
    results = TestResults()

    if not STUDENT_TOKEN:
        results.add("Concurrent requests", False, "No student token provided - skipping")
        results.summary()
        return results

    async def make_request(client, endpoint):
        headers = {"Authorization": f"Bearer {STUDENT_TOKEN}"}
        return await client.get(f"{BASE_URL}{API_VERSION}/{endpoint}", headers=headers)

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            start = time.time()

            # Make 10 concurrent requests to /missions/leaderboard
            tasks = [make_request(client, "missions/leaderboard") for _ in range(10)]
            responses = await asyncio.gather(*tasks, return_exceptions=True)

            elapsed = time.time() - start

            successful = sum(1 for r in responses if isinstance(r, httpx.Response) and r.status_code == 200)

            if successful >= 8:  # At least 80% success
                results.add("Concurrent requests", True, f"Success: {successful}/10, Time: {elapsed:.3f}s")
            else:
                results.add("Concurrent requests", False, f"Success: {successful}/10")
    except Exception as e:
        results.add("Concurrent requests", False, str(e)[:50])

    results.summary()
    return results


async def test_docker_health():
    """Test 6: Docker health check"""
    print("\n" + "="*60)
    print("TEST 6: Docker Health Check")
    print("="*60)
    results = TestResults()

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        try:
            # Test multiple health checks rapidly
            for i in range(5):
                resp = await client.get(f"{BASE_URL}/health")
                if resp.status_code != 200:
                    results.add(f"Health check #{i+1}", False, f"Status: {resp.status_code}")
                    return results

            results.add("Sequential health checks", True, "All 5 checks passed")
        except Exception as e:
            results.add("Health checks", False, str(e))

    results.summary()
    return results


async def main():
    """Run all tests"""
    print("\n" + "="*70)
    print(" "*15 + "PRIMEPAL OPTIMIZATION TEST SUITE")
    print("="*70)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"Backend URL: {BASE_URL}")
    print("="*70)

    all_results = []

    # Run tests in sequence
    all_results.append(await test_redis_connection())
    all_results.append(await test_health_endpoint())
    all_results.append(await test_cache_hit_performance())
    all_results.append(await test_docker_health())
    all_results.append(await test_student_endpoints())
    all_results.append(await test_concurrent_requests())

    # Final summary
    total_passed = sum(r.passed for r in all_results)
    total_tests = sum(r.total for r in all_results)

    print("\n" + "="*70)
    print(f"FINAL RESULTS: {total_passed}/{total_tests} tests passed ({100*total_passed//total_tests}%)")
    print("="*70)

    if total_passed == total_tests:
        print("✓ All systems operational - Ready for deployment!")
    else:
        print("✗ Some tests failed - Review issues before deployment")

    print("="*70 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
