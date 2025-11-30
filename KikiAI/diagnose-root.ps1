# Diagnose Root Deployment
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

function Get-Latest-Log {
    try {
        $uri = "$ftpServer/www/logs/"
        $request = [System.Net.FtpWebRequest]::Create($uri)
        $request.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $request.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectory
        $response = $request.GetResponse()
        $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
        $files = $reader.ReadToEnd() -split "`r`n" | Where-Object { $_ -ne "" } | Sort-Object
        $reader.Close()
        $response.Close()

        if ($files.Count -gt 0) {
            $latestLog = $files[-1]
            $logUri = "$ftpServer/www/logs/$latestLog"
            Write-Host "`n=== Reading Latest Log: $latestLog ===" -ForegroundColor Yellow
            $webclient = New-Object System.Net.WebClient
            $webclient.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
            $content = $webclient.DownloadString($logUri)
            Write-Host $content
        }
        else {
            Write-Host "No logs found." -ForegroundColor Red
        }
    }
    catch { Write-Host "Error reading logs: $_" -ForegroundColor Red }
}

# Check Structure
List-FtpDirectory "/www/"
List-FtpDirectory "/www/apps/kikiai/"

# Check Logs
Get-Latest-Log
