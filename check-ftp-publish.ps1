[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
$FtpServer = "windows11.aspone.cz"
$FtpUsername = "EkoBio.org_lordkikin"
$FtpPassword = "Brzsilpot7!"

Write-Host "=== Check and Remove 'publish' directory from FTP ===" -ForegroundColor Yellow
$credentials = New-Object System.Net.NetworkCredential($FtpUsername, $FtpPassword)

function Delete-FtpDirectory {
    param ([string]$DirPath)
    $ftpUri = "ftp://$FtpServer$DirPath"
    try {
        # Try to delete the directory
        $request = [System.Net.FtpWebRequest]::Create($ftpUri)
        $request.Credentials = $credentials
        $request.Method = [System.Net.WebRequestMethods+Ftp]::RemoveDirectory
        $request.KeepAlive = $false
        $request.GetResponse().Close()
        Write-Host "[DEL] Deleted directory: $DirPath" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "[INFO] Directory $DirPath does not exist or is not empty" -ForegroundColor Gray
        return $false
    }
}

# Check if publish directory exists
$ftpUri = "ftp://$FtpServer/www/"
$request = [System.Net.FtpWebRequest]::Create($ftpUri)
$request.Credentials = $credentials
$request.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectory
$request.KeepAlive = $false

try {
    $response = $request.GetResponse()
    $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
    $items = @()
    while ($line = $reader.ReadLine()) { $items += $line }
    $reader.Close()
    $response.Close()
    
    if ($items -contains "publish") {
        Write-Host "Found 'publish' directory on FTP. This should not be there!" -ForegroundColor Red
        Write-Host "Note: Cannot auto-delete non-empty directories via FTP." -ForegroundColor Yellow
        Write-Host "Please delete it manually via FTP client or contact hosting support." -ForegroundColor Yellow
    }
    else {
        Write-Host "Good! No 'publish' directory found on FTP." -ForegroundColor Green
    }
}
catch {
    Write-Host "Error checking FTP: $($_.Exception.Message)" -ForegroundColor Red
}
