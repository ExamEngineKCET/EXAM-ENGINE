
#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT="$HOME/EXAM-ENGINE"
BACKEND="$PROJECT/Backend"
FRONTEND="$PROJECT/Figma Frontend"
DB_MOUNT="/mnt/exam-engine-db"

echo "======================================"
echo "       EXAM ENGINE DEPLOYMENT CHECK"
echo "======================================"

echo
echo "1. Checking EBS database volume..."
if mountpoint -q "$DB_MOUNT"; then
    echo "OK: $DB_MOUNT is mounted."
    df -h "$DB_MOUNT"
else
    echo "ERROR: Database volume is NOT mounted."
    echo "Stopping to protect database data."
    exit 1
fi

echo
echo "2. Checking backend environment..."
cd "$BACKEND"

if [[ ! -d venv ]]; then
    echo "ERROR: Backend virtual environment missing."
    exit 1
fi

source venv/bin/activate

echo
echo "3. Checking database configuration..."
grep -RniE 'DATABASE_URL|create_all|sqlite|SQLALCHEMY_DATABASE_URL' \
    app --include='*.py' --exclude-dir=__pycache__ || true

echo
echo "4. Checking SQLite files on EBS..."
find "$DB_MOUNT" -maxdepth 3 -type f \
    \( -name '*.db' -o -name '*.sqlite' -o -name '*.sqlite3' \) \
    -printf '%p (%s bytes)\n'

echo
echo "5. Checking database initialization code..."
grep -RniE 'create_all|Base.metadata|init_db|seed' \
    app --include='*.py' --exclude-dir=__pycache__ || true

echo
echo "6. Checking frontend build..."
cd "$FRONTEND"

if [[ ! -d node_modules ]]; then
    npm ci
fi

npm run build

echo
echo "7. Checking Nginx..."
sudo nginx -t

echo
echo "======================================"
echo "DIAGNOSTIC COMPLETE"
echo "======================================"
echo "No database files were modified."
