$taskPidFile=Join-Path $PSScriptRoot '.runtime/server.pid'
if(Test-Path -LiteralPath $taskPidFile) {
 $taskServerId=[int](Get-Content -LiteralPath $taskPidFile)
 $taskProcess=Get-CimInstance Win32_Process -Filter "ProcessId=$taskServerId" -ErrorAction SilentlyContinue
 $taskExpected=Join-Path $PSScriptRoot 'server.mjs'
 if($taskProcess -and $taskProcess.Name -eq 'node.exe' -and $taskProcess.CommandLine.Contains($taskExpected)) {
  $taskPortFile=Join-Path $PSScriptRoot '.runtime/server-port'
  $taskPort=8787
  if(Test-Path -LiteralPath $taskPortFile){$taskPort=[int](Get-Content -LiteralPath $taskPortFile)}
  $taskListener=Get-NetTCPConnection -LocalPort $taskPort -State Listen -ErrorAction SilentlyContinue
  if($taskListener.OwningProcess -contains $taskServerId) {Stop-Process -Id $taskServerId;Write-Output 'Servidor parado.'}
 }
}
