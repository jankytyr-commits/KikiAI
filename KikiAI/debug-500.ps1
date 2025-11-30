# Debug 500 Error
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

List-FtpDirectory "/www/"
List-FtpDirectory "/www/apps/kikiai/"
