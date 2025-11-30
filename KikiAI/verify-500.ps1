# Verify FTP Content and Web.Config
$ftpServer = "ftp://windows11.aspone.cz"
$ftpUser = "EkoBio.org_lordkikin"
$ftpPass = "Brzsilpot7!"

function List-FtpDirectory {
    param ([string]$RemotePath)
    try {
        $uri = "$ftpServer$RemotePath"
        Write-Host "`n=== Listing ${RemotePath} ===" -ForegroundColor Yellow
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

function Read-FtpFile {
    param ([string]$RemotePath)
    try {
        $uri = "$ftpServer$RemotePath"
        Write-Host "`n=== Reading ${RemotePath} ===" -ForegroundColor Yellow
        $webclient = New-Object System.Net.WebClient
        $webclient.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $content = $webclient.DownloadString($uri)
        Write-Host $content
    }
    catch { Write-Host "Error reading ${RemotePath}: $_" }
}

# 1. Check Root (should be clean)
List-FtpDirectory "/www/"

# 2. Check App Dir (should have backend files)
List-FtpDirectory "/www/apps/kikiai/"

# 3. Read web.config in App Dir
Read-FtpFile "/www/apps/kikiai/web.config"
