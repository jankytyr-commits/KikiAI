# Tento skript smaže všechny soubory z /www/wwwroot/ (kromě složek)
# a pak použije robustní deployment pro nahrání celé aplikace do /www/

[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
$FtpServer = "windows11.aspone.cz"
$FtpUsername = "EkoBio.org_lordkikin"
$FtpPassword = "Brzsilpot7!"

Write-Host "=== Cleanup /www/wwwroot/ ===" -ForegroundColor Yellow
Write-Host "WARNING: This will delete all files from /www/wwwroot/" -ForegroundColor Red
Write-Host "Press Ctrl+C to cancel, or any key to continue..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

$credentials = New-Object System.Net.NetworkCredential($FtpUsername, $FtpPassword)

function Delete-FtpFile {
    param (
        [string]$FilePath
    )
    
    $ftpUri = "ftp://$FtpServer$FilePath"
    
    try {
        $request = [System.Net.FtpWebRequest]::Create($ftpUri)
        $request.Credentials = $credentials
        $request.Method = [System.Net.WebRequestMethods+Ftp]::DeleteFile
        $request.UseBinary = $true
        $request.KeepAlive = $false
        
        $response = $request.GetResponse()
        $response.Close()
        
        Write-Host "✅ Deleted: $FilePath" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Failed to delete $FilePath : $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# List files in /www/wwwroot/
$ftpUri = "ftp://$FtpServer/www/wwwroot/"
$request = [System.Net.FtpWebRequest]::Create($ftpUri)
$request.Credentials = $credentials
$request.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectoryDetails
$request.UseBinary = $true
$request.KeepAlive = $false

$response = $request.GetResponse()
$responseStream = $response.GetResponseStream()
$reader = New-Object System.IO.StreamReader($responseStream)

$files = @()
while ($line = $reader.ReadLine()) {
    # Skip directories (lines starting with 'd')
    if ($line -notmatch '^d') {
        # Extract filename (last part after spaces)
        if ($line -match '([^\s]+)$') {
            $filename = $matches[1]
            if ($filename -and $filename -ne '.' -and $filename -ne '..') {
                $files += $filename
            }
        }
    }
}

$reader.Close()
$responseStream.Close()
$response.Close()

Write-Host "`nFound $($files.Count) files to delete" -ForegroundColor Cyan

$deleted = 0
$failed = 0

foreach ($file in $files) {
    if (Delete-FtpFile "/www/wwwroot/$file") {
        $deleted++
    }
    else {
        $failed++
    }
}

Write-Host "`n=== Summary ===" -ForegroundColor Green
Write-Host "Deleted: $deleted"
Write-Host "Failed: $failed"
Write-Host "`nNow run deploy-robust.ps1 to upload the complete application to /www/" -ForegroundColor Yellow
