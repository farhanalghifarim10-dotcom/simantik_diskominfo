# =============================================================================
# SIMANTIK - Start Local Admin Web (Vite, API Port 3001, Supabase Local 127.0.0.1:54321)
# =============================================================================

$ErrorActionPreference = "Stop"

Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host " SIMANTIK - Menjalankan Admin Web (Mode Pengujian Lokal)" -ForegroundColor Cyan
Write-Host " Target Auth : Supabase Local (127.0.0.1:54321)" -ForegroundColor Cyan
Write-Host " API Backend : http://localhost:3001/api/v1" -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan

# 1. Ekstraksi status Supabase lokal secara in-memory
Write-Host "[1/3] Memeriksa status Supabase lokal..." -ForegroundColor Yellow
$statusJson = npx supabase status -o json
if (-not $statusJson) {
    Write-Error "Gagal mendapatkan status Supabase lokal. Pastikan 'npx supabase start' aktif."
    exit 1
}

$statusStart = $statusJson.IndexOf('{')
if ($statusStart -lt 0) {
    Write-Error "Output Supabase status tidak valid."
    exit 1
}

$status = $statusJson.Substring($statusStart) | ConvertFrom-Json

# Fail-safe URL check
if ($status.API_URL -ne "http://127.0.0.1:54321") {
    Write-Error "FAIL-SAFE ABORT: API_URL ('$($status.API_URL)') bukan Supabase lokal 127.0.0.1:54321!"
    exit 1
}

Write-Host "[OK] Supabase lokal terdeteksi aktif pada $($status.API_URL)" -ForegroundColor Green

# 2. Set environment variables untuk Vite dev server
Write-Host "[2/3] Mengonfigurasi environment Admin Web lokal..." -ForegroundColor Yellow
$env:VITE_SUPABASE_URL = "http://127.0.0.1:54321"
$env:VITE_SUPABASE_PUBLISHABLE_KEY = if ($status.PUBLISHABLE_KEY) { $status.PUBLISHABLE_KEY } else { $status.ANON_KEY }
$env:VITE_API_BASE_URL = "http://localhost:3001/api/v1"

Write-Host "[OK] VITE_SUPABASE_URL: http://127.0.0.1:54321" -ForegroundColor Green
Write-Host "[OK] VITE_API_BASE_URL : http://localhost:3001/api/v1" -ForegroundColor Green
Write-Host "[OK] Publishable Key   : [TERKONFIGURASI SECARA AMAN]" -ForegroundColor Green

# 3. Jalankan Vite dev server
Write-Host "`n[3/3] Memulai Vite dev server untuk Admin Web..." -ForegroundColor Cyan
Set-Location "d:\Projects\simantik\frontend\admin-web"
npm run dev
