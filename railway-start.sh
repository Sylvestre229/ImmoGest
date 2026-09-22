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

 /app/pocketbase serve \
  --http="0.0.0.0:${PORT}" \
  --dir="$PB_DATA_DIR" \
  --migrationsDir="$PB_MIGRATIONS_DIR" \
  --publicDir=/app/pb_public \
  --indexFallback &
server_pid=$!

until wget -q -O /dev/null "http://127.0.0.1:${PORT}/api/health"; do
  sleep 1
done

if [ -n "${PB_ADMIN_EMAIL:-}" ] && [ -n "${PB_ADMIN_PASSWORD:-}" ]; then
  auth_payload=$(printf '{"identity":"%s","password":"%s"}' "$PB_ADMIN_EMAIL" "$PB_ADMIN_PASSWORD")
  token=$(wget -q -O - \
    --header="Content-Type: application/json" \
    --post-data="$auth_payload" \
    "http://127.0.0.1:${PORT}/api/collections/_superusers/auth-with-password" \
    | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

  if [ -z "$token" ]; then
    echo "Impossible d'authentifier le super-administrateur PocketBase." >&2
    exit 1
  fi

  user_payload=$(printf '{"email":"%s","password":"%s","passwordConfirm":"%s","full_name":"Administrateur GestImmo","role":"admin","country":"BJ","language":"fr","active":true,"onboarding_done":true,"emailVisibility":true}' \
    "$PB_ADMIN_EMAIL" "$PB_ADMIN_PASSWORD" "$PB_ADMIN_PASSWORD")
  user_status=$(wget -q -O /tmp/user-create.json \
    --server-response \
    --header="Content-Type: application/json" \
    --header="Authorization: $token" \
    --post-data="$user_payload" \
    "http://127.0.0.1:${PORT}/api/collections/users/records" 2>&1 \
    | sed -n 's/.*HTTP\/[0-9.]* \([0-9]*\).*/\1/p' | tail -n 1)

  case "$user_status" in
    200|201|400)
      ;;
    *)
      echo "Impossible de créer l'utilisateur applicatif (HTTP ${user_status:-inconnu})." >&2
      cat /tmp/user-create.json >&2 || true
      exit 1
      ;;
  esac
fi

wait "$server_pid"
