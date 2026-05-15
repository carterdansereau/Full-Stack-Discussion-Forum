#!/bin/sh
set -eu

mkdir -p /app/data
mkdir -p /app/uploads

npx prisma migrate deploy
npm run db:seed
npm start
