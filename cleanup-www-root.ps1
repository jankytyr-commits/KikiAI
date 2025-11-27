[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
$FtpServer = "windows11.aspone.cz"
$FtpUsername = "EkoBio.org_lordkikin"
$FtpPassword = "Brzsilpot7!"

Write-Host "=== Cleanup /www/ root ===" -ForegroundColor Yellow
Write-Host "This will delete old JS, CSS, HTML, and DLL files from /www/" -ForegroundColor Red
Write-Host "Press Ctrl+C to cancel, or any key to continue..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

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

# Get list of files in /www/
$ftpUri = "ftp://$FtpServer/www/"
$request = [System.Net.FtpWebRequest]::Create($ftpUri)
$request.Credentials = $credentials
$request.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectory
$response = $request.GetResponse()
$reader = New-Object System.IO.StreamReader($response.GetResponseStream())
$files = @()
while ($line = $reader.ReadLine()) { $files += $line }
$reader.Close()
$response.Close()

$count = 0
foreach ($file in $files) {
    # Delete if it's a DLL, JS, CSS, or backup file
    if ($file -match '\.(dll|js|css|html|br|gz|pdb|exe)$' -and 
        $file -ne "KikiAI.exe" -and 
        $file -ne "web.config") {
        if (Delete-FtpFile "/www/$file") {
            $count++
        }
    }
}

Write-Host ""
Write-Host "Deleted $count files from /www/" -ForegroundColor Green
Write-Host "Kept: KikiAI.exe, web.config, appsettings.json, and folders" -ForegroundColor Cyan
