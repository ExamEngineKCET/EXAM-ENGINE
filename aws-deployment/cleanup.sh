#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT="$HOME/EXAM-ENGINE"
BACKEND="$PROJECT/Backend"
FRONTEND="$PROJECT/Figma Frontend"

DEFAULT_PORTS="80 443 3000 5000 5173 8000 8080"
DEFAULT_SERVICES="exam-engine nginx"
BLOCKED_PORTS="22"

log()  { printf '\n=== %s ===\n' "$*"; }
info() { printf '  %s\n' "$*"; }
warn() { printf '\n[WARN] %s\n' "$*" >&2; }

FORCE=0
DRY_RUN=0
PURGE_BUILD=0
PORTS="$DEFAULT_PORTS"
SERVICES="$DEFAULT_SERVICES"

usage() {
    cat <<EOF
Usage: $(basename "$0") [options]

Stops Exam Engine services and frees every port the app uses.

Options:
  -y, --yes            Skip the confirmation prompt
  -n, --dry-run        Show what would be done, change nothing
  --purge-build        Also remove Backend/venv, node_modules/, dist/, __pycache__
  --ports "80 8000"    Override the port list (default: $DEFAULT_PORTS)
  --services "a b"     Override the service list (default: $DEFAULT_SERVICES)
  -h, --help           Show this help
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -y|--yes)         FORCE=1; shift ;;
        -n|--dry-run)     DRY_RUN=1; shift ;;
        --purge-build)    PURGE_BUILD=1; shift ;;
        --ports)          PORTS="$2"; shift 2 ;;
        --services)       SERVICES="$2"; shift 2 ;;
        -h|--help)        usage; exit 0 ;;
        *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
    esac
done

[ "$(id -u)" -ne 0 ] || { echo "Run as ubuntu, not root."; exit 1; }

command -v fuser >/dev/null 2>&1 || sudo apt-get install -y psmisc
command -v ss    >/dev/null 2>&1 || sudo apt-get install -y iproute2

is_blocked() {
    local p="$1" b
    for b in $BLOCKED_PORTS; do
        [ "$p" = "$b" ] && return 0
    done
    return 1
}

port_in_use() {
    sudo ss -H -ltn "sport = :$1" 2>/dev/null | grep -q .
}

port_owner() {
    sudo ss -H -ltnp "sport = :$1" 2>/dev/null \
        | awk -F'"' '{print $2}' \
        | sort -u | paste -sd, -
}

kill_port() {
    local p="$1" owner
    if ! port_in_use "$p"; then
        info "port $p: already free"
        return 0
    fi
    owner=$(port_owner "$p")
    info "port $p: in use ($owner)"

    if (( DRY_RUN )); then
        info "port $p: WOULD kill"
        return 0
    fi

    sudo fuser -k -TERM -n tcp "$p" >/dev/null 2>&1 || true
    sleep 1
    if port_in_use "$p"; then
        info "port $p: still up, sending SIGKILL"
        sudo fuser -k -KILL -n tcp "$p" >/dev/null 2>&1 || true
        sleep 1
    fi

    if port_in_use "$p"; then
        warn "port $p: could not be freed"
        return 1
    fi
    info "port $p: freed"
    return 0
}

# ---------- confirmation ----------
if (( ! FORCE && ! DRY_RUN )); then
    echo
    echo "About to stop services: $SERVICES"
    echo "About to free ports:    $PORTS"
    echo
    read -rp "Continue? [y/N] " ans
    [[ "$ans" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 1; }
fi

# ---------- stop services ----------
log "Stopping services"
for svc in $SERVICES; do
    if ! systemctl cat "$svc" >/dev/null 2>&1; then
        info "$svc: unit not found (skipping)"
        continue
    fi
    if ! systemctl is-active --quiet "$svc"; then
        info "$svc: not running"
        continue
    fi
    if (( DRY_RUN )); then
        info "$svc: WOULD stop"
        continue
    fi
    sudo systemctl stop "$svc" \
        && info "$svc: stopped" \
        || warn "$svc: stop failed"
done

# ---------- stray app processes ----------
log "Stopping stray app processes"
stray_pkill() {
    local pattern="$1"
    if pgrep -f "$pattern" >/dev/null 2>&1; then
        info "found: $pattern"
        if (( DRY_RUN )); then
            info "WOULD pkill '$pattern'"
        else
            pkill -f "$pattern" 2>/dev/null || true
            sleep 1
            pkill -KILL -f "$pattern" 2>/dev/null || true
            info "killed: $pattern"
        fi
    fi
}
stray_pkill "uvicorn app.main:app"
stray_pkill "uvicorn.*--port 8000"
stray_pkill "node.*/vite"
stray_pkill "vite --host"
stray_pkill "vite --port"

# ---------- free ports ----------
log "Freeing ports"
fail_count=0
for p in $PORTS; do
    if is_blocked "$p"; then
        info "port $p: BLOCKED (skipped)"
        continue
    fi
    kill_port "$p" || fail_count=$((fail_count + 1))
done

# ---------- optional purge ----------
if (( PURGE_BUILD )); then
    log "Purging build artifacts"
    if (( DRY_RUN )); then
        info "WOULD remove: $BACKEND/venv"
        info "WOULD remove: $FRONTEND/node_modules"
        info "WOULD remove: $FRONTEND/dist"
        info "WOULD remove: all __pycache__ under $BACKEND"
    else
        rm -rf "$BACKEND/venv" "$FRONTEND/node_modules" "$FRONTEND/dist"
        find "$BACKEND" -type d -name __pycache__ -prune -exec rm -rf {} + 2>/dev/null || true
        info "removed build artifacts"
    fi
fi

# ---------- final report ----------
log "Final state"
for p in $PORTS; do
    if is_blocked "$p"; then
        info "port $p: BLOCKED"
        continue
    fi
    if port_in_use "$p"; then
        info "port $p: IN USE ($(port_owner "$p"))"
    else
        info "port $p: free"
    fi
done

echo
if (( fail_count > 0 )); then
    warn "$fail_count port(s) could not be freed. Check permissions or restart the box."
    exit 1
fi
echo "Cleanup complete."