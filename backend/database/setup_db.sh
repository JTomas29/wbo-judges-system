#!/usr/bin/env bash
# ============================================================
# WBO - Script de instalación de base de datos PostgreSQL
# Uso (con sudo):
#   sudo bash database/setup_db.sh
# ============================================================
set -euo pipefail

DB_NAME="wbo_judges"
DB_USER="postgres"
DB_PASSWORD="postgres"
SCHEMA="database/schema.sql"
MIGRATIONS_DIR="database"

cd "$(dirname "$0")/.."

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql no está instalado. Corré: sudo apt install -y postgresql"
  exit 1
fi

echo "==> Comprobando que PostgreSQL esté corriendo..."
pg_isready -q || { echo "ERROR: PostgreSQL no está activo. Inicialo con: sudo systemctl start postgresql"; exit 1; }

echo "==> Configurando password del usuario '$DB_USER' a '$DB_PASSWORD'..."
run_psql() {
  # Correr psql como el usuario del sistema 'postgres' (autenticación peer)
  if [ "$(id -un)" = "postgres" ]; then
    psql "$@"
  else
    sudo -u postgres psql "$@"
  fi
}

run_psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" >/dev/null 2>&1 || true

echo "==> Creando base de datos '$DB_NAME' si no existe..."
run_psql -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
  run_psql -c "CREATE DATABASE $DB_NAME;"

echo "==> Aplicando schema.sql..."
run_psql -d "$DB_NAME" -f "$SCHEMA"

echo "==> Aplicando migrations en orden..."
for f in "$MIGRATIONS_DIR"/migration_*.sql; do
  [ -e "$f" ] || continue
  echo "    -> $(basename "$f")"
  run_psql -d "$DB_NAME" -f "$f"
done

# Migración extra en subcarpeta migrations/
for f in "$MIGRATIONS_DIR"/migrations/*.sql; do
  [ -e "$f" ] || continue
  echo "    -> $(basename "$f")"
  run_psql -d "$DB_NAME" -f "$f"
done

echo ""
echo "============================================================"
echo " Base de datos '$DB_NAME' lista."
echo " Host localhost:5432, usuario: $DB_USER, password: $DB_PASSWORD"
echo " Recordá crear el backend/.env (mirá .env.example)"
echo " y luego correr el seed:  node src/seed.js"
echo "============================================================"
