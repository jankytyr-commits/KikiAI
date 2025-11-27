[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
$FtpServer = "windows11.aspone.cz"
$FtpUsername = "EkoBio.org_lordkikin"
$FtpPassword = "Brzsilpot7!"

Write-Host "=== Cleanup DLLs from Root ===" -ForegroundColor Yellow
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
        Write-Host "🗑️ Deleted: $FilePath" -ForegroundColor Gray
        return $true
    }
    catch {
        Write-Host "❌ Failed to delete $FilePath : $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# List files
$ftpUri = "ftp://$FtpServer/www/"
$request = [System.Net.FtpWebRequest]::Create($ftpUri)
$request.Credentials = $credentials
$request.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectory
$request.KeepAlive = $false
$response = $request.GetResponse()
$reader = New-Object System.IO.StreamReader($response.GetResponseStream())
$files = @()
while ($line = $reader.ReadLine()) { $files += $line }
$reader.Close()
$response.Close()

$count = 0
foreach ($file in $files) {
    # Delete DLLs, PDBs, and old JSONs (except appsettings and claude_usage)
    if ($file -match '\.dll$' -or $file -match '\.pdb$' -or ($file -match '\.json$' -and $file -notmatch 'appsettings' -and $file -notmatch 'claude_usage')) {
        Delete-FtpFile "/www/$file"
        $count++
    }
}

Write-Host "Deleted $count files." -ForegroundColor Green
