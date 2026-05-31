$ErrorActionPreference = 'Stop'

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogRoot = Join-Path $RootDir 'logs'
$SetupLogDir = Join-Path $LogRoot 'setup'
$RuntimeLogDir = Join-Path $LogRoot 'runtime'
$ApiLogDir = Join-Path $RuntimeLogDir 'backend'
$WebLogDir = Join-Path $RuntimeLogDir 'frontend'
$SetupLog = Join-Path $SetupLogDir ("setup-{0}.log" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
$ApiLog = Join-Path $ApiLogDir 'api-3110.log'
$WebLog = Join-Path $WebLogDir 'web-3100.log'
$EnvFile = Join-Path $RootDir '.env'
$EnvExample = Join-Path $RootDir '.env.example'
$TerminalMode = if ($env:SETUP_TERMINAL_MODE) { $env:SETUP_TERMINAL_MODE.ToLowerInvariant() } else { 'window' }
$ShellSkipDocker = $env:SKIP_DOCKER

New-Item -ItemType Directory -Force -Path $SetupLogDir, $ApiLogDir, $WebLogDir | Out-Null
New-Item -ItemType File -Path $SetupLog -Force | Out-Null

function Write-Log([string]$Message) {
  Add-Content -Path $SetupLog -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
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

function Invoke-Logged([scriptblock]$Command) {
  $global:LASTEXITCODE = 0
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    & $Command *>> $SetupLog
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code ${LASTEXITCODE}: $Command"
  }
}

function ConvertTo-PowerShellLiteral([string]$Value) {
  return "'" + ($Value -replace "'", "''") + "'"
}

function New-EnvScript([hashtable]$EnvMap) {
  $lines = @()
  foreach ($key in $EnvMap.Keys) {
    $lines += ('$env:' + $key + ' = ' + (ConvertTo-PowerShellLiteral $EnvMap[$key]))
  }
  return ($lines -join '; ')
}

function Get-CommandPath([string]$Name) {
  $command = Get-Command $Name -ErrorAction Stop
  if ($command.Source) { return $command.Source }
  return $command.Path
}

function Test-RuntimePortRange([string]$Name, [string]$Value) {
  if ($Value -notmatch '^\d+$') {
    throw "$Name must be a numeric port in the 3100-3150 project range."
  }

  $port = [int]$Value
  if ($port -lt 3100 -or $port -gt 3150) {
    throw "$Name=$Value is outside the required 3100-3150 project range."
  }
}

function Start-RuntimeWindow([string]$Title, [string]$WorkingDirectory, [hashtable]$EnvMap, [string]$CommandLine, [string]$LogPath) {
  $titleLiteral = ConvertTo-PowerShellLiteral $Title
  $workDirLiteral = ConvertTo-PowerShellLiteral $WorkingDirectory
  $logLiteral = ConvertTo-PowerShellLiteral $LogPath
  $envScript = New-EnvScript $EnvMap
  $script = @"
`$Host.UI.RawUI.WindowTitle = $titleLiteral
Set-Location $workDirLiteral
$envScript
Write-Host ''
Write-Host $titleLiteral
Write-Host ('Log: ' + $logLiteral)
Write-Host ''
$CommandLine 2>&1 | Tee-Object -FilePath $logLiteral -Append
"@
  return Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $script) -PassThru
}

function Import-EnvFile {
  $incoming = @{
    API_PORT = $env:API_PORT
    WEB_PORT = $env:WEB_PORT
    NGINX_PORT = $env:NGINX_PORT
    POSTGRES_PORT = $env:POSTGRES_PORT
    REDIS_PORT = $env:REDIS_PORT
    QDRANT_PORT = $env:QDRANT_PORT
    QDRANT_GRPC_PORT = $env:QDRANT_GRPC_PORT
    COMPOSE_PROJECT_NAME = $env:COMPOSE_PROJECT_NAME
    CORS_ORIGINS = $env:CORS_ORIGINS
    NEXT_PUBLIC_API_BASE_URL = $env:NEXT_PUBLIC_API_BASE_URL
    NEXT_PUBLIC_SITE_URL = $env:NEXT_PUBLIC_SITE_URL
    NEXT_ALLOWED_DEV_ORIGINS = $env:NEXT_ALLOWED_DEV_ORIGINS
    TUNNEL_PUBLIC_URL = $env:TUNNEL_PUBLIC_URL
    DATABASE_URL = $env:DATABASE_URL
    REDIS_URL = $env:REDIS_URL
    QDRANT_URL = $env:QDRANT_URL
    CHAT_MODEL_BASE_URL = $env:CHAT_MODEL_BASE_URL
    CHAT_MODEL_ID = $env:CHAT_MODEL_ID
    EMBED_RERANK_BASE_URL = $env:EMBED_RERANK_BASE_URL
    SKIP_DOCKER = $env:SKIP_DOCKER
  }

  if (-not (Test-Path $EnvFile) -and (Test-Path $EnvExample)) {
    Copy-Item $EnvExample $EnvFile
    Write-Warn 'Created .env from .env.example; review model/database values before real validation'
  }

  if (Test-Path $EnvFile) {
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

  if ($incoming.CHAT_MODEL_BASE_URL -match 'replace-with|example\.invalid') { $incoming.CHAT_MODEL_BASE_URL = $null }
  if ($incoming.CHAT_MODEL_ID -eq 'replace-with-your-chat-model-id') { $incoming.CHAT_MODEL_ID = $null }
  if ($incoming.EMBED_RERANK_BASE_URL -match 'replace-with|example\.invalid') { $incoming.EMBED_RERANK_BASE_URL = $null }

  foreach ($key in $incoming.Keys) {
    if (-not [string]::IsNullOrWhiteSpace($incoming[$key])) {
      $loadedValue = [Environment]::GetEnvironmentVariable($key, 'Process')
      if ($loadedValue -and $loadedValue -ne $incoming[$key] -and @('CHAT_MODEL_BASE_URL', 'CHAT_MODEL_ID', 'EMBED_RERANK_BASE_URL') -contains $key) {
        Write-Warn ($key + ' from shell overrides .env value. Effective value: ' + $incoming[$key])
      }
      [Environment]::SetEnvironmentVariable($key, $incoming[$key], 'Process')
    }
  }

  if (-not $env:API_PORT) { $env:API_PORT = '3110' }
  if (-not $env:WEB_PORT) { $env:WEB_PORT = '3100' }
  if (-not $env:NGINX_PORT) { $env:NGINX_PORT = '3120' }
  if (-not $env:POSTGRES_PORT) { $env:POSTGRES_PORT = '3132' }
  if (-not $env:REDIS_PORT) { $env:REDIS_PORT = '3139' }
  if (-not $env:QDRANT_PORT) { $env:QDRANT_PORT = '3133' }
  if (-not $env:QDRANT_GRPC_PORT) { $env:QDRANT_GRPC_PORT = '3134' }
  if (-not $env:COMPOSE_PROJECT_NAME) { $env:COMPOSE_PROJECT_NAME = 'retail_agent_provider' }
  if (-not $env:DATABASE_URL) { $env:DATABASE_URL = 'postgresql://retail:retail_password@localhost:' + $env:POSTGRES_PORT + '/retail_agent?schema=public' }
  if (-not $env:REDIS_URL) { $env:REDIS_URL = 'redis://localhost:' + $env:REDIS_PORT }
  if (-not $env:QDRANT_URL) { $env:QDRANT_URL = 'http://localhost:' + $env:QDRANT_PORT }
  if (-not $env:CORS_ORIGINS) { $env:CORS_ORIGINS = 'http://127.0.0.1:' + $env:WEB_PORT + ',http://localhost:' + $env:WEB_PORT + ',http://127.0.0.1:' + $env:NGINX_PORT + ',http://localhost:' + $env:NGINX_PORT }
  if (-not $env:NEXT_PUBLIC_API_BASE_URL) { $env:NEXT_PUBLIC_API_BASE_URL = 'http://127.0.0.1:' + $env:NGINX_PORT }
  if (-not $env:NEXT_PUBLIC_SITE_URL) { $env:NEXT_PUBLIC_SITE_URL = 'http://127.0.0.1:' + $env:NGINX_PORT }
  if (-not $env:NEXT_ALLOWED_DEV_ORIGINS) { $env:NEXT_ALLOWED_DEV_ORIGINS = '*.trycloudflare.com' }
  if ($env:TUNNEL_PUBLIC_URL) {
    try {
      $tunnelUri = [Uri]$env:TUNNEL_PUBLIC_URL.Trim().TrimEnd('/')
      if (-not $tunnelUri.Scheme -or -not $tunnelUri.Host) { throw 'invalid tunnel url' }
      $tunnelOrigin = $tunnelUri.GetLeftPart([UriPartial]::Authority).TrimEnd('/')
      $env:TUNNEL_PUBLIC_URL = $tunnelOrigin
      $env:NEXT_PUBLIC_API_BASE_URL = $tunnelOrigin
      $env:NEXT_PUBLIC_SITE_URL = $tunnelOrigin
      $corsOrigins = @($env:CORS_ORIGINS.Split(',') | ForEach-Object { $_.Trim().TrimEnd('/') } | Where-Object { $_ })
      if ($corsOrigins -notcontains $tunnelOrigin) { $env:CORS_ORIGINS = (($corsOrigins + $tunnelOrigin) -join ',') }
      $allowedDevOrigins = @($env:NEXT_ALLOWED_DEV_ORIGINS.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ })
      if ($allowedDevOrigins -notcontains $tunnelUri.Host) { $env:NEXT_ALLOWED_DEV_ORIGINS = (($allowedDevOrigins + $tunnelUri.Host) -join ',') }
    } catch {
      throw 'TUNNEL_PUBLIC_URL must be a valid absolute URL such as https://example.trycloudflare.com'
    }
  }
  Test-RuntimePortRange 'WEB_PORT' $env:WEB_PORT
  Test-RuntimePortRange 'API_PORT' $env:API_PORT
  Test-RuntimePortRange 'NGINX_PORT' $env:NGINX_PORT
  Test-RuntimePortRange 'POSTGRES_PORT' $env:POSTGRES_PORT
  Test-RuntimePortRange 'REDIS_PORT' $env:REDIS_PORT
  Test-RuntimePortRange 'QDRANT_PORT' $env:QDRANT_PORT
  Test-RuntimePortRange 'QDRANT_GRPC_PORT' $env:QDRANT_GRPC_PORT
  if (-not $env:CHAT_MODEL_BASE_URL) { $env:CHAT_MODEL_BASE_URL = 'https://replace-with-your-vllm-gateway.example.invalid' }
  if (-not $env:CHAT_MODEL_ID) { $env:CHAT_MODEL_ID = 'google/gemma-4-E4B-it' }
  if (-not $env:EMBED_RERANK_BASE_URL) { $env:EMBED_RERANK_BASE_URL = 'https://replace-with-your-embed-rerank-gateway.example.invalid' }
  if ($env:CHAT_MODEL_BASE_URL -match 'replace-with|example\.invalid' -or $env:CHAT_MODEL_ID -eq 'replace-with-your-chat-model-id' -or $env:EMBED_RERANK_BASE_URL -match 'replace-with|example\.invalid') {
    Write-Warn 'Model config still uses placeholders. Set CHAT_MODEL_BASE_URL, CHAT_MODEL_ID and EMBED_RERANK_BASE_URL in .env for real chatbot validation.'
  }
  Write-Ok ('Effective model config: CHAT_MODEL_BASE_URL=' + $env:CHAT_MODEL_BASE_URL + '; CHAT_MODEL_ID=' + $env:CHAT_MODEL_ID + '; EMBED_RERANK_BASE_URL=' + $env:EMBED_RERANK_BASE_URL)
  $script:ApiLog = Join-Path $ApiLogDir ('api-' + $env:API_PORT + '.log')
  $script:WebLog = Join-Path $WebLogDir ('web-' + $env:WEB_PORT + '.log')
}

function Test-Port([string]$HostName, [int]$Port, [string]$Name, [int]$Attempts) {
  for ($index = 0; $index -lt $Attempts; $index++) {
    try {
      $client = New-Object Net.Sockets.TcpClient
      $iar = $client.BeginConnect($HostName, $Port, $null, $null)
      if ($iar.AsyncWaitHandle.WaitOne(1000, $false)) {
        $client.EndConnect($iar)
        $client.Close()
        Write-Ok ($Name + ' is reachable on ' + $HostName + ':' + $Port)
        return
      }
      $client.Close()
    } catch {}
    Start-Sleep -Seconds 1
  }
  throw ($Name + ' did not become reachable on ' + $HostName + ':' + $Port)
}

function Test-Http([string]$Url, [string]$Name, [int]$Attempts) {
  for ($index = 0; $index -lt $Attempts; $index++) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
        Write-Ok ($Name + ' responded successfully: ' + $Url)
        return
      }
    } catch {}
    Start-Sleep -Seconds 1
  }
  throw ($Name + ' did not return a successful HTTP response: ' + $Url)
}

Set-Location $RootDir
if (@('window', 'hidden') -notcontains $TerminalMode) {
  throw 'Unknown SETUP_TERMINAL_MODE. Use window or hidden.'
}

Write-Host ''
Write-Host 'Retail AI Agent Setup'
Write-Host ('Root: ' + $RootDir)
Write-Host ('Setup log: ' + $SetupLog)
Write-Host ('Terminal mode: ' + $TerminalMode)
Write-Host ''

Import-EnvFile
if ($env:SETUP_SKIP_STOP -ne '1') {
  Write-Step 'Stop old project runtime before startup'
  $stopScript = Join-Path $RootDir 'stop.ps1'
  if (Test-Path $stopScript) {
    $previousStopSkipDocker = $env:STOP_SKIP_DOCKER
    if ($env:SKIP_DOCKER -eq '1') { $env:STOP_SKIP_DOCKER = '1' }
    try {
      & $stopScript >> $SetupLog
      if (-not [string]::IsNullOrWhiteSpace($ShellSkipDocker)) { $env:SKIP_DOCKER = $ShellSkipDocker }
      Write-Ok 'Old project runtime stopped when present'
    } catch {
      if (-not [string]::IsNullOrWhiteSpace($ShellSkipDocker)) { $env:SKIP_DOCKER = $ShellSkipDocker }
      Write-Warn 'stop.ps1 reported a non-fatal cleanup issue; continuing setup'
    } finally {
      if ($null -eq $previousStopSkipDocker) {
        Remove-Item Env:STOP_SKIP_DOCKER -ErrorAction SilentlyContinue
      } else {
        $env:STOP_SKIP_DOCKER = $previousStopSkipDocker
      }
    }
  }
}
Write-Step 'Check Node.js, Corepack and pnpm'
if ($null -eq (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 20+ is required.' }
if ($null -eq (Get-Command corepack -ErrorAction SilentlyContinue)) { throw 'Corepack is required.' }
try {
  Invoke-Logged { corepack enable }
} catch {
  Write-Warn 'corepack enable failed; continuing with existing Corepack shims'
}
Invoke-Logged { corepack pnpm --version }
Write-Ok 'Node.js and pnpm checked'

Write-Step 'Install workspace dependencies'
Invoke-Logged { corepack pnpm install }
Write-Ok 'Node dependencies installed'

if ($env:SKIP_DOCKER -ne '1') {
  Write-Step 'Start PostgreSQL, Redis, Qdrant and nginx'
  $composeFile = Join-Path $RootDir 'infra\docker\docker-compose.yml'
  try {
    Invoke-Logged { docker compose -p $env:COMPOSE_PROJECT_NAME -f $composeFile up -d }
    Write-Ok 'Docker services requested'
  } catch {
    $composeError = $_.Exception.Message
    Write-Warn ('Docker compose returned a non-zero exit; checking whether provider services are actually reachable. Error: ' + $composeError)
    try {
      Test-Port '127.0.0.1' ([int]$env:POSTGRES_PORT) 'PostgreSQL' 30
      Test-Port '127.0.0.1' ([int]$env:REDIS_PORT) 'Redis' 30
      Test-Http ($env:QDRANT_URL + '/healthz') 'Qdrant' 30
      Test-Http ('http://127.0.0.1:' + $env:NGINX_PORT + '/nginx-health') 'nginx' 30
      Write-Warn 'Docker compose returned non-zero, but all provider services are reachable; continuing setup'
    } catch {
      throw ('Docker compose failed. Check Docker Desktop and make sure POSTGRES_PORT=' + $env:POSTGRES_PORT + ', REDIS_PORT=' + $env:REDIS_PORT + ', QDRANT_PORT=' + $env:QDRANT_PORT + ' and NGINX_PORT=' + $env:NGINX_PORT + ' are free, or set SKIP_DOCKER=1 with external services. Compose error: ' + $composeError + '. Reachability check: ' + $_.Exception.Message)
    }
  }
}

Write-Step 'Prepare Prisma database'
Test-Port '127.0.0.1' ([int]$env:POSTGRES_PORT) 'PostgreSQL' 90
Test-Port '127.0.0.1' ([int]$env:REDIS_PORT) 'Redis' 90
if ($env:SKIP_DOCKER -ne '1') {
  Test-Http ($env:QDRANT_URL + '/healthz') 'Qdrant' 90
  Test-Http ('http://127.0.0.1:' + $env:NGINX_PORT + '/nginx-health') 'nginx' 90
}
Invoke-Logged { corepack pnpm --filter '@retail-agent/api' db:generate }
Invoke-Logged { corepack pnpm --filter '@retail-agent/api' db:push }
Invoke-Logged { corepack pnpm --filter '@retail-agent/api' db:seed }
Write-Ok 'Database generated, pushed and seeded'

if ($env:RUN_TESTS -eq '1') {
  Write-Step 'Run typechecks and tests'
  Invoke-Logged { corepack pnpm --filter '@retail-agent/api' typecheck }
  Invoke-Logged { corepack pnpm --filter '@retail-agent/web' typecheck }
  Write-Ok 'Selected checks passed'
}

Write-Step 'Start backend and frontend'
Invoke-Logged { corepack pnpm --filter '@retail-agent/api' build }
$apiErrorLog = $ApiLog -replace '\.log$', '.error.log'
$env:PORT = $env:API_PORT
$apiEnv = @{
  API_PORT = $env:API_PORT
  PORT = $env:API_PORT
  DATABASE_URL = $env:DATABASE_URL
  CHAT_MODEL_BASE_URL = $env:CHAT_MODEL_BASE_URL
  CHAT_MODEL_ID = $env:CHAT_MODEL_ID
  EMBED_RERANK_BASE_URL = $env:EMBED_RERANK_BASE_URL
  REDIS_URL = $env:REDIS_URL
  QDRANT_URL = $env:QDRANT_URL
  CORS_ORIGINS = $env:CORS_ORIGINS
}
if ($TerminalMode -eq 'window') {
  $apiProcess = Start-RuntimeWindow 'Retail API - @retail-agent/api' $RootDir $apiEnv "corepack pnpm --filter '@retail-agent/api' start" $ApiLog
} else {
  $corepackPath = Get-CommandPath 'corepack'
  $apiProcess = Start-Process -FilePath $corepackPath -ArgumentList @('pnpm', '--filter', '@retail-agent/api', 'start') -WorkingDirectory $RootDir -RedirectStandardOutput $ApiLog -RedirectStandardError $apiErrorLog -PassThru -WindowStyle Hidden
}
Test-Port '127.0.0.1' ([int]$env:API_PORT) 'API' 90
$apiHealthUrl = 'http://127.0.0.1:' + $env:API_PORT + '/health'
$apiProductsUrl = 'http://127.0.0.1:' + $env:API_PORT + '/api/v1/products'
Test-Http $apiHealthUrl 'API health' 90
Test-Http $apiProductsUrl 'API products' 90
$webErrorLog = $WebLog -replace '\.log$', '.error.log'
$apiBaseUrl = 'http://127.0.0.1:' + $env:API_PORT
$publicApiBaseUrl = if ($env:SKIP_DOCKER -eq '1' -and -not $env:TUNNEL_PUBLIC_URL) { $apiBaseUrl } else { $env:NEXT_PUBLIC_API_BASE_URL }
$env:API_BASE_URL = $apiBaseUrl
$env:NEXT_PUBLIC_API_BASE_URL = $publicApiBaseUrl
if (-not $env:NEXT_PUBLIC_SITE_URL) { $env:NEXT_PUBLIC_SITE_URL = $publicApiBaseUrl }
$webEnv = @{
  API_BASE_URL = $apiBaseUrl
  NEXT_PUBLIC_API_BASE_URL = $publicApiBaseUrl
  NEXT_PUBLIC_SITE_URL = $env:NEXT_PUBLIC_SITE_URL
  NEXT_ALLOWED_DEV_ORIGINS = $env:NEXT_ALLOWED_DEV_ORIGINS
  PORT = $env:WEB_PORT
}
if ($TerminalMode -eq 'window') {
  $webProcess = Start-RuntimeWindow 'Retail Web - apps/web' (Join-Path $RootDir 'apps\web') $webEnv ('corepack pnpm exec next dev -H 0.0.0.0 -p ' + $env:WEB_PORT) $WebLog
} else {
  $corepackPath = Get-CommandPath 'corepack'
  $webProcess = Start-Process -FilePath $corepackPath -ArgumentList @('pnpm', 'exec', 'next', 'dev', '-H', '0.0.0.0', '-p', $env:WEB_PORT) -WorkingDirectory (Join-Path $RootDir 'apps\web') -RedirectStandardOutput $WebLog -RedirectStandardError $webErrorLog -PassThru -WindowStyle Hidden
}
Test-Port '127.0.0.1' ([int]$env:WEB_PORT) 'Web' 90
if ($env:SKIP_DOCKER -ne '1') {
  Test-Http ('http://127.0.0.1:' + $env:NGINX_PORT + '/health') 'nginx API proxy' 90
  Test-Http ('http://127.0.0.1:' + $env:NGINX_PORT + '/') 'nginx web proxy' 90
}

Set-Content -Path (Join-Path $ApiLogDir 'api.pid') -Value $apiProcess.Id -Encoding utf8
Set-Content -Path (Join-Path $WebLogDir 'web.pid') -Value $webProcess.Id -Encoding utf8

Write-Host ''
Write-Host 'Ready'
Write-Host ('Mode: ' + $TerminalMode)
Write-Host ('API: http://127.0.0.1:' + $env:API_PORT)
Write-Host ('Web: http://127.0.0.1:' + $env:WEB_PORT)
if ($env:SKIP_DOCKER -ne '1') {
  Write-Host ('Tunnel/nginx entry: http://127.0.0.1:' + $env:NGINX_PORT)
}
Write-Host ('Agent dashboard: http://127.0.0.1:' + $env:WEB_PORT + '/agent-dashboard')
Write-Host ('API health: http://127.0.0.1:' + $env:API_PORT + '/health')
Write-Host ('Setup log: ' + $SetupLog)
Write-Host ('API log: ' + $ApiLog)
Write-Host ('Web log: ' + $WebLog)
if ($TerminalMode -eq 'window') {
  Write-Host 'Terminal windows:'
  Write-Host '  Retail API - @retail-agent/api'
  Write-Host '  Retail Web - apps/web'
} else {
  Write-Host ('API pid file: ' + (Join-Path $ApiLogDir 'api.pid'))
  Write-Host ('Web pid file: ' + (Join-Path $WebLogDir 'web.pid'))
}
Write-Host ('Follow API log: Get-Content -Path "' + $ApiLog + '" -Wait')
Write-Host ('Follow Web log: Get-Content -Path "' + $WebLog + '" -Wait')
Write-Host 'Stop later with: .\stop.ps1'
