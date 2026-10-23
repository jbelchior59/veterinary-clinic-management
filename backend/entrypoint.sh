#!/bin/sh
set -e

echo "==> Running Prisma migrations..."
mkdir -p /app/data
if [ ! -f /app/data/dev.db ]; then
  FRESH_DATABASE=1
else
  FRESH_DATABASE=0
fi

npx prisma migrate deploy

if [ "$FRESH_DATABASE" = "1" ]; then
  echo "==> Fresh database detected — seeding..."
  npx prisma db seed
else
  echo "==> Database already exists — skipping seed."
fi

echo "==> Starting application..."
exec node dist/src/main.js
