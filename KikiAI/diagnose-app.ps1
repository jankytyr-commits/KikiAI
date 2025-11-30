# App Diagnostic Script
$ftpServer = "ftp://windows11.aspone.cz"
$ftpUser = "EkoBio.org_lordkikin"
$ftpPass = "Brzsilpot7!"

# Create test file
"Hello from Static WWWROOT" | Set-Content "test-static.html"

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

function List-FtpDirectory {
    param (
        [string]$RemotePath
    )
    try {
        $uri = "$ftpServer$RemotePath"
        Write-Host "`nListing ${RemotePath}:" -ForegroundColor Yellow
        $request = [System.Net.FtpWebRequest]::Create($uri)
        $request.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $request.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectoryDetails
        $response = $request.GetResponse()
        $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
        Write-Host $reader.ReadToEnd()
        $reader.Close()
        $response.Close()
    }
    catch { Write-Host "Error listing ${RemotePath}: $_" }
}

# 1. Upload to /www/wwwroot/
Upload-File "test-static.html" "/www/wwwroot/test-static.html"

# 2. List /www/logs/
List-FtpDirectory "/www/logs/"
