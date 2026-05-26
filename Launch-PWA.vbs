Set WshShell = CreateObject("WScript.Shell")
strPath = WScript.ScriptFullName
Set objFSO = CreateObject("Scripting.FileSystemObject")
strFolder = objFSO.GetParentFolderName(strPath)

' Change to the script directory
WshShell.CurrentDirectory = strFolder

' Check if server is already running by attempting to curl it
' If not, start it hidden
cmd = "cmd.exe /c netstat -ano | findstr :5175"
Set exec = WshShell.Exec(cmd)
output = exec.StdOut.ReadAll()

If InStr(output, "LISTENING") = 0 Then
    ' Start the dev server silently (0 means hidden window)
    WshShell.Run "cmd /c npm run dev", 0, False
    WScript.Sleep 4000
End If

' Launch the Progressive Web App in App Mode (Edge is guaranteed to be on Windows)
' First try Chrome, fallback to Edge
On Error Resume Next
errCode = WshShell.Run("chrome.exe --app=http://localhost:5175/", 1, False)

If errCode <> 0 Then
    WshShell.Run "msedge.exe --app=http://localhost:5175/", 1, False
End If
