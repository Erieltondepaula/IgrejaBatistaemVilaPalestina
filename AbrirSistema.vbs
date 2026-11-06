Dim shell, fileSystem, scriptDirectory, startupScript

Set shell = CreateObject("WScript.Shell")
Set fileSystem = CreateObject("Scripting.FileSystemObject")

scriptDirectory = fileSystem.GetParentFolderName(WScript.ScriptFullName)
startupScript = fileSystem.BuildPath(scriptDirectory, "IniciarTudo.bat")

If Not fileSystem.FileExists(startupScript) Then
    MsgBox "Nao foi encontrado o inicializador do sistema:" & vbCrLf & startupScript, vbCritical, "Gestao de membros IBVP"
    WScript.Quit 1
End If

shell.CurrentDirectory = scriptDirectory
shell.Run """" & startupScript & """", 1, False
