$WshShell = New-Object -comObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$Shortcut = $WshShell.CreateShortcut("$DesktopPath\Launch Trivia Scoreboard.lnk")
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = "`"c:\Users\donca\OneDrive\Documents\Codex Projects\trivia-scoreboard-react\Launch-PWA.vbs`""
$Shortcut.WorkingDirectory = "c:\Users\donca\OneDrive\Documents\Codex Projects\trivia-scoreboard-react"
$Shortcut.IconLocation = "c:\Users\donca\OneDrive\Documents\Codex Projects\trivia-scoreboard-react\public\trivia-ps.ico, 0"
$Shortcut.Save()
