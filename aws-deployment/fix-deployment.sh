#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT="$HOME/EXAM-ENGINE"
BACKEND="$PROJECT/Backend"
FRONTEND="$PROJECT/Figma Frontend"
VENV="$BACKEND/venv"
DB_MOUNT="/mnt/exam-engine-db"
FALLBACK_DB_DIR="$HOME/exam-engine-db"
BACKEND_PORT=8000

SYSTEMD_MOUNT_LINE=""

log()  { printf '\n=== %s ===\n' "$*"; }
warn() { printf '\n[WARN] %s\n' "$*" >&2; }
die()  { printf '\n[FATAL] %s\n' "$*" >&2; exit 1; }

# ==========================================================
# 0. Preflight
# ==========================================================
log "0. Preflight"

[ "$(id -u)" -ne 0 ] || die "Run as ubuntu, not root. The script uses sudo internally."
[ "$HOME" != "/root" ] || die "HOME=/root. Run as ubuntu, not via sudo."

for DIR in "$BACKEND" "$FRONTEND"; do
    [ -d "$DIR" ] || die "Missing directory: $DIR"
done
[ -f "$FRONTEND/package.json" ] || die "No package.json in $FRONTEND"

if [ ! -f "$BACKEND/requirements.txt" ] && [ ! -f "$BACKEND/pyproject.toml" ]; then
    warn "No requirements.txt / pyproject.toml in $BACKEND"
fi

# ==========================================================
# 1. System packages
# ==========================================================
log "1. Installing system packages"

sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
    python3 python3-venv python3-pip build-essential \
    nginx curl ca-certificates gnupg lsb-release

if ! command -v aws >/dev/null 2>&1; then
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y awscli \
        || warn "awscli unavailable; security-group auto-open will be skipped"
fi

# ==========================================================
# 2. Node.js 20+
# ==========================================================
log "2. Ensuring Node.js 20+"

NODE_OK=0
if command -v node >/dev/null 2>&1; then
    NODE_MAJOR=$(node -p "Number(process.versions.node.split('.')[0])" 2>/dev/null || echo 0)
    (( NODE_MAJOR >= 20 )) && NODE_OK=1
fi
if (( NODE_OK == 0 )); then
    echo "Installing Node.js 20 via NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
fi
command -v node >/dev/null 2>&1 || die "Node.js installation failed"
NODE_MAJOR=$(node -p "Number(process.versions.node.split('.')[0])")
(( NODE_MAJOR >= 20 )) || die "Node.js 20+ required, got $(node --version)"
echo "Node.js: $(node --version)  npm: $(npm --version)"

# ==========================================================
# 3. Database volume (auto-setup)
# ==========================================================
log "3. Ensuring database volume"

ROOT_SRC=$(findmnt -n -o SOURCE / 2>/dev/null || true)
ROOT_DISK=$(lsblk -no PKNAME "$ROOT_SRC" 2>/dev/null | head -n1 || true)
if [ -z "$ROOT_DISK" ] && [ -e "$ROOT_SRC" ]; then
    ROOT_DISK=$(basename "$(readlink -f "$ROOT_SRC")" | sed -E 's/p?[0-9]+$//')
fi
echo "Root disk: ${ROOT_DISK:-unknown} ($ROOT_SRC)"

ensure_db_mount() {
    if mountpoint -q "$DB_MOUNT"; then
        echo "OK: $DB_MOUNT already mounted."
        sudo chown ubuntu:ubuntu "$DB_MOUNT" 2>/dev/null || true
        df -h "$DB_MOUNT" || true
        SYSTEMD_MOUNT_LINE="RequiresMountsFor=$DB_MOUNT"
        return 0
    fi

    local CANDIDATE="" FS="" D MPS DISK_FS PART PART_FS
    for D in $(lsblk -dn -o NAME,TYPE | awk '$2=="disk"{print $1}'); do
        [ "$D" = "$ROOT_DISK" ] && continue
        MPS=$(lsblk -no MOUNTPOINT "/dev/$D" 2>/dev/null | sed '/^$/d' || true)
        [ -n "$MPS" ] && continue

        DISK_FS=$(lsblk -no FSTYPE "/dev/$D" 2>/dev/null | sed '/^$/d' | head -n1 || true)
        if [ -n "$DISK_FS" ]; then
            CANDIDATE="/dev/$D"; FS="$DISK_FS"; break
        fi
        PART=$(lsblk -no NAME,TYPE "/dev/$D" 2>/dev/null | awk '$2=="part"{print $1; exit}' || true)
        if [ -n "$PART" ]; then
            PART_FS=$(lsblk -no FSTYPE "/dev/$PART" 2>/dev/null | sed '/^$/d' | head -n1 || true)
            if [ -n "$PART_FS" ]; then
                CANDIDATE="/dev/$PART"; FS="$PART_FS"; break
            fi
        else
            CANDIDATE="/dev/$D"; FS=""; break
        fi
    done

    if [ -z "$CANDIDATE" ]; then
        warn "No unattached EBS volume found. Falling back to $FALLBACK_DB_DIR (data NOT preserved across instance replacement)."
        DB_MOUNT="$FALLBACK_DB_DIR"
        mkdir -p "$DB_MOUNT"; chmod 700 "$DB_MOUNT"
        SYSTEMD_MOUNT_LINE=""
        return 0
    fi

    echo "Candidate volume: $CANDIDATE (fs='${FS:-none}')"
    if [ -z "$FS" ]; then
        echo "Formatting $CANDIDATE as ext4..."
        sudo mkfs.ext4 -F -L exam-engine-db "$CANDIDATE"
        FS=ext4
    fi

    sudo mkdir -p "$DB_MOUNT"
    if ! sudo mount "$CANDIDATE" "$DB_MOUNT"; then
        warn "Mount failed for $CANDIDATE; falling back to $FALLBACK_DB_DIR."
        DB_MOUNT="$FALLBACK_DB_DIR"
        mkdir -p "$DB_MOUNT"; chmod 700 "$DB_MOUNT"
        SYSTEMD_MOUNT_LINE=""
        return 0
    fi
    sudo chown ubuntu:ubuntu "$DB_MOUNT" 2>/dev/null || true
    echo "Mounted $CANDIDATE at $DB_MOUNT."

    local UUID
    UUID=$(sudo blkid -s UUID -o value "$CANDIDATE" 2>/dev/null || true)
    if [ -n "$UUID" ]; then
        if ! grep -qE "[[:space:]]${DB_MOUNT}[[:space:]]" /etc/fstab; then
            echo "UUID=$UUID  $DB_MOUNT  $FS  defaults,nofail  0  2" | sudo tee -a /etc/fstab >/dev/null
            echo "Added fstab entry (UUID=$UUID)."
        fi
    else
        warn "Could not read UUID; skipping fstab update."
    fi
    SYSTEMD_MOUNT_LINE="RequiresMountsFor=$DB_MOUNT"
    df -h "$DB_MOUNT" || true
}

ensure_db_mount

# ==========================================================
# 4. Python venv
# ==========================================================
log "4. Python virtual environment"
[ -d "$VENV" ] || python3 -m venv "$VENV"
"$VENV/bin/python" -m pip install --upgrade pip

# ==========================================================
# 5. Backend deps
# ==========================================================
log "5. Backend Python dependencies"
if [ -f "$BACKEND/requirements.txt" ]; then
    "$VENV/bin/python" -m pip install -r "$BACKEND/requirements.txt"
elif [ -f "$BACKEND/pyproject.toml" ]; then
    (cd "$BACKEND" && "$VENV/bin/python" -m pip install .)
else
    warn "No requirements.txt / pyproject.toml; skipping backend deps."
fi

# ==========================================================
# 6. DB config inspection
# ==========================================================
log "6. Database configuration inspection"
grep -RniE 'DATABASE_URL|create_all|sqlite|SQLALCHEMY_DATABASE_URL|DATABASE_DIR' \
    "$BACKEND/app" --include='*.py' --exclude-dir=__pycache__ || true

if grep -RqE "sqlite:///\./" "$BACKEND/app" --include='*.py' --exclude-dir=__pycache__ 2>/dev/null; then
    warn "Backend has a relative SQLite path. Data will land on the root volume, NOT $DB_MOUNT."
fi

# ==========================================================
# 7. Frontend build
# ==========================================================
log "7. Building frontend"
cd "$FRONTEND"
if [ -f package-lock.json ]; then
    npm ci || { warn "npm ci failed; falling back to npm install"; npm install; }
else
    npm install
fi
npm run build
[ -d "$FRONTEND/dist" ] || die "Build did not produce dist/"

# ==========================================================
# 8. Deploy static files
# ==========================================================
log "8. Deploying static files"
sudo mkdir -p /var/www/exam-engine
sudo rm -rf /var/www/exam-engine/*
sudo cp -a "$FRONTEND/dist/." /var/www/exam-engine/

# ==========================================================
# 9. Schema init (best-effort)
# ==========================================================
log "9. Initializing database schema"
cd "$BACKEND"
if [ -f "$BACKEND/alembic.ini" ] && [ -x "$VENV/bin/alembic" ]; then
    DATABASE_DIR="$DB_MOUNT" "$VENV/bin/alembic" upgrade head \
        && echo "Alembic migrations applied." \
        || warn "Alembic upgrade failed; check migrations manually."
elif [ -f "$BACKEND/app/database.py" ]; then
    DATABASE_DIR="$DB_MOUNT" "$VENV/bin/python" -c \
        "from app.database import Base, engine; Base.metadata.create_all(engine)" \
        && echo "create_all() complete." \
        || warn "create_all() failed; app.database may not export Base/engine."
else
    warn "No alembic.ini and no app/database.py; skipping schema init."
fi

# ==========================================================
# 10. systemd service
# ==========================================================
log "10. Configuring systemd service"

sudo tee /etc/systemd/system/exam-engine.service > /dev/null <<UNIT_EOF
[Unit]
Description=Exam Engine FastAPI Backend
After=network.target
${SYSTEMD_MOUNT_LINE}

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=${BACKEND}
Environment="DATABASE_DIR=${DB_MOUNT}"
ExecStart=${VENV}/bin/uvicorn app.main:app --host 127.0.0.1 --port ${BACKEND_PORT}
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT_EOF

sudo systemctl daemon-reload
sudo systemctl enable exam-engine
sudo systemctl restart exam-engine

if ! sudo systemctl is-active --quiet exam-engine; then
    sudo journalctl -u exam-engine -n 60 --no-pager
    die "FastAPI service failed to start."
fi
echo "FastAPI service: running"

# ==========================================================
# 11. Nginx — auto-detect API routes and generate config
# ==========================================================
log "11. Configuring Nginx (auto-detecting API routes)"

# Wait for backend to be ready, then introspect routes
OPENAPI=""
for i in $(seq 1 15); do
    OPENAPI=$(curl -sf --max-time 3 "http://127.0.0.1:${BACKEND_PORT}/openapi.json" || true)
    [ -n "$OPENAPI" ] && break
    sleep 1
done

BACKEND_PREFIXES=""
if [ -n "$OPENAPI" ]; then
    BACKEND_PREFIXES=$(printf '%s' "$OPENAPI" | python3 -c "
import json, sys
try:
    spec = json.load(sys.stdin)
    prefixes = set()
    for p in spec.get('paths', {}).keys():
        parts = [x for x in p.split('/') if x]
        if parts:
            prefixes.add('/' + parts[0])
    for p in sorted(prefixes):
        print(p)
except Exception:
    pass
")
fi

if [ -n "$BACKEND_PREFIXES" ]; then
    echo "Detected backend route prefixes:"
    echo "$BACKEND_PREFIXES" | sed 's/^/  /'
else
    warn "Could not introspect backend routes (openapi.json unavailable)."
    BACKEND_PREFIXES="/api"
fi

# Detect what prefix the frontend uses
FRONTEND_PREFIX=""
if [ -d "$FRONTEND/src" ]; then
    for cand in /api /v1 /v2 /backend; do
        if grep -rqE "[\"'\`]${cand}/" "$FRONTEND/src" 2>/dev/null; then
            FRONTEND_PREFIX="$cand"
            break
        fi
    done
fi
[ -n "$FRONTEND_PREFIX" ] && echo "Frontend calls API prefix: $FRONTEND_PREFIX"

# Build location blocks
NGINX_LOCATIONS=""

# 1) Docs / openapi passthrough (for debugging)
for dp in /docs /redoc /openapi.json; do
    NGINX_LOCATIONS="${NGINX_LOCATIONS}
    location = ${dp} {
        proxy_pass http://127.0.0.1:${BACKEND_PORT}${dp};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }
"
done

# 2) One location per backend route prefix (passthrough)
while IFS= read -r prefix; do
    [ -z "$prefix" ] && continue
    NGINX_LOCATIONS="${NGINX_LOCATIONS}
    location ${prefix}/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT}${prefix}/;
        proxy_http_version 1.1;
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
"
done <<< "$BACKEND_PREFIXES"

# 3) If frontend uses a prefix the backend doesn't have, strip it
if [ -n "$FRONTEND_PREFIX" ]; then
    if ! echo "$BACKEND_PREFIXES" | grep -qx "$FRONTEND_PREFIX"; then
        NGINX_LOCATIONS="${NGINX_LOCATIONS}
    location ${FRONTEND_PREFIX}/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT}/;
        proxy_http_version 1.1;
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
"
    fi
fi

# Write config: head + dynamic locations + tail
sudo tee /etc/nginx/sites-available/exam-engine > /dev/null <<'NGINX_HEAD'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /var/www/exam-engine;
    index index.html;
NGINX_HEAD

printf '%s\n' "$NGINX_LOCATIONS" | sudo tee -a /etc/nginx/sites-available/exam-engine > /dev/null

sudo tee -a /etc/nginx/sites-available/exam-engine > /dev/null <<'NGINX_TAIL'

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX_TAIL

sudo ln -sf /etc/nginx/sites-available/exam-engine /etc/nginx/sites-enabled/exam-engine
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t || die "Nginx config invalid"
sudo systemctl reload nginx
systemctl is-active --quiet nginx || die "Nginx not running"

# ==========================================================
# 12. Open port 80 (best-effort, never aborts)
# ==========================================================
log "12. Ensuring port 80 is reachable"

SG_STATUS="unknown"
SG_HINT=""

open_sg_80() {
    command -v aws >/dev/null 2>&1 || { SG_STATUS="no-awscli"; return; }

    local token
    token=$(curl -sf -X PUT --max-time 2 \
        -H "X-aws-ec2-metadata-token-ttl-seconds: 60" \
        "http://169.254.169.254/latest/api/token" 2>/dev/null || true)
    if [ -z "$token" ]; then
        SG_STATUS="not-on-ec2"
        return
    fi

    local iid region
    iid=$(curl -sf --max-time 2 -H "X-aws-ec2-metadata-token: $token" \
        "http://169.254.169.254/latest/meta-data/instance-id" 2>/dev/null || true)
    region=$(curl -sf --max-time 2 -H "X-aws-ec2-metadata-token: $token" \
        "http://169.254.169.254/latest/meta-data/placement/region" 2>/dev/null || true)
    if [ -z "$iid" ] || [ -z "$region" ]; then
        SG_STATUS="imds-error"
        return
    fi

    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        SG_STATUS="no-credentials"
        SG_HINT="iid=$iid region=$region"
        return
    fi

    local sgs
    sgs=$(aws ec2 describe-instances --instance-ids "$iid" --region "$region" \
        --query 'Reservations[0].Instances[0].SecurityGroups[*].GroupId' \
        --output text 2>/dev/null || true)
    if [ -z "$sgs" ]; then
        SG_STATUS="describe-failed"
        SG_HINT="iid=$iid region=$region"
        return
    fi

    local sg state
    for sg in $sgs; do
        state=$(aws ec2 describe-security-groups --region "$region" --group-ids "$sg" \
            --query "SecurityGroups[0].IpPermissions[?FromPort==\`80\` && ToPort==\`80\`].IpRanges[].CidrIp" \
            --output text 2>/dev/null || true)
        if echo "$state" | grep -q "0.0.0.0/0"; then
            echo "Port 80 already open on $sg"
            SG_STATUS="already-open"
            return
        fi
    done

    # Not open anywhere — open on the first SG
    sg=$(echo "$sgs" | awk '{print $1}')
    if aws ec2 authorize-security-group-ingress --region "$region" \
        --group-id "$sg" --protocol tcp --port 80 --cidr 0.0.0.0/0 \
        >/dev/null 2>&1; then
        echo "Opened port 80 on $sg"
        SG_STATUS="opened"
    else
        SG_STATUS="authorize-failed"
        SG_HINT="iid=$iid region=$region sg=$sg"
    fi
}

open_sg_80

case "$SG_STATUS" in
    already-open|opened)
        echo "Security group: port 80 is open."
        ;;
    not-on-ec2)
        warn "Not on EC2; ensure port 80 is open in your network firewall."
        ;;
    no-awscli)
        warn "AWS CLI not installed; open port 80 in the security group manually."
        ;;
    no-credentials)
        warn "No AWS credentials on this instance (no IAM role, no ~/.aws/)."
        echo "From your laptop, run:"
        echo "  aws ec2 authorize-security-group-ingress --region <REGION> --group-id <SG-ID> --protocol tcp --port 80 --cidr 0.0.0.0/0"
        echo "  (find SG-ID: aws ec2 describe-instances --instance-ids <IID> --region <REGION> --query 'Reservations[0].Instances[0].SecurityGroups[*].GroupId')"
        echo "  hint: $SG_HINT"
        ;;
    authorize-failed|describe-failed)
        warn "Could not auto-open port 80 (IAM permission or SG rule conflict)."
        echo "  hint: $SG_HINT"
        echo "  open port 80 in the AWS console, or grant ec2:AuthorizeSecurityGroupIngress to the instance role."
        ;;
    imds-error)
        warn "Could not read EC2 metadata; open port 80 manually if needed."
        ;;
    *)
        warn "Security group: state unknown; open port 80 manually if the site is unreachable."
        ;;
esac

# ==========================================================
# 13. Final verification
# ==========================================================
log "13. Final verification"

if curl -sf --max-time 5 "http://127.0.0.1:${BACKEND_PORT}/docs" -o /dev/null; then
    echo "Backend (localhost): OK"
else
    warn "Backend /docs not reachable on 127.0.0.1:${BACKEND_PORT}."
fi

if curl -sf --max-time 5 "http://127.0.0.1/" -o /dev/null; then
    echo "Frontend via Nginx: OK"
else
    warn "Frontend not reachable via Nginx on 127.0.0.1:80."
fi

IMDS_TOKEN=$(curl -sf -X PUT --max-time 2 \
    -H "X-aws-ec2-metadata-token-ttl-seconds: 60" \
    "http://169.254.169.254/latest/api/token" 2>/dev/null || true)
if [ -n "$IMDS_TOKEN" ]; then
    PUBLIC_IP=$(curl -sf --max-time 2 -H "X-aws-ec2-metadata-token: $IMDS_TOKEN" \
        "http://169.254.169.254/latest/meta-data/public-ipv4" 2>/dev/null || true)
    if [ -n "$PUBLIC_IP" ]; then
        echo "Public URL: http://${PUBLIC_IP}/"
        CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://${PUBLIC_IP}/" || echo "timeout")
        echo "  http://${PUBLIC_IP}/ -> HTTP ${CODE}"
        [ "$CODE" = "200" ] || warn "Public URL did not return 200. This means the security group is still blocking port 80."
    fi
fi

log "Deployment complete"
echo "Backend:  http://127.0.0.1:${BACKEND_PORT}/docs"
echo "Frontend: http://<public-ip>/"
echo "DB path:  $DB_MOUNT"
echo "Nginx:    /etc/nginx/sites-available/exam-engine"