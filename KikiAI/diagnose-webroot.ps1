# Webroot Diagnostic Script
$ftpServer = "ftp://windows11.aspone.cz"
$ftpUser = "EkoBio.org_lordkikin"
$ftpPass = "Brzsilpot7!"

# Create a test file
"Hello from Root" | Set-Content "test-root.html"
"Hello from WWW" | Set-Content "test-www.html"

function Upload-File {
    param (
        [string]$LocalPath,
        [string]$RemotePath
    )
    try {
        $uri = "$ftpServer$RemotePath"
        Write-Host "Uploading to $RemotePath..." -NoNewline
        $webclient = New-Object System.Net.WebClient
        $webclient.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $webclient.UploadFile($uri, $LocalPath)
        Write-Host " Done" -ForegroundColor Green
    }
    catch {
        Write-Host " Failed: $_" -ForegroundColor Red
    }
}

# 1. Upload to /
Upload-File "test-root.html" "/test-root.html"

# 2. Upload to /www/
Upload-File "test-www.html" "/www/test-www.html"

# 3. List root to see what's there
Write-Host "`nListing Root /:" -ForegroundColor Yellow
try {
    $request = [System.Net.FtpWebRequest]::Create($ftpServer)
    $request.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
    $request.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectoryDetails
    $response = $request.GetResponse()
    $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
    Write-Host $reader.ReadToEnd()
    $reader.Close()
    $response.Close()
}
catch { Write-Host "Error listing root: $_" }
