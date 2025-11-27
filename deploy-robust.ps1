[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
$FtpServer = "windows11.aspone.cz"
$FtpUsername = "EkoBio.org_lordkikin"
$FtpPassword = "Brzsilpot7!"
$LocalPath = ".\KikiAI\publish"
$RemotePath = "/www/"
$AppOfflinePath = ".\app_offline.htm"

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
        $request.EnableSsl = $false
        
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

function Ensure-Directory {
    param($remotePath)
    $parts = $remotePath.Split('/')
    $currentPath = ""
    foreach ($part in $parts) {
        if ($part -eq "") { continue }
        $currentPath += "/" + $part
        $ftpUri = "ftp://$FtpServer$currentPath"
        try {
            $request = [System.Net.FtpWebRequest]::Create($ftpUri)
            $request.Credentials = $credentials
            $request.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
            $request.KeepAlive = $false
            $request.GetResponse().Close()
            Write-Host "[DIR] Created directory: $currentPath" -ForegroundColor Gray
        }
        catch {
            # Ignore error if directory already exists
        }
    }
}

function Delete-File {
    param($remoteName)
    try {
        $ftpUri = "ftp://$FtpServer$RemotePath$remoteName"
        $request = [System.Net.FtpWebRequest]::Create($ftpUri)
        $request.Credentials = $credentials
        $request.Method = [System.Net.WebRequestMethods+Ftp]::DeleteFile
        $request.KeepAlive = $false
        $request.EnableSsl = $false
        $request.GetResponse().Close()
        Write-Host "[DEL] Deleted: $remoteName" -ForegroundColor Yellow
    }
    catch {
        Write-Host "[WARN] Could not delete $remoteName (maybe didn't exist)" -ForegroundColor Gray
    }
}

# 1. STOP APP
Write-Host "Stopping app (uploading app_offline.htm)..." -ForegroundColor Yellow
if (Test-Path $AppOfflinePath) {
    Upload-File $AppOfflinePath "app_offline.htm"
}
else {
    Set-Content "app_offline.htm" "<html><body>App is updating...</body></html>"
    Upload-File "app_offline.htm" "app_offline.htm"
}

Write-Host "Waiting 5s for app to release locks..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

# 2. UPLOAD FILES
Write-Host "Uploading published files..." -ForegroundColor Cyan
$files = Get-ChildItem -Path $LocalPath -Recurse -File
foreach ($file in $files) {
    $relativePath = $file.FullName.Substring((Resolve-Path $LocalPath).Path.Length + 1).Replace('\', '/')
    
    # Ensure directory exists
    $directory = [System.IO.Path]::GetDirectoryName($relativePath).Replace('\', '/')
    if ($directory) {
        Ensure-Directory "$RemotePath$directory"
    }
    
    Upload-File $file.FullName $relativePath
}

# 3. START APP
Write-Host "Starting app (removing app_offline.htm)..." -ForegroundColor Green
Delete-File "app_offline.htm"

Write-Host "Deployment Complete!" -ForegroundColor Green
