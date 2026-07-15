#!/usr/bin/env bash
set -euo pipefail

HOST="${1:-}"
SSH_USER="${2:-sepehr}"

if [[ -z "$HOST" ]]; then
  echo "Usage: $0 <host> [ssh_user]"
  exit 1
fi

ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=8 "${SSH_USER}@${HOST}" '
set -e

echo "=== host ==="
hostname

echo "=== os ==="
uname -a

if command -v lsb_release >/dev/null 2>&1; then
  echo "=== distro ==="
  lsb_release -ds || true
fi

echo "=== uptime ==="
uptime

echo "=== cpu/memory ==="
if command -v free >/dev/null 2>&1; then
  free -h
else
  vm_stat | head -n 20
fi

echo "=== disk ==="
df -h

echo "=== open ports ==="
ss -tulpen 2>/dev/null || netstat -tulpen 2>/dev/null || true

echo "=== service status ==="
systemctl is-active nginx mariadb redis redis-server 2>/dev/null || true

echo "=== versions ==="
python3 --version 2>/dev/null || true
node --version 2>/dev/null || true
npm --version 2>/dev/null || true
mariadb --version 2>/dev/null || mysql --version 2>/dev/null || true
redis-server --version 2>/dev/null || true
nginx -v 2>&1 || true
bench --version 2>/dev/null || true

echo "=== docker ==="
docker --version 2>/dev/null || true
docker ps --format "table {{.Names}}\t{{.Status}}" 2>/dev/null || true

echo "=== recent critical logs ==="
journalctl -p err -n 80 --no-pager 2>/dev/null || true
'
