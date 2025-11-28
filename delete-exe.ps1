[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
$FtpServer = "windows11.aspone.cz"
$FtpUsername = "EkoBio.org_lordkikin"
$FtpPassword = "Brzsilpot7!"

$credentials = New-Object System.Net.NetworkCredential($FtpUsername, $FtpPassword)

function Delete-FtpFile {
    param ([string]$FilePath)
    $ftpUri = "ftp://$FtpServer$FilePath"
    try {
        $request = [System.Net.FtpWebRequest]::Create($ftpUri)
        $request.Credentials = $credentials
        $request.Method = [System.Net.WebRequestMethods+Ftp]::DeleteFile
        $request.KeepAlive = $false
        $request.GetResponse().Close()
        Write-Host "[DEL] $FilePath" -ForegroundColor Gray
        return $true
    }
    catch {
        return $false
    }
}

Delete-FtpFile "/www/KikiAI.exe"
Write-Host "Deleted old KikiAI.exe" -ForegroundColor Green
