# Powershell script to start a simple HTTP server for the console
# This mimics the environment of the React app, allowing full wallet injection.

Write-Host "Starting Local Server for BADSEED Console..." -ForegroundColor Cyan
Write-Host "This allows Jupiter/Coinbase wallets to inject correctly (unlike file://)." -ForegroundColor Yellow

# Check for Python
if (Get-Command "python" -ErrorAction SilentlyContinue) {
    Write-Host "Using Python HTTP Server..." -ForegroundColor Green
    python -m http.server 8080
} 
elseif (Get-Command "python3" -ErrorAction SilentlyContinue) {
    Write-Host "Using Python3 HTTP Server..." -ForegroundColor Green
    python3 -m http.server 8080
}
elseif (Get-Command "npx" -ErrorAction SilentlyContinue) {
    Write-Host "Using Node http-server..." -ForegroundColor Green
    npx http-server . -p 8080 -c-1
}
else {
    Write-Error "No server tool found (Python or Node). Please install Python or Node.js."
    Read-Host "Press Enter to exit"
}
