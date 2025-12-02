# Delete and re-upload index-mod.html to clear server cache
$ftpServer = "ftp://windows11.aspone.cz"
$ftpUser = "EkoBio.org_lordkikin"
$ftpPass = "Brzsilpot7!"
$localPath = ".\CommanderGem"
$remotePath = "/www/wwwroot/apps/commandergem"

Write-Host "=== Fixing index-mod.html (Delete + Re-upload) ===" -ForegroundColor Cyan

# Step 1: Delete the old file
try {
    $uri = "$ftpServer$remotePath/index-mod.html"
    Write-Host "Step 1: Deleting old index-mod.html..." -ForegroundColor Yellow
    
    $request = [System.Net.FtpWebRequest]::Create($uri)
    $request.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
    $request.Method = [System.Net.WebRequestMethods+Ftp]::DeleteFile
    
    $response = $request.GetResponse()
    $response.Close()
    
    Write-Host "  Deleted successfully!" -ForegroundColor Green
    Start-Sleep -Seconds 2
}
catch {
    Write-Host "  Warning: Could not delete (may not exist): $_" -ForegroundColor Yellow
}

# Step 2: Upload the new file
try {
    $uri = "$ftpServer$remotePath/index-mod.html"
    Write-Host "Step 2: Uploading fresh index-mod.html..." -ForegroundColor Yellow
    
    $webclient = New-Object System.Net.WebClient
    $webclient.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
    $webclient.UploadFile($uri, "$localPath\index-mod.html")
    
    Write-Host "  Uploaded successfully!" -ForegroundColor Green
}
catch {
    Write-Host "  FAILED: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`nDone! The file should now be fresh on the server." -ForegroundColor Cyan
Write-Host "Test: http://www.ekobio.org/apps/commandergem/index-mod.html" -ForegroundColor Gray
