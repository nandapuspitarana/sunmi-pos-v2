# Script PowerShell untuk men-deploy aplikasi Sunmi POS dalam mode production di Windows

# Pastikan file .env.production ada
if (-not (Test-Path ".env.production")) {
  Write-Error "Error: File .env.production tidak ditemukan!"
  Write-Host "Silakan buat file .env.production berdasarkan .env.production.example"
  exit 1
}

# Memulai deployment
Write-Host "Memulai deployment production..."

# Menghentikan container yang sedang berjalan
docker-compose -f docker-compose.prod.yml down

# Build container
docker-compose -f docker-compose.prod.yml build --no-cache

# Jalankan container
docker-compose -f docker-compose.prod.yml up -d

Write-Host "Deployment selesai! Aplikasi berjalan di http://localhost"