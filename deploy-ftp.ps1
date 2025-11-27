[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
$FtpServer = "windows11.aspone.cz"
$FtpUsername = "EkoBio.org_lordkikin"
$FtpPassword = "Brzsilpot7!"
$LocalPath = ".\KikiAI\publish"
$RemotePath = "/www/"

Write-Host "=== Uploading to FTP (Root) ===" -ForegroundColor Green
Write-Host "Server: $FtpServer" -ForegroundColor Cyan
Write-Host "Path: $RemotePath" -ForegroundColor Cyan
Write-Host ""

$credentials = New-Object System.Net.NetworkCredential($FtpUsername, $FtpPassword)
$files = Get-ChildItem -Path $LocalPath -Recurse -File | Where-Object { $_.Extension -ne '.gz' -and $_.FullName -notmatch '[\\/]publish[\\/]publish' }

# Function to create directory
function Create-FtpDirectory {
    param($uri)
    try {
        $request = [System.Net.FtpWebRequest]::Create($uri)
        $request.Credentials = $credentials
        $request.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        $request.KeepAlive = $false
        $request.EnableSsl = $false
        $request.GetResponse() | Out-Null
        Write-Host "Created directory: $uri" -ForegroundColor Gray
    }
    catch {
        # Directory likely exists
    }
}

Write-Host "Found $($files.Count) files. Creating directories..." -ForegroundColor Yellow

# Create logs directory
Create-FtpDirectory "ftp://$FtpServer$RemotePath/logs"

# Create empty wwwroot directory (required by ASP.NET Core even if files are in root)
Create-FtpDirectory "ftp://$FtpServer$RemotePath/wwwroot"

# Create all directories first
$directories = $files | ForEach-Object {
    $localPathFull = (Resolve-Path $LocalPath).Path
    $relativePath = $_.DirectoryName.Substring($localPathFull.Length).Replace('\', '/')
    if ($relativePath.StartsWith('/')) { $relativePath = $relativePath.Substring(1) }
    
    # Flatten wwwroot - files go to root, but we keep wwwroot folder empty
    if ($relativePath -eq "wwwroot") { return $null }
    if ($relativePath.StartsWith("wwwroot/")) { $relativePath = $relativePath.Substring(8) }
    
    if ($relativePath) { $relativePath }
} | Select-Object -Unique | Sort-Object

foreach ($dir in $directories) {
    # Create nested directories one by one
    $parts = $dir.Split('/')
    $currentPath = ""
    foreach ($part in $parts) {
        if ($currentPath) { $currentPath += "/" }
        $currentPath += $part
        $uri = "ftp://$FtpServer$RemotePath$currentPath"
        Create-FtpDirectory $uri
    }
}

Write-Host "Uploading files..." -ForegroundColor Yellow
$uploaded = 0
$failed = 0

foreach ($file in $files) {
    $localPathFull = (Resolve-Path $LocalPath).Path
    $relativePath = $file.FullName.Substring($localPathFull.Length + 1).Replace('\', '/')
    
    # Flatten wwwroot
    if ($relativePath.StartsWith("wwwroot/")) { $relativePath = $relativePath.Substring(8) }
    $ftpUri = "ftp://$FtpServer$RemotePath$relativePath"
    
    try {
        $request = [System.Net.FtpWebRequest]::Create($ftpUri)
        $request.Credentials = $credentials
        $request.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
        $request.UseBinary = $true
        $request.KeepAlive = $false
        $request.EnableSsl = $false
        
        $fileContent = [System.IO.File]::ReadAllBytes($file.FullName)
        $request.ContentLength = $fileContent.Length
        
        $requestStream = $request.GetRequestStream()
        $requestStream.Write($fileContent, 0, $fileContent.Length)
        $requestStream.Close()
        
        $response = $request.GetResponse()
        $response.Close()
        
        $uploaded++
        Write-Host "OK: $relativePath" -ForegroundColor Green
    }
    catch {
        $failed++
        Write-Host "FAIL: $relativePath - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Done! Uploaded: $uploaded, Failed: $failed" -ForegroundColor Green
