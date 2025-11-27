[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
$FtpServer = "windows11.aspone.cz"
$FtpUsername = "EkoBio.org_lordkikin"
$FtpPassword = "Brzsilpot7!"
$RemotePath = "/www/wwwroot/"

Write-Host "=== Quick Upload: JS & HTML Files ===" -ForegroundColor Green

$credentials = New-Object System.Net.NetworkCredential($FtpUsername, $FtpPassword)

# Files to upload (from wwwroot)
$filesToUpload = @(
    @{ Local = ".\KikiAI\wwwroot\index.html"; Remote = "index.html" },
    @{ Local = ".\KikiAI\wwwroot\chat-helpers.js"; Remote = "chat-helpers.js" },
    @{ Local = ".\KikiAI\wwwroot\chat-helpers-debug.js"; Remote = "chat-helpers-debug.js" },
    @{ Local = ".\KikiAI\wwwroot\app.js"; Remote = "app.js" },
    @{ Local = ".\KikiAI\wwwroot\message-ui.js"; Remote = "message-ui.js" }
)

$uploaded = 0
$failed = 0

foreach ($fileInfo in $filesToUpload) {
    $localFile = $fileInfo.Local
    $remoteName = $fileInfo.Remote
    
    if (-not (Test-Path $localFile)) {
        Write-Host "SKIP: $remoteName (file not found)" -ForegroundColor Yellow
        continue
    }
    
    $ftpUri = "ftp://$FtpServer$RemotePath$remoteName"
    
    try {
        $request = [System.Net.FtpWebRequest]::Create($ftpUri)
        $request.Credentials = $credentials
        $request.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
        $request.UseBinary = $true
        $request.KeepAlive = $false
        $request.EnableSsl = $false
        
        $fileContent = [System.IO.File]::ReadAllBytes($localFile)
        $request.ContentLength = $fileContent.Length
        
        $requestStream = $request.GetRequestStream()
        $requestStream.Write($fileContent, 0, $fileContent.Length)
        $requestStream.Close()
        
        $response = $request.GetResponse()
        $response.Close()
        
        $uploaded++
        Write-Host "✅ OK: $remoteName" -ForegroundColor Green
    }
    catch {
        $failed++
        Write-Host "❌ FAIL: $remoteName - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Done! Uploaded: $uploaded, Failed: $failed" -ForegroundColor Green
Write-Host ""
Write-Host "🔄 Refresh your browser with Ctrl+F5 to see changes!" -ForegroundColor Cyan
