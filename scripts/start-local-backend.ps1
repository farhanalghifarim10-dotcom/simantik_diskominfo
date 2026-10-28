# =============================================================================
# SIMANTIK - Start Local Backend (Port 3001, Supabase Local 127.0.0.1:54321)
# =============================================================================

$ErrorActionPreference = "Stop"

Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host " SIMANTIK - Menjalankan Backend API (Mode Pengujian Lokal)" -ForegroundColor Cyan
Write-Host " Target DB : Supabase Local (127.0.0.1:54321)" -ForegroundColor Cyan
Write-Host " Port API  : 3001" -ForegroundColor Cyan
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

# 2. Set environment variables untuk proses backend lokal
Write-Host "[2/3] Mengonfigurasi environment backend lokal..." -ForegroundColor Yellow
$env:REQUIRE_LOCAL_SUPABASE = "true"
$env:SUPABASE_URL = "http://127.0.0.1:54321"
$env:SUPABASE_SECRET_KEY = $status.SERVICE_ROLE_KEY
$env:PORT = "3001"
$env:CORS_ORIGINS = "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174"

# Generate JWT_SECRET acak kuat (32 bytes = 64 karakter hex) khusus sesi lokal jika belum diset
if ([string]::IsNullOrWhiteSpace($env:JWT_SECRET) -or $env:JWT_SECRET.Trim().Length -lt 32) {
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $bytes = New-Object byte[] 32
    $rng.GetBytes($bytes)
    $env:JWT_SECRET = -join ($bytes | ForEach-Object { "{0:x2}" -f $_ })
    Write-Host "[OK] JWT_SECRET: [DIBUAT OTOMATIS SECARA ACAK UNTUK SESI INI]" -ForegroundColor Green
} else {
    Write-Host "[OK] JWT_SECRET: [TERKONFIGURASI SECARA AMAN DARI ENV]" -ForegroundColor Green
}

Write-Host "[OK] Port API: 3001" -ForegroundColor Green
Write-Host "[OK] Fail-safe lokal: AKTIF (REQUIRE_LOCAL_SUPABASE=true)" -ForegroundColor Green
Write-Host "[OK] Service-role key: [TERKONFIGURASI SECARA AMAN]" -ForegroundColor Green

# 3. Jalankan backend
Write-Host "`n[3/3] Memulai NestJS backend dev server pada http://localhost:3001/api/v1..." -ForegroundColor Cyan
Set-Location "d:\Projects\simantik\backend\api"
npm run start:dev
