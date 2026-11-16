# Installs the Expedite CLI (https://jerryxf.net/expedite) on Windows, or updates it:
#
#   irm https://jerryxf.net/expedite/install.ps1 | iex
#
# It fetches the latest release for this system from GitHub (https://github.com/jerryxfu/expedite-cli), checks it
# against the release's checksums, puts expedite.exe in %LOCALAPPDATA%\Programs\expedite (or in $env:EXPEDITE_DIR when
# it's set), and adds that folder to your PATH.

# In a script block, run on the last line: a script cut short on its way here runs nothing.
& {
    $ErrorActionPreference = "Stop"
    # Windows PowerShell 5.1 shows a progress bar that slows a download many times over.
    $ProgressPreference = "SilentlyContinue"
    [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

    $release = "https://github.com/jerryxfu/expedite-cli/releases/latest/download"
    $dir = if ($env:EXPEDITE_DIR) { $env:EXPEDITE_DIR } else { Join-Path $env:LOCALAPPDATA "Programs\expedite" }

    # A 32-bit PowerShell on a 64-bit Windows has the system's own in PROCESSOR_ARCHITEW6432.
    $processor = if ($env:PROCESSOR_ARCHITEW6432) { $env:PROCESSOR_ARCHITEW6432 } else { $env:PROCESSOR_ARCHITECTURE }
    $arch = switch ($processor) {
        "AMD64" { "amd64" }
        "ARM64" { "arm64" }
        default { throw "There's no build of expedite for this processor ($processor)." }
    }

    $archive = "expedite_windows_$arch.zip"
    $tmp = Join-Path ([IO.Path]::GetTempPath()) ("expedite-" + [guid]::NewGuid())
    New-Item -ItemType Directory -Path $tmp | Out-Null
    try {
        Write-Host "Downloading expedite for Windows $arch..."
        Invoke-WebRequest -UseBasicParsing "$release/$archive" -OutFile (Join-Path $tmp $archive)
        Invoke-WebRequest -UseBasicParsing "$release/checksums.txt" -OutFile (Join-Path $tmp "checksums.txt")

        # The archive's SHA-256, against the release's list.
        $line = Get-Content (Join-Path $tmp "checksums.txt") | Where-Object { $_.EndsWith(" $archive") } | Select-Object -First 1
        $want = if ($line) { $line.Split(" ")[0] } else { "" }
        $got = (Get-FileHash (Join-Path $tmp $archive) -Algorithm SHA256).Hash
        if ($got -ne $want) {
            throw "The download doesn't match the release's checksum. Nothing was installed."
        }

        Expand-Archive (Join-Path $tmp $archive) -DestinationPath $tmp -Force
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
        Move-Item -Force (Join-Path $tmp "expedite.exe") (Join-Path $dir "expedite.exe")
    }
    finally {
        Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
    }

    $version = & (Join-Path $dir "expedite.exe") version
    Write-Host "Installed expedite $version in $dir."

    # Your own PATH, not the system's: no administrator needed.
    $path = [Environment]::GetEnvironmentVariable("Path", "User")
    if (($path -split ";") -notcontains $dir) {
        [Environment]::SetEnvironmentVariable("Path", (($path, $dir | Where-Object { $_ }) -join ";"), "User")
        Write-Host "Added $dir to your PATH. Open a new terminal to use expedite."
    }
}
