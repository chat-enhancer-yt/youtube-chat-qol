import http.client
import io
import json
import signal
import threading
import unittest
from unittest import mock

import server


class FakeStockfishEngine(server.StockfishEngine):
  def __init__(self):
    super().__init__("stockfish")
    self.commands = []

  def _ensure_ready(self):
    return

  def _read_until(self, predicate, timeout_seconds):
    for line in ["readyok", "bestmove e7e5"]:
      if predicate(line):
        return line
    raise TimeoutError("test predicate did not match")

  def _send(self, command):
    self.commands.append(command)


class StockfishServerTest(unittest.TestCase):
  def test_best_move_reconfigures_elo_only_when_it_changes(self):
    engine = FakeStockfishEngine()

    self.assertEqual(engine.best_move("startpos", 500, 1700), {
      "from": "e7",
      "to": "e5",
    })
    self.assertEqual(engine.best_move("startpos", 500, 1700), {
      "from": "e7",
      "to": "e5",
    })
    self.assertEqual(engine.best_move("startpos", 500, 1900), {
      "from": "e7",
      "to": "e5",
    })

    self.assertEqual(engine.commands.count("setoption name UCI_Elo value 1700"), 1)
    self.assertEqual(engine.commands.count("setoption name UCI_Elo value 1900"), 1)
    self.assertEqual(engine.commands.count("go movetime 500"), 3)

  def test_clamp_int_allows_beginner_elo_floor(self):
    self.assertEqual(server.clamp_int(750, server.DEFAULT_ELO, 750, 3190), 750)
    self.assertEqual(server.clamp_int(100, server.DEFAULT_ELO, 750, 3190), 750)

  def test_timeout_stops_and_restarts_stockfish(self):
    engine = server.StockfishEngine("stockfish")
    engine._ensure_ready = mock.Mock()
    engine._configure_strength = mock.Mock()
    engine._read_until = mock.Mock(side_effect=TimeoutError("stockfish timed out"))
    engine._restart = mock.Mock()
    engine._send = mock.Mock()

    with self.assertRaisesRegex(TimeoutError, "stockfish timed out"):
      engine.best_move("test-fen", 500, 1700)

    engine._configure_strength.assert_called_once_with(1700)
    engine._send.assert_has_calls([
      mock.call("position fen test-fen"),
      mock.call("go movetime 500"),
      mock.call("stop"),
    ])
    self.assertEqual(engine._read_until.call_count, 2)
    engine._restart.assert_called_once_with()

  def test_parse_bestmove_handles_promotions_and_no_move(self):
    self.assertEqual(server.parse_bestmove("bestmove e7e8q"), {
      "from": "e7",
      "promotion": "q",
      "to": "e8",
    })
    self.assertIsNone(server.parse_bestmove("bestmove 0000"))
    self.assertIsNone(server.parse_bestmove("bestmove bad"))

  def test_close_quits_the_stockfish_process(self):
    engine = server.StockfishEngine("stockfish")
    process = mock.Mock()
    process.poll.return_value = None
    process.stdin = io.StringIO()
    engine.process = process
    engine.current_elo = 1700

    engine.close()

    self.assertEqual(process.stdin.getvalue(), "quit\n")
    process.wait.assert_called_once_with(timeout=server.SHUTDOWN_TIMEOUT_SECONDS)
    self.assertIsNone(engine.process)
    self.assertIsNone(engine.current_elo)

  def test_shutdown_handler_stops_the_http_server_once(self):
    stopped = threading.Event()
    http_server = mock.Mock()
    http_server.shutdown.side_effect = stopped.set

    with mock.patch.object(server.signal, "signal") as register_signal:
      handler = server.install_shutdown_handlers(http_server)

    register_signal.assert_any_call(signal.SIGTERM, handler)
    register_signal.assert_any_call(signal.SIGINT, handler)

    handler(signal.SIGTERM, None)
    handler(signal.SIGTERM, None)

    self.assertTrue(stopped.wait(timeout=1))
    http_server.shutdown.assert_called_once_with()


class StockfishHttpTest(unittest.TestCase):
  def setUp(self):
    self.engine = mock.Mock(spec=server.StockfishEngine)
    self.engine.best_move.return_value = {
      "from": "e2",
      "to": "e4",
    }
    self.engine_patch = mock.patch.object(server, "ENGINE", self.engine)
    self.engine_patch.start()
    self.addCleanup(self.engine_patch.stop)

    self.http_server = server.ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
    self.http_thread = threading.Thread(
      target=self.http_server.serve_forever,
      kwargs={"poll_interval": 0.01},
      daemon=True,
    )
    self.http_thread.start()
    self.addCleanup(self._stop_http_server)

  def test_health_and_unknown_routes(self):
    status, payload = self._request("GET", "/health")
    self.assertEqual(status, 200)
    self.assertEqual(payload, {"ok": True})

    status, payload = self._request("GET", "/unknown")
    self.assertEqual(status, 404)
    self.assertEqual(payload, {"error": "not_found"})
    self.engine.best_move.assert_not_called()

  def test_best_move_returns_engine_result(self):
    fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

    status, payload = self._request("POST", "/best-move", {"fen": f"  {fen}  "})

    self.assertEqual(status, 200)
    self.assertEqual(payload["elo"], server.DEFAULT_ELO)
    self.assertEqual(payload["move"], {"from": "e2", "to": "e4"})
    self.assertEqual(payload["moveTimeMs"], server.DEFAULT_MOVE_TIME_MS)
    self.assertGreaterEqual(payload["elapsedMs"], 0)
    self.engine.best_move.assert_called_once_with(
      fen,
      server.DEFAULT_MOVE_TIME_MS,
      server.DEFAULT_ELO,
    )

  def test_best_move_rejects_invalid_request_bodies(self):
    cases = [
      ("missing body", None, "Request body is required."),
      ("malformed JSON", b"{", "Request body must be valid JSON."),
      ("oversized body", b"x" * (server.MAX_BODY_BYTES + 1), "Request body is too large."),
      ("missing fen", {}, "fen must be a non-empty string."),
    ]

    for label, body, message in cases:
      with self.subTest(label):
        status, payload = self._request("POST", "/best-move", body)
        self.assertEqual(status, 400)
        self.assertEqual(payload, {
          "error": "bad_request",
          "message": message,
        })

    self.engine.best_move.assert_not_called()

  def test_best_move_clamps_strength_and_move_time(self):
    cases = [
      (100, 1, 750, 10),
      (9999, 9999, 3190, server.MAX_MOVE_TIME_MS),
    ]

    for elo, move_time_ms, expected_elo, expected_move_time_ms in cases:
      with self.subTest(elo=elo, move_time_ms=move_time_ms):
        self.engine.best_move.reset_mock()
        status, payload = self._request("POST", "/best-move", {
          "elo": elo,
          "fen": "test-fen",
          "moveTimeMs": move_time_ms,
        })

        self.assertEqual(status, 200)
        self.assertEqual(payload["elo"], expected_elo)
        self.assertEqual(payload["moveTimeMs"], expected_move_time_ms)
        self.engine.best_move.assert_called_once_with(
          "test-fen",
          expected_move_time_ms,
          expected_elo,
        )

  def test_best_move_reports_engine_failures(self):
    self.engine.best_move.side_effect = RuntimeError("engine unavailable")

    status, payload = self._request("POST", "/best-move", {"fen": "test-fen"})

    self.assertEqual(status, 500)
    self.assertEqual(payload, {
      "error": "stockfish_failed",
      "message": "engine unavailable",
    })

  def _request(self, method, path, body=None):
    headers = {}
    if isinstance(body, dict):
      body = json.dumps(body).encode("utf-8")
      headers["content-type"] = "application/json"

    connection = http.client.HTTPConnection(*self.http_server.server_address, timeout=2)
    try:
      connection.request(method, path, body=body, headers=headers)
      response = connection.getresponse()
      payload = json.loads(response.read().decode("utf-8"))
      return response.status, payload
    finally:
      connection.close()

  def _stop_http_server(self):
    self.http_server.shutdown()
    self.http_server.server_close()
    self.http_thread.join(timeout=1)


if __name__ == "__main__":
  unittest.main()
