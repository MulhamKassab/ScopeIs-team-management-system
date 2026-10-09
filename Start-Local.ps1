$ErrorActionPreference = 'Stop'
$taskRuntime = Join-Path $env:LOCALAPPDATA 'ScopeIsLocal'
$taskPgCtl = Join-Path $taskRuntime 'pgsql\bin\pg_ctl.exe'
$taskPgData = Join-Path $taskRuntime 'team-management-pgdata'
$taskNext = Join-Path $PSScriptRoot 'node_modules\next\dist\bin\next'
$taskNode = (Get-Command node.exe -ErrorAction Stop).Source

if (!(Test-Path -LiteralPath (Join-Path $PSScriptRoot '.env')) -or !(Test-Path -LiteralPath $taskNext)) {
    throw 'The local environment or installed dependencies are missing.'
}

& $taskPgCtl -D $taskPgData status *> $null
if ($LASTEXITCODE -ne 0) {
    & $taskPgCtl -D $taskPgData -l (Join-Path $taskRuntime 'postgresql.log') -w start
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL could not start.' }
}

$taskListener = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($taskListener) {
    $taskOwner = Get-CimInstance Win32_Process -Filter "ProcessId=$($taskListener.OwningProcess)"
    if (!$taskOwner.CommandLine -or !$taskOwner.CommandLine.Contains($PSScriptRoot, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Port 3000 is already being used by another application.'
    }
    Write-Output 'ScopeIs is already running at http://127.0.0.1:3000'
    exit 0
}

# Calling Node directly avoids npm's Windows command shims and the ampersand in this folder path.
$taskArguments = @(('"{0}"' -f $taskNext), 'dev', '--hostname', '127.0.0.1', '--port', '3000')
$taskProcess = Start-Process -FilePath $taskNode -ArgumentList $taskArguments -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskRuntime 'next.stdout.log') -RedirectStandardError (Join-Path $taskRuntime 'next.stderr.log') -PassThru
Set-Content -LiteralPath (Join-Path $taskRuntime 'next.pid') -Value $taskProcess.Id
Write-Output 'ScopeIs is starting at http://127.0.0.1:3000'
Write-Output "Logs: $taskRuntime"
