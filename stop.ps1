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

function Invoke-StopNative([scriptblock]$Command, [string]$SuccessMessage, [string]$WarnMessage) {
  $global:LASTEXITCODE = 0
  try {
    & $Command >> $StopLog 2>&1
  } catch {
    Add-Content -Path $StopLog -Value $_.Exception.Message
    $exitCode = if ($LASTEXITCODE -ne 0) { $LASTEXITCODE } else { 1 }
    Write-Warn ($WarnMessage + " (exit code $exitCode)")
    return
  }
  if ($LASTEXITCODE -eq 0) {
    Write-Ok $SuccessMessage
  } else {
    Write-Warn ($WarnMessage + " (exit code $LASTEXITCODE)")
  }
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
    Stop-ProcessTree $processId "$Label pid file"
  } else {
    Write-Warn "$Label pid $processId was not running"
  }

  Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
}

function Stop-ProcessTree([int]$ProcessId, [string]$Reason) {
  if ($ProcessId -eq $PID) {
    Write-Warn "Skipped current stop.ps1 process for $Reason"
    return
  }

  $children = Get-CimInstance Win32_Process -Filter "ParentProcessId = $ProcessId" -ErrorAction SilentlyContinue
  foreach ($child in $children) {
    Stop-ProcessTree ([int]$child.ProcessId) $Reason
  }

  $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
  if ($null -ne $process) {
    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
    Write-Ok "Stopped process tree item for ${Reason}: $ProcessId"
  }
}

function Get-ProcessCommandLine([int]$ProcessId) {
  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
  if ($null -eq $process) { return '' }
  return [string]$process.CommandLine
}

function Test-IsDockerPortOwner([int]$ProcessId) {
  $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
  $commandLine = (Get-ProcessCommandLine $ProcessId).ToLowerInvariant()
  $processName = if ($process) { $process.ProcessName.ToLowerInvariant() } else { '' }

  return (
    $processName -like '*docker*' -or
    $commandLine.Contains('\docker\resources\com.docker.backend.exe') -or
    $commandLine.Contains('com.docker.backend.exe') -or
    $commandLine.Contains('--vm-id') -or
    $commandLine.Contains('dockerd') -or
    $commandLine.Contains('docker-proxy')
  )
}

function Stop-RepoRuntimeProcesses {
  $root = $RootDir.ToLowerInvariant()
  Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -and
    $_.ProcessId -ne $PID -and
    $_.CommandLine.ToLowerInvariant().Contains($root) -and
    ($_.CommandLine.ToLowerInvariant().Contains('@retail-agent/api') -or
      $_.CommandLine.ToLowerInvariant().Contains('apps\web') -or
      $_.CommandLine.ToLowerInvariant().Contains('next dev') -or
      $_.CommandLine.ToLowerInvariant().Contains('dist/main.js'))
  } | ForEach-Object {
    Stop-ProcessTree ([int]$_.ProcessId) 'repo runtime process'
  }
  Write-Ok 'Stopped provider runtime processes scoped to this repo when present'
}

function Stop-ProjectPorts {
  $ports = @(
    $(if ($env:WEB_PORT) { $env:WEB_PORT } else { '3100' }),
    $(if ($env:API_PORT) { $env:API_PORT } else { '3110' }),
    $(if ($env:NGINX_PORT) { $env:NGINX_PORT } else { '3120' }),
    $(if ($env:POSTGRES_PORT) { $env:POSTGRES_PORT } else { '3132' }),
    $(if ($env:QDRANT_PORT) { $env:QDRANT_PORT } else { '3133' }),
    $(if ($env:QDRANT_GRPC_PORT) { $env:QDRANT_GRPC_PORT } else { '3134' }),
    $(if ($env:REDIS_PORT) { $env:REDIS_PORT } else { '3139' })
  ) | Where-Object { $_ -match '^\d+$' } | Select-Object -Unique

  foreach ($port in $ports) {
    Get-NetTCPConnection -LocalPort ([int]$port) -State Listen -ErrorAction SilentlyContinue |
      Select-Object -ExpandProperty OwningProcess -Unique |
      ForEach-Object {
        $ownerPid = [int]$_
        if (Test-IsDockerPortOwner $ownerPid) {
          Write-Warn "Skipped Docker-owned port ${port} process ${ownerPid}; compose down must release Docker-published ports"
        } else {
          Stop-ProcessTree $ownerPid "project port ${port}"
        }
      }
  }
}

function Stop-ComposeServices {
  $composeFile = Join-Path $RootDir 'infra\docker\docker-compose.yml'
  $rootComposeFile = Join-Path $RootDir 'docker-compose.yml'
  $docker = Get-Command docker -ErrorAction SilentlyContinue
  if ($null -eq $docker) {
    Write-Warn 'Docker not found; skipping provider compose shutdown'
    return
  }

  $infraProjects = @($env:COMPOSE_PROJECT_NAME, 'retail_agent_dev', 'retail_agent_provider') |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
    Select-Object -Unique
  foreach ($projectName in $infraProjects) {
    Invoke-StopNative { docker compose -p $projectName -f $composeFile down --remove-orphans } "Stopped provider Docker Compose project: $projectName" "Could not stop provider Docker Compose project: $projectName"
  }

  $fullProjects = @($env:DOCKER_COMPOSE_PROJECT_NAME, 'retail_agent_full') |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
    Select-Object -Unique
  foreach ($projectName in $fullProjects) {
    Invoke-StopNative { docker compose -p $projectName -f $rootComposeFile down --remove-orphans } "Stopped full Docker Compose project: $projectName" "Could not stop full Docker Compose project: $projectName"
  }
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
Write-Step 'Clear project ports'
Stop-ProjectPorts
Write-Step 'Clean provider web runtime locks'
Remove-WebLocks

Write-Host ''
Write-Host 'Stopped'
Write-Host "Log: $StopLog"
Write-Host 'Runtime windows/processes: repo-scoped PowerShell/Corepack/Next processes stopped when present'
Write-Host "API pid file: $(Join-Path $ApiLogDir 'api.pid')"
Write-Host "Web pid file: $(Join-Path $WebLogDir 'web.pid')"
