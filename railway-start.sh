#!/bin/sh
set -eu

: "${PORT:=8090}"

mkdir -p "$PB_DATA_DIR"

/app/pocketbase migrate \
  --dir="$PB_DATA_DIR" \
  --migrationsDir="$PB_MIGRATIONS_DIR"

if [ -n "${PB_ADMIN_EMAIL:-}" ] && [ -n "${PB_ADMIN_PASSWORD:-}" ]; then
  /app/pocketbase superuser upsert \
    "$PB_ADMIN_EMAIL" \
    "$PB_ADMIN_PASSWORD" \
    --dir="$PB_DATA_DIR"
fi

exec /app/pocketbase serve \
  --http="0.0.0.0:${PORT}" \
  --dir="$PB_DATA_DIR" \
  --migrationsDir="$PB_MIGRATIONS_DIR"
