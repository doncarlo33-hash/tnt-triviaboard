$WshShell = New-Object -comObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$Shortcut = $WshShell.CreateShortcut("$DesktopPath\Launch Trivia Scoreboard.lnk")
$Shortcut.TargetPath = "powershell.exe"
$Shortcut.Arguments = "-ExecutionPolicy Bypass -NoExit -File `"c:\Users\donca\OneDrive\Documents\Codex Projects\trivia-scoreboard-react\Launch-Trivia.ps1`""
$Shortcut.WorkingDirectory = "c:\Users\donca\OneDrive\Documents\Codex Projects\trivia-scoreboard-react"
$Shortcut.IconLocation = "powershell.exe, 0"
$Shortcut.Save()
