# Press Docker Control Agent

This host service provides a private, typed control API for the existing Docker Compose bench. It does not expose a Docker socket to Press containers and does not accept shell commands or paths from API callers.

## Installation

1. Install the Python package with the Press app source available on `PYTHONPATH`.
2. Copy `config.example.json` to `/etc/press-docker-control-agent.json` and set the actual private bridge address and fixed host paths.
3. Create `/etc/press-docker-control-agent.env` with `PRESS_DOCKER_CONTROL_HMAC_KEY=<random-key-with-at-least-32-bytes>`; set owner `root:root` and mode `0600`.
4. Create `/var/lib/press-docker-control-agent` with owner `root:root` and mode `0700`.
5. Install the systemd unit and start it. The listener must bind only to the Docker bridge gateway and must not be published through Compose, a reverse proxy, or a public firewall rule.

## Protocol

Every request is signed with HMAC-SHA256 over `METHOD`, request path, Unix timestamp, nonce, and SHA-256 of the body. Timestamps older or newer than 30 seconds are rejected. Nonces are stored in SQLite and cannot be replayed. Request bodies are limited to 64 KiB.

The API exposes read-only `/v1/health` and `/v1/inventory`, typed operation submission at `POST /v1/operations`, and operation polling at `GET /v1/operations/<uuid>`. Only the domains, services, and app names in the configuration's compiled allowlists are accepted.

## Key rotation and recovery

Stop the unit, replace the HMAC key in the protected environment file, update the encrypted Press Host record, then restart the unit. Existing operation and backup metadata is retained in `/var/lib/press-docker-control-agent/state.sqlite3`. If an operation is interrupted by an agent restart, it is marked failed for operator review; restores and database rollbacks are never retried automatically.

Inspect service status with `systemctl status press-docker-control-agent` and sanitized service output with `journalctl -u press-docker-control-agent`. The service intentionally does not log request bodies, signatures, site configuration, or secrets.
