# Start Next.js
$next = Start-Process -NoNewWindow -PassThru -FilePath "cmd.exe" -ArgumentList "/c npm run start"

# Start Ollama
$ollama = Start-Process -NoNewWindow -PassThru -FilePath "cmd.exe" -ArgumentList "/c ollama serve"

# Wait for a few seconds to ensure the servers start
Start-Sleep -Seconds 2

# Open localhost:8080 in the default web browser
Start-Process "http://localhost:8080"

# Handle Ctrl+C to stop both processes
Write-Host "Press Ctrl+C to stop both processes..."
try {
    Wait-Process -Id $next.Id, $ollama.Id
} catch {
    Write-Host "Stopping Next.js and Ollama..."
    Stop-Process -Id $next.Id -Force
    Stop-Process -Id $ollama.Id -Force
}