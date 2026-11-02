# =============================================================================
# SIMANTIK - Set Local Test Accounts Passwords (Interactive Secure Prompt)
# Target: Supabase Local (127.0.0.1:54321)
# =============================================================================

$ErrorActionPreference = "Stop"

Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host " SIMANTIK - Pembaruan Password Akun Pengujian Lokal" -ForegroundColor Cyan
Write-Host " Target: Supabase Local (127.0.0.1:54321)" -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan

# 1. Ekstraksi status Supabase lokal secara in-memory (tanpa menampilkan key)
Write-Host "[1/4] Memeriksa status Supabase lokal..." -ForegroundColor Yellow
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

# 2. Input password secara tersembunyi via SecureString
Write-Host "`n[2/4] Masukkan password baru (karakter tidak akan ditampilkan di layar):" -ForegroundColor Yellow

$adminSecure = Read-Host -Prompt "Password baru untuk [superadmin.local@simantik.test] (min 8 karakter)" -AsSecureString
$techSecure  = Read-Host -Prompt "Password baru untuk [tenagaahli.local@simantik.test] (min 8 karakter)" -AsSecureString

$adminPass = [System.Net.NetworkCredential]::new("", $adminSecure).Password
$techPass  = [System.Net.NetworkCredential]::new("", $techSecure).Password

if ($adminPass.Length -lt 8 -or $techPass.Length -lt 8) {
    Write-Error "Password harus minimal 8 karakter."
    exit 1
}

# 3. Jalankan skrip pembaruan password aman
Write-Host "`n[3/4] Memperbarui password di Supabase Auth lokal..." -ForegroundColor Yellow
$env:LOCAL_SUPABASE_URL = $status.API_URL
$env:LOCAL_SUPABASE_SERVICE_ROLE_KEY = $status.SERVICE_ROLE_KEY
$env:LOCAL_SUPABASE_PUBLISHABLE_KEY = if ($status.PUBLISHABLE_KEY) { $status.PUBLISHABLE_KEY } else { $status.ANON_KEY }
$env:LOCAL_SUPER_ADMIN_PASSWORD = $adminPass
$env:LOCAL_TECHNICIAN_PASSWORD = $techPass

try {
    Push-Location "d:\Projects\simantik\backend\api"
    npx tsx src/scripts/set-local-test-passwords.ts
}
finally {
    Pop-Location
    # 4. Bersihkan variabel environment dan memori
    Write-Host "`n[4/4] Membersihkan variabel kredensial dari sesi..." -ForegroundColor Yellow
    Remove-Item Env:\LOCAL_SUPABASE_URL -ErrorAction SilentlyContinue
    Remove-Item Env:\LOCAL_SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
    Remove-Item Env:\LOCAL_SUPABASE_PUBLISHABLE_KEY -ErrorAction SilentlyContinue
    Remove-Item Env:\LOCAL_SUPER_ADMIN_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:\LOCAL_TECHNICIAN_PASSWORD -ErrorAction SilentlyContinue
    $adminPass = $null
    $techPass = $null
    $adminSecure = $null
    $techSecure = $null
    Write-Host "[OK] Sesi bersih. Password tidak tersimpan di disk atau Git." -ForegroundColor Green
}
