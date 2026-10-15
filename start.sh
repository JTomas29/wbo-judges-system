#!/usr/bin/env bash
# start.sh — Arranca WBO (backend + frontend) con un solo comando.
#
# Uso:
#   ./start.sh        Arranca los dos y deja esta terminal ocupada.
#                     Ctrl+C detiene backend y frontend.
#
# Requisitos: PostgreSQL activo, Node.js instalado.
# Si faltan dependencias (node_modules) las instala solo.

set -u
cd "$(dirname "$0")"

BACKEND_DIR="backend"
FRONTEND_DIR="frontend"

# 1) PostgreSQL tiene que estar escuchando (es un servicio del sistema).
if command -v pg_isready >/dev/null 2>&1; then
  if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    echo "PostgreSQL no responde. Intentando iniciarlo..."
    sudo systemctl start postgresql 2>/dev/null || true
    sleep 2
  fi
fi

# 2) Instalar dependencias la primera vez.
for dir in "$BACKEND_DIR" "$FRONTEND_DIR"; do
  if [ ! -d "$dir/node_modules" ]; then
    echo "Instalando dependencias en $dir (solo la primera vez)..."
    ( cd "$dir" && npm install ) || exit 1
  fi
done

# 2.5) Liberar los puertos del backend y frontend. Si quedó una instancia
# anterior (p. ej. al cerrar la terminal sin Ctrl+C), el nuevo backend crashea
# con EADDRINUSE y "no anda". Acá matamos lo que esté ocupando esos puertos.
free_port() {
  local port="$1"
  local pids=""
  if command -v fuser >/dev/null 2>&1; then
    pids="$(fuser -n tcp "$port" 2>/dev/null)"
  elif command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -ti tcp:"$port" 2>/dev/null)"
  fi
  if [ -n "$pids" ]; then
    echo "Puerto $port ocupado (PID:$pids). Liberando..."
    if command -v fuser >/dev/null 2>&1; then
      fuser -k -n tcp "$port" >/dev/null 2>&1 || true
    else
      kill $pids 2>/dev/null || true
    fi
    sleep 1
  fi
}

free_port 4000
free_port 5173

# 3) Al salir (Ctrl+C o cerrar), frenar ambos procesos.
cleanup() {
  echo ""
  echo "Deteniendo backend y frontend..."
  kill 0 2>/dev/null
}
trap cleanup INT TERM

echo "------------------------------------------------"
echo "  WBO arrancando..."
echo "  Backend:  http://localhost:4000"
echo "  Frontend: http://localhost:5173"
echo "  (Ctrl+C detiene ambos)"
echo "------------------------------------------------"

( cd "$BACKEND_DIR"  && npm run dev ) &
( cd "$FRONTEND_DIR" && npm run dev ) &

wait
