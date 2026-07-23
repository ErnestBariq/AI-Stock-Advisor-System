param(
    [switch]$Prod
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path (Split-Path -Parent $root) "ai-financial-advisor"

if (-not (Test-Path $backendDir)) {
    Write-Error "Backend introuvable : $backendDir"
    exit 1
}

$venvPython = Join-Path $backendDir "venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    Write-Error "venv introuvable : $venvPython"
    exit 1
}

Write-Host "Backend (Flask :5000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendDir'; & '$venvPython' app.py"

Write-Host "Frontend ($(if ($Prod) {'build+serve :3033'} else {'dev :3033'}))..." -ForegroundColor Cyan
$frontendCmd = if ($Prod) { "npm run build; npm start" } else { "npm run stage" }
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; $frontendCmd"

Write-Host "Lances : backend et frontend dans deux fenetres separees." -ForegroundColor Green
