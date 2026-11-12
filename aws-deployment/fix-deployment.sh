#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT="$HOME/EXAM-ENGINE"
BACKEND="$PROJECT/Backend"
FRONTEND="$PROJECT/Figma Frontend"
DB_MOUNT="/mnt/exam-engine-db"
VENV="$BACKEND/venv"

echo "======================================"
echo "       EXAM ENGINE DEPLOYMENT"
echo "======================================"

# 1. Check project directories
echo
echo "1. Checking project directories..."

for DIR in "$BACKEND" "$FRONTEND"; do
    if [[ ! -d "$DIR" ]]; then
        echo "ERROR: Missing directory: $DIR"
        exit 1
    fi
done

# 2. Install system dependencies
echo
echo "2. Installing system dependencies..."

sudo apt-get update
sudo apt-get install -y 
    python3 
    python3-venv 
    python3-pip 
    build-essential 
    nginx

# 3. Verify database volume
echo
echo "3. Checking EBS database volume..."

if mountpoint -q "$DB_MOUNT"; then
    echo "OK: Database volume is mounted."
    df -h "$DB_MOUNT"
else
    echo "ERROR: Database volume is NOT mounted."
    echo "Stopping to protect database data."
    exit 1
fi

# 4. Create Python virtual environment
echo
echo "4. Setting up Python virtual environment..."

if [[ ! -d "$VENV" ]]; then
    python3 -m venv "$VENV"
    echo "Created virtual environment."
else
    echo "Virtual environment already exists."
fi

# 5. Install backend requirements
echo
echo "5. Installing backend Python requirements..."

if [[ ! -f "$BACKEND/requirements.txt" ]]; then
    echo "ERROR: Backend/requirements.txt not found."
    exit 1
fi

"$VENV/bin/python" -m pip install --upgrade pip
"$VENV/bin/python" -m pip install -r "$BACKEND/requirements.txt"

# 6. Inspect database configuration
echo
echo "6. Checking database configuration..."

grep -RniE 'DATABASE_URL|create_all|sqlite|SQLALCHEMY_DATABASE_URL' 
    "$BACKEND/app" --include='*.py' --exclude-dir=__pycache__ || true

echo
echo "SQLite files on EBS:"

find "$DB_MOUNT" -maxdepth 3 -type f 
    \( -name '*.db' -o -name '*.sqlite' -o -name '*.sqlite3' \) 
    -printf '%p (%s bytes)\n'

# 7. Check Node.js
echo
echo "7. Checking Node.js..."

if ! command -v node >/dev/null 2>&1; then
    echo "ERROR: Node.js is not installed."
    echo "Install Node.js 22 before running this script again."
    exit 1
fi

NODE_MAJOR=$(node -p "Number(process.versions.node.split('.')[0])")

if (( NODE_MAJOR < 20 )); then
    echo "ERROR: Node.js 20 or newer is required."
    echo "Current version: $(node --version)"
    exit 1
fi

echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"

# 8. Install frontend dependencies
echo
echo "8. Installing frontend dependencies..."

cd "$FRONTEND"

if [[ ! -f package-lock.json ]]; then
    echo "ERROR: package-lock.json not found."
    exit 1
fi

npm ci

# 9. Build frontend
echo
echo "9. Building React frontend..."

npm run build

# 10. Copy frontend build
echo
echo "10. Deploying frontend files..."

sudo mkdir -p /var/www/exam-engine
sudo cp -r "$FRONTEND/dist/." /var/www/exam-engine/

# 11. Validate Nginx
echo
echo "11. Checking Nginx configuration..."

sudo nginx -t

echo
echo "======================================"
echo "       DEPLOYMENT CHECK COMPLETE"
echo "======================================"

echo "Python environment: Ready"
echo "Backend requirements: Installed"
echo "Frontend dependencies: Installed"
echo "Frontend build: Complete"
echo "Frontend files: Copied to /var/www/exam-engine"
echo "Nginx configuration: Validated"
echo "Database: Not modified"

echo
echo "NOTE: This script does not yet configure"
echo "the FastAPI systemd service or initialize"
echo "missing database tables."