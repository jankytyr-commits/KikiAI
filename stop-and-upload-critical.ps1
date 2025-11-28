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

function Delete-File {
    param($remoteName)
    try {
        $ftpUri = "ftp://$FtpServer$RemotePath$remoteName"
        $request = [System.Net.FtpWebRequest]::Create($ftpUri)
        $request.Credentials = $credentials
        $request.Method = [System.Net.WebRequestMethods+Ftp]::DeleteFile
        $request.KeepAlive = $false
        $request.GetResponse().Close()
        Write-Host "[DEL] Deleted: $remoteName" -ForegroundColor Yellow
    }
    catch {
        # Ignore
    }
}

# 1. Stop App
Write-Host "Stopping app..." -ForegroundColor Yellow
Set-Content "app_offline.htm" "<html><body>App is updating...</body></html>"
Upload-File "app_offline.htm" "app_offline.htm"

Write-Host "Waiting 5s..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

# 2. Upload Critical Files
$criticalFiles = @(
    "Microsoft.AspNetCore.Server.IIS.dll",
    "Microsoft.AspNetCore.Server.IISIntegration.dll",
    "Microsoft.AspNetCore.Server.Kestrel.dll",
    "Microsoft.AspNetCore.Server.Kestrel.Core.dll",
    "Microsoft.AspNetCore.Hosting.dll",
    "Microsoft.AspNetCore.Hosting.Abstractions.dll",
    "Microsoft.AspNetCore.Http.Abstractions.dll",
    "Microsoft.AspNetCore.Http.dll",
    "Microsoft.AspNetCore.Http.Extensions.dll",
    "Microsoft.AspNetCore.Http.Features.dll"
)

foreach ($file in $criticalFiles) {
    $localFile = "$LocalPath\$file"
    if (Test-Path $localFile) {
        Upload-File $localFile $file
    }
}

# 3. Start App
Write-Host "Starting app..." -ForegroundColor Green
Delete-File "app_offline.htm"
