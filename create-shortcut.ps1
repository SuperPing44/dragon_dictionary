# Creates the "Dragon Dictionary" desktop shortcut for start.cmd in this folder.
# Run it once from the daily copy:
#   powershell -ExecutionPolicy Bypass -File create-shortcut.ps1
param(
  # Where to put the shortcut; the desktop unless given.
  [string]$Destination = [Environment]::GetFolderPath("Desktop")
)

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = Join-Path $here "start.cmd"
$link = Join-Path $Destination "Dragon Dictionary.lnk"

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($link)
$shortcut.TargetPath = $target
$shortcut.WorkingDirectory = $here
$shortcut.Description = "Start Dragon Dictionary"
$icon = Join-Path $here "frontend\src\app\favicon.ico"
if (Test-Path $icon) { $shortcut.IconLocation = $icon }
$shortcut.Save()

Write-Host "Created $link"
