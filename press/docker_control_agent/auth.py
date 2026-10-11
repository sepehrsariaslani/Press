from __future__ import annotations

import hashlib
import hmac
import re
import sqlite3
import time

NONCE_RE = re.compile(r"^[A-Za-z0-9_-]{16,128}$")


class AuthenticationError(Exception):
	pass


def canonical_request(method: str, path: str, timestamp: str, nonce: str, body: bytes) -> bytes:
	return "\n".join((method.upper(), path, timestamp, nonce, hashlib.sha256(body).hexdigest())).encode(
		"utf-8"
	)


def verify_request(
	method: str,
	path: str,
	timestamp: str,
	nonce: str,
	body: bytes,
	signature: str,
	key: bytes,
	database: sqlite3.Connection,
) -> None:
	try:
		request_time = int(timestamp)
		if len(body) > 64 * 1024 or abs(int(time.time()) - request_time) > 30:
			raise AuthenticationError("Invalid authentication")
		if not NONCE_RE.fullmatch(nonce):
			raise AuthenticationError("Invalid authentication")
		if not re.fullmatch(r"[a-f0-9]{64}", signature):
			raise AuthenticationError("Invalid authentication")
		expected = hmac.new(
			key, canonical_request(method, path, timestamp, nonce, body), hashlib.sha256
		).hexdigest()
		if not hmac.compare_digest(expected, signature):
			raise AuthenticationError("Invalid authentication")
		database.execute("DELETE FROM consumed_nonces WHERE created_at < ?", (int(time.time()) - 300,))
		database.execute(
			"INSERT INTO consumed_nonces(nonce, created_at) VALUES (?, ?)", (nonce, request_time)
		)
		database.commit()
	except (ValueError, sqlite3.IntegrityError) as error:
		database.rollback()
		raise AuthenticationError("Invalid authentication") from error
