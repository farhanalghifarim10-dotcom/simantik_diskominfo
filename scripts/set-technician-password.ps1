# =============================================================================
# SIMANTIK - Set Technician Password Only (Interactive Secure Prompt)
# Target: Supabase Local (127.0.0.1:54321)
# Akun  : tenagaahli.local@simantik.test (Tenaga Ahli)
# =============================================================================

$ErrorActionPreference = "Stop"

Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host " SIMANTIK - Pembaruan Password Akun Tenaga Ahli Lokal" -ForegroundColor Cyan
Write-Host " Target Akun : tenagaahli.local@simantik.test" -ForegroundColor Cyan
Write-Host " Target DB   : Supabase Local (127.0.0.1:54321)" -ForegroundColor Cyan
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

if ($status.API_URL -ne "http://127.0.0.1:54321") {
    Write-Error "SECURITY FAIL-SAFE: API_URL ('$($status.API_URL)') bukan Supabase lokal 127.0.0.1:54321!"
    exit 1
}
Write-Host "[OK] Terhubung ke Supabase Lokal: $($status.API_URL)" -ForegroundColor Green

# 2. Input password Tenaga Ahli secara tersembunyi via SecureString
Write-Host "`n[2/3] Masukkan password baru untuk Tenaga Ahli (karakter tidak akan ditampilkan di layar):" -ForegroundColor Yellow

$techSecure = Read-Host -Prompt "Password baru untuk [tenagaahli.local@simantik.test] (min 8 karakter)" -AsSecureString
$techPass   = [System.Net.NetworkCredential]::new("", $techSecure).Password

if ($techPass.Length -lt 8) {
    Write-Error "Password harus minimal 8 karakter."
    exit 1
}

# 3. Jalankan skrip pembaruan password khusus Tenaga Ahli
Write-Host "`n[3/3] Memperbarui password Tenaga Ahli di Supabase Auth lokal..." -ForegroundColor Yellow
$env:LOCAL_SUPABASE_URL = $status.API_URL
$env:LOCAL_SUPABASE_SERVICE_ROLE_KEY = $status.SERVICE_ROLE_KEY
$env:LOCAL_SUPABASE_PUBLISHABLE_KEY = if ($status.PUBLISHABLE_KEY) { $status.PUBLISHABLE_KEY } else { $status.ANON_KEY }
$env:LOCAL_TARGET_ACCOUNT = "technician"
$env:LOCAL_TECHNICIAN_PASSWORD = $techPass

try {
    Push-Location "d:\Projects\simantik\backend\api"
    npx tsx src/scripts/set-local-test-passwords.ts
}
finally {
    Pop-Location
    # Bersihkan variabel environment dan memori
    Write-Host "`nMembersihkan variabel kredensial dari sesi..." -ForegroundColor Yellow
    Remove-Item Env:\LOCAL_SUPABASE_URL -ErrorAction SilentlyContinue
    Remove-Item Env:\LOCAL_SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
    Remove-Item Env:\LOCAL_SUPABASE_PUBLISHABLE_KEY -ErrorAction SilentlyContinue
    Remove-Item Env:\LOCAL_TARGET_ACCOUNT -ErrorAction SilentlyContinue
    Remove-Item Env:\LOCAL_TECHNICIAN_PASSWORD -ErrorAction SilentlyContinue
    $techPass = $null
    $techSecure = $null
    Write-Host "[OK] Sesi bersih. Password Super Admin tidak tersentuh dan tetap terjaga." -ForegroundColor Green
}
