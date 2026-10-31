param([switch]$SemAbrir,[ValidateRange(1024,65535)][int]$Porta=8787)
$ErrorActionPreference = 'Stop'
$taskUrl = "http://127.0.0.1:$Porta/"
$taskNode = Join-Path $PSScriptRoot 'node\node.exe'
if (-not (Test-Path -LiteralPath $taskNode)) {
  $nodeDir = Join-Path $PSScriptRoot 'node'
  New-Item -ItemType Directory -Force -Path $nodeDir | Out-Null
  $version = 'v22.16.0'
  $archiveName = "node-$version-win-x64.zip"
  $downloadUrl = "https://nodejs.org/dist/$version/$archiveName"
  $zipPath = Join-Path $env:TEMP $archiveName
  $extractDir = Join-Path $env:TEMP ("FordBrowserNode-" + [guid]::NewGuid().ToString('N'))
  Write-Host 'Preparando Node.js portatil (somente na primeira execucao)...'
  try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing -ErrorAction Stop
    # Confere a integridade usando o arquivo SHA256SUMS oficial.
    $sumFile = Join-Path $env:TEMP ("FordBrowserSHA-" + [guid]::NewGuid().ToString('N'))
    try {
      Invoke-WebRequest -Uri "https://nodejs.org/dist/$version/SHASUMS256.txt" -OutFile $sumFile -UseBasicParsing -ErrorAction Stop
      $expectedLine = Get-Content $sumFile | Where-Object { $_ -match ([regex]::Escape($archiveName) + '$') } | Select-Object -First 1
      if (-not $expectedLine) { throw 'Checksum oficial nao encontrado.' }
      $expected = ($expectedLine -split '\s+')[0].ToUpperInvariant()
      $actual = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToUpperInvariant()
      if ($actual -ne $expected) { throw 'Falha de integridade no download do Node.js.' }
    } finally { Remove-Item $sumFile -Force -ErrorAction SilentlyContinue }
    Expand-Archive -LiteralPath $zipPath -DestinationPath $extractDir -Force
    $downloadedNode = Join-Path $extractDir "node-$version-win-x64\node.exe"
    if (-not (Test-Path $downloadedNode)) { throw 'node.exe nao encontrado no pacote oficial.' }
    Copy-Item -LiteralPath $downloadedNode -Destination $taskNode -Force
  } catch {
    throw "Nao foi possivel baixar o Node.js oficial. Verifique a internet e tente novamente. Detalhes: $($_.Exception.Message)"
  } finally {
    Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
    Remove-Item $extractDir -Recurse -Force -ErrorAction SilentlyContinue
  }
}

function Test-FreitasReady([string]$Address) {
  try {
    $response = Invoke-WebRequest ($Address + 'health') -UseBasicParsing -TimeoutSec 1
    $health = $response.Content | ConvertFrom-Json
    return ($health.app -eq 'freitas-tv' -and $health.protocol -eq 1)
  } catch { return $false }
}

$taskReady = $false
$taskSelected = $false
for ($offset = 0; $offset -lt 10; $offset++) {
  $candidate = [int]$Porta + $offset
  if ($candidate -gt 65535) { break }
  $taskUrl = "http://127.0.0.1:$candidate/"
  if (Test-FreitasReady $taskUrl) { $taskReady = $true; $taskSelected = $true; $Porta = $candidate; break }
  $probe = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $candidate)
  try { $probe.Start(); $taskSelected = $true; $Porta = $candidate } catch { } finally { $probe.Stop() }
  if ($taskSelected) { break }
}
if (-not $taskSelected) { throw 'Nenhuma porta local livre. Feche outras instancias do aplicativo e tente novamente.' }
if ($offset -gt 0) { Write-Host "Usando a porta $Porta, pois a porta solicitada ja estava em uso." }

if (-not $taskReady) {
  $runtime = Join-Path $PSScriptRoot '.runtime'
  New-Item -ItemType Directory -Force -Path $runtime | Out-Null
  $server = Join-Path $PSScriptRoot 'server.mjs'
  if (-not (Test-Path -LiteralPath $server)) { throw 'server.mjs nao encontrado. Extraia TODO o ZIP antes de abrir Iniciar.cmd.' }
  try {
    $nodeVersion = & $taskNode --version 2>&1
    if ($LASTEXITCODE -ne 0) { throw ($nodeVersion -join "`n") }
  } catch { throw "O Windows nao conseguiu executar node\node.exe. Verifique se o ZIP foi extraido inteiro e se o antivirus informou bloqueio. Detalhes: $($_.Exception.Message)" }
  $taskPreviousPort = $env:PORT
  try {
    $env:PORT = [string]$Porta
    $proc = Start-Process -FilePath $taskNode -ArgumentList ('"' + $server + '"') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtime 'server.log') -RedirectStandardError (Join-Path $runtime 'server-error.log') -PassThru
  } finally { $env:PORT = $taskPreviousPort }
  for ($i=0; $i -lt 100; $i++) {
    Start-Sleep -Milliseconds 200
    if (Test-FreitasReady $taskUrl) { $taskReady = $true; break }
    $proc.Refresh()
    if ($proc.HasExited) { break }
  }
  if (-not $taskReady) {
    $errorFile = Join-Path $runtime 'server-error.log'
    $details = if (Test-Path -LiteralPath $errorFile) { (Get-Content -LiteralPath $errorFile -Tail 15) -join "`n" } else { '' }
    if (-not $details.Trim()) { $details = 'O servidor nao respondeu. Abra Diagnostico.cmd e envie o arquivo .runtime\diagnostico.txt.' }
    throw "Falha ao iniciar em $taskUrl`n$details"
  }
  $Porta | Set-Content -LiteralPath (Join-Path $runtime 'server-port')
  $proc.Id | Set-Content -LiteralPath (Join-Path $runtime 'server.pid')
}
if (-not $SemAbrir) { Start-Process $taskUrl }
Write-Output "Freitas TV PC pronto em $taskUrl"
