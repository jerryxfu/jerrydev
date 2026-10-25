# Sends a file to Expedite (https://jerryxf.net/expedite) from PowerShell, at any size up to 16 GB:
#
#   & ([scriptblock]::Create((irm https://jerryxf.net/expedite.ps1))) <file>
#
# (A script block, so Windows' default execution policy doesn't stop it.) What expedite.sh does: up to 32 MB, the file
# goes to the API in one request; a bigger one goes straight to storage in 100 MB parts, through links the API signs,
# then the API checks the whole file. The drop lasts 12 hours, has no view limit, and its recipient can delete it.
param([Parameter(Mandatory = $true)][string] $Path)

$ErrorActionPreference = "Stop"
# Windows PowerShell 5.1 redraws its progress bar for every block it sends, which slows an upload to a crawl.
$ProgressPreference = "SilentlyContinue"
$api = "https://api.jerryxf.net/expedite/raw"

# Asks the API and gives its answer, text. When it says no, stops with its message (never `exit`: run as a script block,
# that would close the window).
function Ask([hashtable] $Request) {
    try {
        return [string] (Invoke-WebRequest -UseBasicParsing @Request).Content
    } catch {
        $message = if ($_.ErrorDetails.Message) { $_.ErrorDetails.Message } else { $_.Exception.Message }
        throw $message.Trim()
    }
}

if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "Usage: & ([scriptblock]::Create((irm https://jerryxf.net/expedite.ps1))) <file>"
}
$file = Get-Item -LiteralPath $Path

if ($file.Length -le 32000000) {
    (Ask @{Method = "Put"; Uri = "$api/$([uri]::EscapeDataString($file.Name))"; InFile = $file.FullName}).TrimEnd()
    return
}

# The SHA-256, for the receiver's hash check.
Write-Host "Computing its SHA-256..."
$sha = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLower()

$answer = (Ask @{Method = "Post"; Uri = "$api/start"; Body = @{name = $file.Name; size = $file.Length}}) -split "`n" | Where-Object { $_ }
$code = $answer[0]
$type = $answer[1]
$links = @($answer | Select-Object -Skip 2)

# A part per link, read 100 MB at a time (the API's PART_SIZE).
$partSize = 100MB
$buffer = New-Object byte[] $partSize
$etags = @()
$stream = [System.IO.File]::OpenRead($file.FullName)
try {
    for ($i = 0; $i -lt $links.Count; $i++) {
        Write-Host "Part $($i + 1) of $($links.Count)"
        # Read can give less than asked: fill the buffer, or reach the end.
        $read = 0
        while ($read -lt $partSize) {
            $n = $stream.Read($buffer, $read, $partSize - $read)
            if ($n -eq 0) { break }
            $read += $n
        }
        $part = $buffer
        if ($read -lt $partSize) {
            $part = New-Object byte[] $read
            [Array]::Copy($buffer, $part, $read)
        }
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Method Put -Uri $links[$i] -Body $part -ContentType $type
        } catch {
            throw "Part $($i + 1) didn't go through. Try again."
        }
        $etags += "$($response.Headers['ETag'])"
    }
} finally {
    $stream.Dispose()
}

(Ask @{Method = "Post"; Uri = "$api/$code/done"; Body = (@($sha) + $etags) -join "`n"; ContentType = "text/plain"}).TrimEnd()
