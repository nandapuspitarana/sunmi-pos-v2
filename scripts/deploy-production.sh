#!/bin/bash

# Script untuk men-deploy aplikasi Sunmi POS dalam mode production

# Pastikan file .env.production ada
if [ ! -f ".env.production" ]; then
  echo "Error: File .env.production tidak ditemukan!"
  echo "Silakan buat file .env.production berdasarkan .env.production.example"
  exit 1
fi

# Export variabel lingkungan dari .env.production
export $(grep -v '^#' .env.production | xargs)

# Build dan jalankan container
echo "Memulai deployment production..."
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

echo "Deployment selesai! Aplikasi berjalan di http://localhost"