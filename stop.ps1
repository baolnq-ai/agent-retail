$ErrorActionPreference = 'Stop'

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogRoot = Join-Path $RootDir 'logs'
$SetupLogDir = Join-Path $LogRoot 'setup'
$RuntimeLogDir = Join-Path $LogRoot 'runtime'
$ApiLogDir = Join-Path $RuntimeLogDir 'backend'
$WebLogDir = Join-Path $RuntimeLogDir 'frontend'
$StopLog = Join-Path $SetupLogDir ("stop-{0}.log" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
$EnvFile = Join-Path $RootDir '.env'

New-Item -ItemType Directory -Force -Path $SetupLogDir, $ApiLogDir, $WebLogDir | Out-Null
New-Item -ItemType File -Path $StopLog -Force | Out-Null

function Write-Log([string]$Message) {
  Add-Content -Path $StopLog -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
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

function Stop-PidFile([string]$PidFile, [string]$Label) {
  if (-not (Test-Path $PidFile)) {
    Write-Warn "No $Label pid file found at $PidFile"
    return
  }

  $pidText = (Get-Content $PidFile -Raw) -replace '[^0-9]', ''
  if ([string]::IsNullOrWhiteSpace($pidText)) {
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    Write-Warn "$Label pid file is empty or invalid"
    return
  }

  $processId = [int]$pidText
  $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
  if ($null -ne $process) {
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    Write-Ok "Stopped $Label process from pid file: $processId"
  } else {
    Write-Warn "$Label pid $processId was not running"
  }

  Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
}

function Stop-RepoRuntimeProcesses {
  $root = $RootDir.ToLowerInvariant()
  Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -and
    $_.CommandLine.ToLowerInvariant().Contains($root) -and
    ($_.CommandLine.ToLowerInvariant().Contains('@retail-agent/api') -or
      $_.CommandLine.ToLowerInvariant().Contains('apps\web') -or
      $_.CommandLine.ToLowerInvariant().Contains('next dev'))
  } | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }
  Write-Ok 'Stopped provider runtime processes scoped to this repo when present'
}

function Stop-ComposeServices {
  $composeProjectName = if ($env:COMPOSE_PROJECT_NAME) { $env:COMPOSE_PROJECT_NAME } else { 'retail_agent_provider' }
  $composeFile = Join-Path $RootDir 'infra\docker\docker-compose.yml'
  $docker = Get-Command docker -ErrorAction SilentlyContinue
  if ($null -eq $docker) {
    Write-Warn 'Docker not found; skipping provider compose shutdown'
    return
  }

  docker compose -p $composeProjectName -f $composeFile down --remove-orphans >> $StopLog
  Write-Ok "Stopped provider Docker Compose project: $composeProjectName"
}

function Remove-WebLocks {
  $lockPath = Join-Path $RootDir 'apps\web\.next\dev\lock'
  $serverPath = Join-Path $RootDir 'apps\web\.next\dev\server'
  Remove-Item $lockPath, $serverPath -Recurse -Force -ErrorAction SilentlyContinue
  Write-Ok 'Cleared stale Next dev locks for apps/web when present'
}

Set-Location $RootDir
Write-Host ''
Write-Host 'Retail AI Agent Stop'
Write-Host "Root: $RootDir"
Write-Host "Stop log: $StopLog"
Write-Host ''

Import-EnvFile
Write-Step 'Stop processes from setup PID files'
Stop-PidFile (Join-Path $ApiLogDir 'api.pid') 'backend'
Stop-PidFile (Join-Path $WebLogDir 'web.pid') 'frontend'
Write-Step 'Stop repo-scoped runtime processes'
Stop-RepoRuntimeProcesses
Write-Step 'Stop provider Docker services'
Stop-ComposeServices
Write-Step 'Clean provider web runtime locks'
Remove-WebLocks

Write-Host ''
Write-Host 'Stopped'
Write-Host "Log: $StopLog"
Write-Host 'Runtime windows/processes: repo-scoped PowerShell/Corepack/Next processes stopped when present'
Write-Host "API pid file: $(Join-Path $ApiLogDir 'api.pid')"
Write-Host "Web pid file: $(Join-Path $WebLogDir 'web.pid')"
