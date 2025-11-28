[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
$FtpServer = "windows11.aspone.cz"
$FtpUsername = "EkoBio.org_lordkikin"
$FtpPassword = "Brzsilpot7!"
$LocalPath = ".\KikiAI\publish"
$RemotePath = "/www/"

$credentials = New-Object System.Net.NetworkCredential($FtpUsername, $FtpPassword)

function Upload-File {
    param($localFile, $remoteName)
    try {
        $ftpUri = "ftp://$FtpServer$RemotePath$remoteName"
        $request = [System.Net.FtpWebRequest]::Create($ftpUri)
        $request.Credentials = $credentials
        $request.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
        $request.UseBinary = $true
        $request.KeepAlive = $false
        
        $content = [System.IO.File]::ReadAllBytes($localFile)
        $request.ContentLength = $content.Length
        $s = $request.GetRequestStream()
        $s.Write($content, 0, $content.Length)
        $s.Close()
        $request.GetResponse().Close()
        Write-Host "[OK] Uploaded: $remoteName" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "[FAIL] Failed to upload $remoteName : $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Check-File-Exists {
    param($remoteName)
    $ftpUri = "ftp://$FtpServer$RemotePath$remoteName"
    try {
        $request = [System.Net.FtpWebRequest]::Create($ftpUri)
        $request.Credentials = $credentials
        $request.Method = [System.Net.WebRequestMethods+Ftp]::GetFileSize
        $request.KeepAlive = $false
        $response = $request.GetResponse()
        $response.Close()
        return $true
    }
    catch {
        return $false
    }
}

Write-Host "=== Uploading Missing Files ===" -ForegroundColor Cyan

$files = Get-ChildItem -Path $LocalPath -Recurse -File
foreach ($file in $files) {
    $relativePath = $file.FullName.Substring((Resolve-Path $LocalPath).Path.Length + 1).Replace('\', '/')
    
    # Check if file exists on server
    if (-not (Check-File-Exists $relativePath)) {
        Write-Host "Missing: $relativePath - Uploading..." -ForegroundColor Yellow
        Upload-File $file.FullName $relativePath
    }
    # else {
    #     Write-Host "Exists: $relativePath" -ForegroundColor Gray
    # }
}

Write-Host "Sync Complete!" -ForegroundColor Green
