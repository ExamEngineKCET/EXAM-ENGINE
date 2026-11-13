#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT="$HOME/EXAM-ENGINE"
BACKEND="$PROJECT/Backend"
FRONTEND="$PROJECT/Figma Frontend"
VENV="$BACKEND/venv"
DB_MOUNT="/mnt/exam-engine-db"
FALLBACK_DB_DIR="$HOME/exam-engine-db"
BACKEND_PORT=8000

BACKUP_VAULT="exam-engine-vault"
BACKUP_PLAN_NAME="exam-engine-daily"
BACKUP_SELECTION_NAME="exam-engine-db-volume"
BACKUP_RETENTION_DAYS=35

SYSTEMD_MOUNT_LINE=""

log()  { printf '\n=== %s ===\n' "$*"; }
info() { printf '  %s\n' "$*"; }
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
    nginx curl ca-certificates gnupg lsb-release \
    unzip psmisc iproute2

if ! command -v aws >/dev/null 2>&1; then
    info "AWS CLI not found. Installing AWS CLI v2 from official source..."
    curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip"
    unzip -q "/tmp/awscliv2.zip" -d "/tmp"
    sudo /tmp/aws/install
    rm -rf /tmp/aws /tmp/awscliv2.zip
fi
info "aws: $(aws --version 2>&1 | head -1)"

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
    info "Installing Node.js 20 via NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
fi
command -v node >/dev/null 2>&1 || die "Node.js installation failed"
NODE_MAJOR=$(node -p "Number(process.versions.node.split('.')[0])")
(( NODE_MAJOR >= 20 )) || die "Node.js 20+ required, got $(node --version)"
info "Node.js: $(node --version)  npm: $(npm --version)"

# ==========================================================
# 3. Database volume (auto-setup)
# ==========================================================
log "3. Ensuring database volume"

ROOT_SRC=$(findmnt -n -o SOURCE / 2>/dev/null || true)
ROOT_DISK=$(lsblk -no PKNAME "$ROOT_SRC" 2>/dev/null | head -n1 || true)
if [ -z "$ROOT_DISK" ] && [ -e "$ROOT_SRC" ]; then
    ROOT_DISK=$(basename "$(readlink -f "$ROOT_SRC")" | sed -E 's/p?[0-9]+$//')
fi
info "Root disk: ${ROOT_DISK:-unknown} ($ROOT_SRC)"

ensure_db_mount() {
    if mountpoint -q "$DB_MOUNT"; then
        info "$DB_MOUNT already mounted."
        sudo chown ubuntu:ubuntu "$DB_MOUNT" 2>/dev/null || true
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
        warn "No unattached EBS volume found. Falling back to $FALLBACK_DB_DIR (not preserved across instance replacement)."
        DB_MOUNT="$FALLBACK_DB_DIR"
        mkdir -p "$DB_MOUNT"; chmod 700 "$DB_MOUNT"
        SYSTEMD_MOUNT_LINE=""
        return 0
    fi

    info "Candidate volume: $CANDIDATE (fs='${FS:-none}')"
    if [ -z "$FS" ]; then
        info "Formatting $CANDIDATE as ext4..."
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
    info "Mounted $CANDIDATE at $DB_MOUNT."

    local UUID
    UUID=$(sudo blkid -s UUID -o value "$CANDIDATE" 2>/dev/null || true)
    if [ -n "$UUID" ]; then
        if ! grep -qE "[[:space:]]${DB_MOUNT}[[:space:]]" /etc/fstab; then
            echo "UUID=$UUID  $DB_MOUNT  $FS  defaults,nofail  0  2" | sudo tee -a /etc/fstab >/dev/null
            info "Added fstab entry (UUID=$UUID)."
        fi
    else
        warn "Could not read UUID; skipping fstab update."
    fi
    SYSTEMD_MOUNT_LINE="RequiresMountsFor=$DB_MOUNT"
}

ensure_db_mount
df -h "$DB_MOUNT" || true

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
        && info "Alembic migrations applied." \
        || warn "Alembic upgrade failed; check migrations manually."
elif [ -f "$BACKEND/app/database.py" ]; then
    DATABASE_DIR="$DB_MOUNT" "$VENV/bin/python" -c \
        "from app.database import Base, engine; Base.metadata.create_all(engine)" \
        && info "create_all() complete." \
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
info "FastAPI service: running"

# ==========================================================
# 11. Nginx — auto-detect API routes
# ==========================================================
log "11. Configuring Nginx (auto-detecting API routes)"

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
    info "Detected backend route prefixes:"
    echo "$BACKEND_PREFIXES" | sed 's/^/    /'
else
    warn "Could not introspect backend routes; defaulting to /api."
    BACKEND_PREFIXES="/api"
fi

FRONTEND_PREFIX=""
if [ -d "$FRONTEND/src" ]; then
    for cand in /api /v1 /v2 /backend; do
        if grep -rqE "[\"'\`]${cand}/" "$FRONTEND/src" 2>/dev/null; then
            FRONTEND_PREFIX="$cand"
            break
        fi
    done
fi
[ -n "$FRONTEND_PREFIX" ] && info "Frontend calls API prefix: $FRONTEND_PREFIX"

NGINX_LOCATIONS=""
for dp in /docs /redoc /openapi.json; do
    NGINX_LOCATIONS="${NGINX_LOCATIONS}
    location = ${dp} {
        proxy_pass http://127.0.0.1:${BACKEND_PORT}${dp};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }
"
done

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

sudo systemctl enable nginx >/dev/null 2>&1
if systemctl is-active --quiet nginx; then
    sudo systemctl reload nginx
else
    info "nginx was not running; starting it."
    sudo systemctl start nginx
fi

sleep 1
if ! systemctl is-active --quiet nginx; then
    sudo journalctl -u nginx -n 40 --no-pager
    die "Nginx failed to start"
fi
info "Nginx: running"

# ==========================================================
# 12. CloudWatch agent (logs + metrics)
# ==========================================================
log "12. CloudWatch agent"

IAM_OK=0
if command -v aws >/dev/null 2>&1 && aws sts get-caller-identity >/dev/null 2>&1; then
    IAM_OK=1
    info "Instance role: $(aws sts get-caller-identity --query Arn --output text)"
else
    warn "No IAM role / credentials on this instance."
    warn "CloudWatch agent will install but fail to ship logs."
    warn "Attach CloudWatchAgentServerPolicy to the instance role, then re-run."
fi

if [ ! -f /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl ]; then
    info "Installing CloudWatch agent..."
    CW_DEB=/tmp/amazon-cloudwatch-agent.deb
    curl -fsSL "https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb" -o "$CW_DEB" \
        || die "CloudWatch agent download failed"
    sudo dpkg -i -E "$CW_DEB"
    rm -f "$CW_DEB"
else
    info "CloudWatch agent already installed."
fi

sudo mkdir -p /opt/aws/amazon-cloudwatch-agent/bin
sudo tee /opt/aws/amazon-cloudwatch-agent/bin/config.json > /dev/null <<'CW_CONFIG'
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "root"
  },
  "metrics": {
    "namespace": "ExamEngine/EC2",
    "append_dimensions": {
      "InstanceId": "${aws:InstanceId}"
    },
    "metrics_collected": {
      "mem": {
        "measurement": ["mem_used_percent", "mem_available"]
      },
      "disk": {
        "measurement": ["used_percent", "inodes_free"],
        "resources": ["/", "/mnt/exam-engine-db"]
      },
      "swap": {
        "measurement": ["swap_used_percent"]
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/nginx/access.log",
            "log_group_name": "/exam-engine/nginx-access",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 14
          },
          {
            "file_path": "/var/log/nginx/error.log",
            "log_group_name": "/exam-engine/nginx-error",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 14
          },
          {
            "file_path": "/var/log/syslog",
            "log_group_name": "/exam-engine/syslog",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 14
          }
        ]
      },
      "journald": {
        "collect_list": [
          {
            "units": ["exam-engine"],
            "log_group_name": "/exam-engine/backend",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 14
          }
        ]
      }
    }
  }
}
CW_CONFIG

sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config -m ec2 \
    -c file:/opt/aws/amazon-cloudwatch-agent/bin/config.json -s >/dev/null
sudo systemctl enable amazon-cloudwatch-agent >/dev/null 2>&1
sudo systemctl restart amazon-cloudwatch-agent

if systemctl is-active --quiet amazon-cloudwatch-agent; then
    info "CloudWatch agent: running"
    if (( IAM_OK == 1 )); then
        info "Logs will ship to: /exam-engine/{backend,nginx-access,nginx-error,syslog}"
    fi
else
    warn "CloudWatch agent is not running."
    warn "Check: sudo journalctl -u amazon-cloudwatch-agent -n 40 --no-pager"
fi

# ==========================================================
# 13. AWS Backup (best-effort, non-fatal)
# ==========================================================
log "13. AWS Backup (EBS snapshots)"

if (( IAM_OK == 0 )); then
    warn "Skipping AWS Backup: no IAM role / credentials on this instance."
    warn "Create the backup plan from a privileged context (your laptop or console)."
    warn "The instance role would need backup:*, iam:PassRole, ec2:DescribeVolumes."
else
    # Gather instance identity
    IMDS_TOKEN=$(curl -sf -X PUT --max-time 2 \
        -H "X-aws-ec2-metadata-token-ttl-seconds: 60" \
        "http://169.254.169.254/latest/api/token" 2>/dev/null || true)
    INSTANCE_ID=""
    REGION=""
    if [ -n "$IMDS_TOKEN" ]; then
        INSTANCE_ID=$(curl -sf --max-time 2 -H "X-aws-ec2-metadata-token: $IMDS_TOKEN" \
            "http://169.254.169.254/latest/meta-data/instance-id" 2>/dev/null || true)
        REGION=$(curl -sf --max-time 2 -H "X-aws-ec2-metadata-token: $IMDS_TOKEN" \
            "http://169.254.169.254/latest/meta-data/placement/region" 2>/dev/null || true)
    fi
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || true)

    if [ -z "$INSTANCE_ID" ] || [ -z "$REGION" ] || [ -z "$ACCOUNT_ID" ]; then
        warn "Could not determine instance-id / region / account; skipping AWS Backup."
    else
        info "Instance: $INSTANCE_ID  Region: $REGION  Account: $ACCOUNT_ID"

        # 13a. Vault
        VAULT_EXISTS=$(aws backup list-backup-vaults --region "$REGION" --query "BackupVaultList[?BackupVaultName=='$BACKUP_VAULT'].BackupVaultName" --output text 2>/dev/null || true)
        if [ -n "$VAULT_EXISTS" ]; then
            info "Vault '$BACKUP_VAULT' exists."
        else
            if aws backup create-backup-vault --backup-vault-name "$BACKUP_VAULT" --region "$REGION" >/dev/null 2>&1; then
                info "Vault '$BACKUP_VAULT' created."
            else
                warn "Could not create vault '$BACKUP_VAULT'."
            fi
        fi

        # 13b. Plan
        PLAN_ID=$(aws backup list-backup-plans --region "$REGION" \
            --query "BackupPlansList[?BackupPlanName=='$BACKUP_PLAN_NAME'].BackupPlanId" \
            --output text 2>/dev/null || true)

        if [ -z "$PLAN_ID" ]; then
            PLAN_JSON=$(cat <<PLAN_EOF
{
  "BackupPlanName": "$BACKUP_PLAN_NAME",
  "Rules": [{
    "RuleName": "DailySnapshot",
    "TargetBackupVaultName": "$BACKUP_VAULT",
    "ScheduleExpression": "cron(0 3 ? * * *)",
    "StartWindowMinutes": 60,
    "CompletionWindowMinutes": 180,
    "Lifecycle": {"DeleteAfterDays": $BACKUP_RETENTION_DAYS}
  }]
}
PLAN_EOF
)
            PLAN_ID=$(aws backup create-backup-plan --region "$REGION" \
                --backup-plan "$PLAN_JSON" --query 'BackupPlanId' --output text 2>/dev/null || true)
            [ -n "$PLAN_ID" ] && info "Backup plan '$BACKUP_PLAN_NAME' created ($PLAN_ID)." \
                || warn "Could not create backup plan '$BACKUP_PLAN_NAME'."
        else
            info "Backup plan '$BACKUP_PLAN_NAME' exists ($PLAN_ID)."
        fi

        # 13c. Selection (targets non-root EBS volumes on this instance)
        if [ -n "$PLAN_ID" ]; then
            ROOT_DEV=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" \
                --region "$REGION" \
                --query 'Reservations[0].Instances[0].RootDeviceName' \
                --output text 2>/dev/null || true)

            VOL_IDS=$(aws ec2 describe-volumes \
                --filters "Name=attachment.instance-id,Values=$INSTANCE_ID" \
                --region "$REGION" \
                --query "Volumes[?Attachments[0].Device!='$ROOT_DEV'].VolumeId" \
                --output text 2>/dev/null || true)

            if [ -z "$VOL_IDS" ]; then
                warn "No non-root EBS volumes found on $INSTANCE_ID; skipping backup selection."
            else
                EXISTING_SEL=$(aws backup list-backup-selections \
                    --backup-plan-id "$PLAN_ID" --region "$REGION" \
                    --query "BackupSelectionsList[?SelectionName=='$BACKUP_SELECTION_NAME'].SelectionId" \
                    --output text 2>/dev/null || true)

                if [ -n "$EXISTING_SEL" ]; then
                    info "Backup selection '$BACKUP_SELECTION_NAME' exists ($EXISTING_SEL)."
                else
                    RESOURCES=""
                    for v in $VOL_IDS; do
                        RESOURCES="$RESOURCES\"arn:aws:ec2:$REGION:$ACCOUNT_ID:volume/$v\","
                    done
                    RESOURCES="${RESOURCES%,}"

                    SERVICE_ROLE="arn:aws:iam::$ACCOUNT_ID:role/service-role/AWSBackupDefaultServiceRole"
                    SEL_JSON=$(cat <<SEL_EOF
{
  "SelectionName": "$BACKUP_SELECTION_NAME",
  "IamRoleArn": "$SERVICE_ROLE",
  "Resources": [$RESOURCES]
}
SEL_EOF
)
                    if aws backup create-backup-selection --region "$REGION" \
                            --backup-plan-id "$PLAN_ID" \
                            --backup-selection "$SEL_JSON" >/dev/null 2>&1; then
                        info "Backup selection '$BACKUP_SELECTION_NAME' created for: $VOL_IDS"
                    else
                        warn "Could not create backup selection."
                        warn "Likely cause: AWSBackupDefaultServiceRole missing, or IAM lacks iam:PassRole / backup:CreateBackupSelection."
                        warn "Fix from console: AWS Backup -> create the default service role, then add selection manually."
                    fi
                fi
            fi
        fi
    fi
fi

# ==========================================================
# 14. Open port 80 (best-effort, never aborts)
# ==========================================================
log "14. Ensuring port 80 is reachable"

SG_STATUS="unknown"
SG_HINT=""

open_sg_80() {
    command -v aws >/dev/null 2>&1 || { SG_STATUS="no-awscli"; return; }
    local token
    token=$(curl -sf -X PUT --max-time 2 \
        -H "X-aws-ec2-metadata-token-ttl-seconds: 60" \
        "http://169.254.169.254/latest/api/token" 2>/dev/null || true)
    [ -n "$token" ] || { SG_STATUS="not-on-ec2"; return; }

    local iid region
    iid=$(curl -sf --max-time 2 -H "X-aws-ec2-metadata-token: $token" \
        "http://169.254.169.254/latest/meta-data/instance-id" 2>/dev/null || true)
    region=$(curl -sf --max-time 2 -H "X-aws-ec2-metadata-token: $token" \
        "http://169.254.169.254/latest/meta-data/placement/region" 2>/dev/null || true)
    [ -n "$iid" ] && [ -n "$region" ] || { SG_STATUS="imds-error"; return; }

    aws sts get-caller-identity >/dev/null 2>&1 \
        || { SG_STATUS="no-credentials"; SG_HINT="iid=$iid region=$region"; return; }

    local sgs
    sgs=$(aws ec2 describe-instances --instance-ids "$iid" --region "$region" \
        --query 'Reservations[0].Instances[0].SecurityGroups[*].GroupId' \
        --output text 2>/dev/null || true)
    [ -n "$sgs" ] || { SG_STATUS="describe-failed"; SG_HINT="iid=$iid region=$region"; return; }

    local sg
    sg=$(echo "$sgs" | awk '{print $1}')
    
    # Just try to open it. If it's already open, AWS throws an error which we suppress.
    if aws ec2 authorize-security-group-ingress --region "$region" \
        --group-id "$sg" --protocol tcp --port 80 --cidr 0.0.0.0/0 \
        >/dev/null 2>&1; then
        info "Opened port 80 on $sg"
        SG_STATUS="opened"
    else
        # If it failed, it's likely already open or we have an SG conflict.
        info "Port 80 on $sg is already open (or skipped)."
        SG_STATUS="already-open"
    fi
}

open_sg_80

case "$SG_STATUS" in
    already-open|opened) info "Security group: port 80 is open." ;;
    not-on-ec2) warn "Not on EC2; ensure port 80 is open in your network firewall." ;;
    no-awscli)  warn "AWS CLI not installed; open port 80 manually." ;;
    no-credentials)
        warn "No AWS credentials on this instance."
        echo "  From your laptop: aws ec2 authorize-security-group-ingress --region <REGION> --group-id <SG-ID> --protocol tcp --port 80 --cidr 0.0.0.0/0"
        echo "  hint: $SG_HINT"
        ;;
    authorize-failed|describe-failed)
        warn "Could not auto-open port 80 (IAM permission or SG conflict)."
        echo "  hint: $SG_HINT"
        ;;
    imds-error) warn "Could not read EC2 metadata; open port 80 manually if needed." ;;
    *)          warn "Security group state unknown; open port 80 manually if site is unreachable." ;;
esac

# ==========================================================
# 15. Final verification
# ==========================================================
log "15. Final verification"

curl -sf --max-time 5 "http://127.0.0.1:${BACKEND_PORT}/docs" -o /dev/null \
    && info "Backend (localhost): OK" \
    || warn "Backend /docs not reachable on 127.0.0.1:${BACKEND_PORT}."

curl -sf --max-time 5 "http://127.0.0.1/" -o /dev/null \
    && info "Frontend via Nginx: OK" \
    || warn "Frontend not reachable via Nginx on 127.0.0.1:80."

if [ -n "${IMDS_TOKEN:-}" ]; then
    PUBLIC_IP=$(curl -sf --max-time 2 -H "X-aws-ec2-metadata-token: $IMDS_TOKEN" \
        "http://169.254.169.254/latest/meta-data/public-ipv4" 2>/dev/null || true)
    if [ -n "$PUBLIC_IP" ]; then
        CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://${PUBLIC_IP}/" || echo "timeout")
        info "Public URL: http://${PUBLIC_IP}/ -> HTTP ${CODE}"
        [ "$CODE" = "200" ] || warn "Public URL did not return 200 (SG still blocking port 80?)."
    fi
fi

log "Deployment complete"
echo "  Backend:    http://127.0.0.1:${BACKEND_PORT}/docs"
echo "  Frontend:   http://<public-ip>/"
echo "  DB path:    $DB_MOUNT"
echo "  Nginx:      /etc/nginx/sites-available/exam-engine"
echo "  CloudWatch: /exam-engine/{backend,nginx-access,nginx-error,syslog}"
echo "  Backup:     plan '$BACKUP_PLAN_NAME' -> vault '$BACKUP_VAULT' (daily 03:00 UTC, ${BACKUP_RETENTION_DAYS}d retention)"