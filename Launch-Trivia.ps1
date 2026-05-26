$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

# Start Vite in the background
$viteProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -PassThru -NoNewWindow

# Wait 5 seconds for the server to boot up
Start-Sleep -Seconds 5

# Open the browser explicitly to localhost
Start-Process "http://localhost:5175/"

Write-Host "Trivia Scoreboard is running. Press any key to stop the server..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Clean up the server when closed
Stop-Process -Id $viteProcess.Id -Force
