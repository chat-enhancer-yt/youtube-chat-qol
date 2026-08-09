import argparse
import json
import time
import urllib.error
import urllib.request


FORCED_MOVE_FEN = "7k/8/8/8/8/8/6r1/7K w - - 0 1"
EXPECTED_MOVE = {
  "from": "h1",
  "to": "g2",
}


def request_json(base_url, path, method="GET", payload=None):
  body = None
  headers = {}
  if payload is not None:
    body = json.dumps(payload).encode("utf-8")
    headers["content-type"] = "application/json"

  request = urllib.request.Request(
    f"{base_url.rstrip('/')}{path}",
    data=body,
    headers=headers,
    method=method,
  )

  try:
    with urllib.request.urlopen(request, timeout=3) as response:
      return response.status, json.loads(response.read().decode("utf-8"))
  except urllib.error.HTTPError as error:
    return error.code, json.loads(error.read().decode("utf-8"))


def wait_for_health(base_url, timeout_seconds):
  deadline = time.monotonic() + timeout_seconds
  last_error = None

  while time.monotonic() < deadline:
    try:
      status, payload = request_json(base_url, "/health")
      if status == 200 and payload == {"ok": True}:
        return
      last_error = RuntimeError(f"health returned {status}: {payload}")
    except (OSError, ValueError, urllib.error.URLError) as error:
      last_error = error
    time.sleep(0.25)

  raise TimeoutError(f"container did not become healthy: {last_error}")


def run_smoke(base_url, startup_timeout_seconds):
  wait_for_health(base_url, startup_timeout_seconds)
  status, payload = request_json(base_url, "/best-move", method="POST", payload={
    "elo": 1700,
    "fen": FORCED_MOVE_FEN,
    "moveTimeMs": 50,
  })

  if status != 200:
    raise RuntimeError(f"best move returned {status}: {payload}")
  if payload.get("move") != EXPECTED_MOVE:
    raise RuntimeError(f"expected the only legal move {EXPECTED_MOVE}, received {payload.get('move')}")
  if payload.get("elo") != 1700 or payload.get("moveTimeMs") != 50:
    raise RuntimeError(f"response settings did not match the request: {payload}")
  if not isinstance(payload.get("elapsedMs"), int) or payload["elapsedMs"] < 0:
    raise RuntimeError(f"response elapsedMs was invalid: {payload}")

  print("Stockfish container smoke test passed.")


def main():
  parser = argparse.ArgumentParser(description="Smoke test the Stockfish container HTTP API.")
  parser.add_argument("--base-url", default="http://127.0.0.1:18080")
  parser.add_argument("--startup-timeout", type=float, default=60)
  args = parser.parse_args()
  run_smoke(args.base_url, args.startup_timeout)


if __name__ == "__main__":
  try:
    main()
  except Exception as error:
    raise SystemExit(f"Stockfish container smoke test failed: {error}") from error
