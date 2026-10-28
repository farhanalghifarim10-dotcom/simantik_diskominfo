# =============================================================================
# SIMANTIK - Start Local Service Web (Vite, API Port 3001, 127.0.0.1:5174)
# =============================================================================

$ErrorActionPreference = "Stop"

Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host " SIMANTIK - Menjalankan Web Layanan (Mode Pengujian Lokal)" -ForegroundColor Cyan
Write-Host " URL Akses   : http://127.0.0.1:5174" -ForegroundColor Cyan
Write-Host " API Backend : http://127.0.0.1:3001/api/v1" -ForegroundColor Cyan
Write-Host " Supabase DB : Supabase Local (127.0.0.1:54321)" -ForegroundColor Cyan
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

# Fail-safe 1: Supabase Cloud / non-local rejection
if ($status.API_URL -ne "http://127.0.0.1:54321") {
    Write-Error "FAIL-SAFE ABORT: API_URL ('$($status.API_URL)') bukan Supabase lokal 127.0.0.1:54321! Startup dibatalkan demi keamanan."
    exit 1
}

Write-Host "[OK] Supabase lokal terverifikasi aktif pada $($status.API_URL)" -ForegroundColor Green

# 2. Set environment variables untuk Vite dev server Web Layanan
Write-Host "[2/3] Mengonfigurasi environment Web Layanan lokal..." -ForegroundColor Yellow

$apiBaseUrl = "http://127.0.0.1:3001/api/v1"

# Fail-safe 2: Validasi API Base URL wajib lokal
if ($apiBaseUrl -notmatch "^http://(127\.0\.0\.1|localhost):3001/api/v1$") {
    Write-Error "FAIL-SAFE ABORT: Target API ('$apiBaseUrl') bukan backend lokal port 3001! Startup dibatalkan."
    exit 1
}

# Hanya ambil publishable / anon key (TIDAK MENGGUNAKAN SERVICE ROLE KEY)
$clientKey = if ($status.PUBLISHABLE_KEY) { $status.PUBLISHABLE_KEY } else { $status.ANON_KEY }

$env:VITE_API_BASE_URL = $apiBaseUrl
$env:VITE_SUPABASE_URL = "http://127.0.0.1:54321"
$env:VITE_SUPABASE_PUBLISHABLE_KEY = $clientKey

Write-Host "[OK] VITE_API_BASE_URL : $apiBaseUrl" -ForegroundColor Green
Write-Host "[OK] VITE_SUPABASE_URL : http://127.0.0.1:54321" -ForegroundColor Green
Write-Host "[OK] Client Key        : [TERKONFIGURASI SECARA AMAN (PUBLISHABLE/ANON)]" -ForegroundColor Green
Write-Host "[OK] Service-Role Key  : [DIISOLASI - TIDAK DIGUNAKAN DI CLIENT]" -ForegroundColor Green

# 3. Jalankan Vite dev server Web Layanan dengan host 127.0.0.1 port 5174 dan strictPort
Write-Host "`n[3/3] Memulai Vite dev server untuk Web Layanan pada http://127.0.0.1:5174..." -ForegroundColor Cyan
Set-Location "d:\Projects\simantik\frontend\service-web"
npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
