$ErrorActionPreference = 'Stop'

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogRoot = Join-Path $RootDir 'logs'
$SetupLogDir = Join-Path $LogRoot 'setup'
$CleanLog = Join-Path $SetupLogDir ("clean-{0}.log" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
$EnvFile = Join-Path $RootDir '.env'

New-Item -ItemType Directory -Force -Path $SetupLogDir | Out-Null
New-Item -ItemType File -Path $CleanLog -Force | Out-Null

function Write-Log([string]$Message) {
  Add-Content -Path $CleanLog -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
}

function Write-Step([string]$Message) {
  Write-Host ('> ' + $Message)
  Write-Log "STEP $Message"
}

function Write-Ok([string]$Message) {
  Write-Host ('OK ' + $Message)
  Write-Log "OK $Message"
}

function Write-Warn([string]$Message) {
  Write-Host ('WARN ' + $Message)
  Write-Log "WARN $Message"
}

function Import-EnvFile {
  if (-not (Test-Path $EnvFile)) {
    Write-Warn 'No .env found; using default provider project name'
    return
  }

  Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq '' -or $line.StartsWith('#')) { return }
    $parts = $line.Split('=', 2)
    if ($parts.Length -eq 2) {
      [Environment]::SetEnvironmentVariable($parts[0], $parts[1], 'Process')
    }
  }
  Write-Ok 'Loaded .env'
}

Set-Location $RootDir
Write-Host ''
Write-Host 'Retail AI Agent Clean'
Write-Host "Root: $RootDir"
Write-Host "Clean log: $CleanLog"
Write-Host ''

Import-EnvFile
$composeProjectName = if ($env:COMPOSE_PROJECT_NAME) { $env:COMPOSE_PROJECT_NAME } else { 'retail_agent_provider' }
$composeFile = Join-Path $RootDir 'infra\docker\docker-compose.yml'

$stopScript = Join-Path $RootDir 'stop.ps1'
if (Test-Path $stopScript) {
  Write-Step 'Stop provider runtime'
  try { & $stopScript >> $CleanLog } catch { Write-Warn 'stop.ps1 reported a non-fatal cleanup issue' }
  Write-Ok 'Provider runtime stopped when present'
}

Write-Step 'Remove provider Docker resources'
$docker = Get-Command docker -ErrorAction SilentlyContinue
if ($null -ne $docker) {
  docker compose -p $composeProjectName -f $composeFile down --volumes --remove-orphans --rmi all >> $CleanLog
  Write-Ok 'Removed provider Compose containers, networks, volumes and provider-owned images'
} else {
  Write-Warn 'Docker not found; skipped Docker cleanup'
}

Write-Step 'Remove generated runtime files'
Remove-Item (Join-Path $RootDir 'logs\runtime\backend\api.pid'), (Join-Path $RootDir 'logs\runtime\frontend\web.pid') -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $RootDir 'apps\web\.next\dev\lock'), (Join-Path $RootDir 'apps\web\.next\dev\server') -Recurse -Force -ErrorAction SilentlyContinue
Write-Ok 'Removed provider runtime PID files and stale web locks'

Write-Host ''
Write-Host 'Clean complete'
Write-Host "Compose project: $composeProjectName"
Write-Host "Log: $CleanLog"
