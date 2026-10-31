param()
$ErrorActionPreference='Continue'
$runtime=Join-Path $PSScriptRoot '.runtime'
New-Item -ItemType Directory -Force -Path $runtime | Out-Null
$file=Join-Path $runtime 'diagnostico.txt'
Start-Transcript -Path $file -Force | Out-Null
Write-Output ('Windows 64 bits: '+[Environment]::Is64BitOperatingSystem)
Write-Output ('PowerShell: '+$PSVersionTable.PSVersion.ToString())
$node=Join-Path $PSScriptRoot 'node\node.exe'
Write-Output ('Node presente: '+(Test-Path -LiteralPath $node))
if(Test-Path -LiteralPath $node){& $node --version}
try { & (Join-Path $PSScriptRoot 'Iniciar.ps1') -SemAbrir } catch { Write-Output $_.Exception.Message }
$log=Join-Path $runtime 'server-error.log'
if(Test-Path -LiteralPath $log){Write-Output 'Ultimos erros do servidor:';Get-Content -LiteralPath $log -Tail 20}
Stop-Transcript | Out-Null
Write-Output "Envie este arquivo para analise: $file"
