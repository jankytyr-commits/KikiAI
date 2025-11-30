# List FTP directory contents
$ftpServer = "ftp://windows11.aspone.cz"
$ftpUser = "EkoBio.org_lordkikin"
$ftpPass = "Brzsilpot7!"

function List-FtpDirectory {
    param (
        [string]$RemotePath = "/"
    )
    
    try {
        $uri = "$ftpServer$RemotePath"
        Write-Host "Listing: $uri" -ForegroundColor Cyan
        
        $request = [System.Net.FtpWebRequest]::Create($uri)
        $request.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $request.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectoryDetails
        
        $response = $request.GetResponse()
        $stream = $response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        
        $content = $reader.ReadToEnd()
        Write-Host $content
        
        $reader.Close()
        $response.Close()
    }
    catch {
        Write-Host "Error: $_" -ForegroundColor Red
    }
}

Write-Host "=== Root Directory ===" -ForegroundColor Yellow
List-FtpDirectory "/"

Write-Host "`n=== /www/ Directory ===" -ForegroundColor Yellow
List-FtpDirectory "/www/"
