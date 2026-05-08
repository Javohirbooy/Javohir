#!/bin/sh
set -e
cd /app

if [ "$NODE_ENV" = "production" ]; then
  node /app/scripts/check-env.mjs
fi

if [ "${SKIP_DB_MIGRATE:-}" != "1" ]; then
  ./node_modules/.bin/prisma migrate deploy
fi

exec ./node_modules/.bin/next start "$@"
