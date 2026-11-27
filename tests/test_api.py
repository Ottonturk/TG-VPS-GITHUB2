#def test_placeholder_backend():
#   assert 1 + 1 == 2
import os
import subprocess
import time
import urllib.request
import urllib.error
import json


def test_backend_validation_and_health():
    env = os.environ.copy()
    env["PORT"] = "3099"
    env["FR24_API_TOKEN"] = ""

    proc = subprocess.Popen(["node", "src/index.js"], cwd="backend", env=env)
    base_url = "http://localhost:3099"
    try:
        time.sleep(1.5)

        # 1. Проверяем /api/health
        with urllib.request.urlopen(f"{base_url}/api/health") as resp:
            assert resp.status == 200
            body = json.loads(resp.read().decode())
            assert body["status"] == "ok"
            assert body["fr24Mode"] == "sandbox"

        # 2. Проверяем валидацию параметров на /api/v1/flights/live (без фильтров -> 400)
        try:
            urllib.request.urlopen(f"{base_url}/api/v1/flights/live")
            assert False, "Expected HTTP 400"
        except urllib.error.HTTPError as e:
            assert e.code == 400

        # 3. Проверяем корректный ответ 503, если FR24_API_TOKEN не задан
        try:
            urllib.request.urlopen(f"{base_url}/api/v1/flights/airports/WAW")
            assert False, "Expected HTTP 503"
        except urllib.error.HTTPError as e:
            assert e.code == 503
    finally:
        proc.terminate()
        proc.wait()
