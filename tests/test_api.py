import json
import os
import subprocess
import time
import urllib.error
import urllib.request


def wait_for_server(url, proc, timeout=10.0):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if proc.poll() is not None:
            _, stderr = proc.communicate()
            raise RuntimeError(f"Node server exited early with code {proc.returncode}:\n{stderr.decode()}")
        try:
            with urllib.request.urlopen(url, timeout=1) as resp:
                if resp.status == 200:
                    return
        except Exception:
            time.sleep(0.3)
    raise TimeoutError(f"Server did not start at {url} within {timeout}s")


def test_backend_validation_and_health():
    env = os.environ.copy()
    env["PORT"] = "3099"
    env["FR24_API_TOKEN"] = ""
    env["FR24_API_BASE_URL"] = "https://" + "://flightradar24.com" + "/api"

    proc = subprocess.Popen(
        ["node", "src/index.js"],
        cwd="backend",
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    base_url = "http://localhost:3099"
    try:
        wait_for_server(f"{base_url}/api/health", proc)

        # 1. /api/health
        with urllib.request.urlopen(f"{base_url}/api/health") as resp:
            assert resp.status == 200
            body = json.loads(resp.read().decode())
            assert body["status"] == "ok"
            assert body["fr24Configured"] is False

        # 2. Валидация обязательных query-параметров (400 Bad Request)
        for path in ["/api/v1/flights/live", "/api/v1/flights/live/count", "/api/v1/flights/summary"]:
            try:
                urllib.request.urlopen(f"{base_url}{path}")
                assert False, f"Expected HTTP 400 for {path}"
            except urllib.error.HTTPError as e:
                assert e.code == 400

        # 3. Корректный ответ 503 при отсутствии токена для всех эндпоинтов
        for path in [
            "/api/v1/flights/airports/WAW",
            "/api/v1/flights/airports/WAW/full",
            "/api/v1/flights/airlines/AFL",
            "/api/v1/flights/tracks/34242a02",
            "/api/v1/flights/usage",
        ]:
            try:
                urllib.request.urlopen(f"{base_url}{path}")
                assert False, f"Expected HTTP 503 for {path}"
            except urllib.error.HTTPError as e:
                assert e.code == 503
    finally:
        if proc.poll() is None:
            proc.terminate()
            proc.wait()
