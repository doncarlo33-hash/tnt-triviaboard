Set WshShell = CreateObject("WScript.Shell")

' Start the dev server silently (hidden window)
WshShell.Run "cmd /c npm run dev", 0, False

' Wait a few seconds for the server to start
WScript.Sleep 5000

' Try to launch in Chrome's App mode (PWA standalone window)
' If Chrome isn't found, it will try Edge
On Error Resume Next
errCode = WshShell.Run("chrome.exe --app=http://localhost:5175/", 1, False)

If errCode <> 0 Then
    WshShell.Run "msedge.exe --app=http://localhost:5175/", 1, False
End If
