[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
$FtpServer = "windows11.aspone.cz"
$FtpUsername = "EkoBio.org_lordkikin"
$FtpPassword = "Brzsilpot7!"

Write-Host "=== Cleanup Backup Files ===" -ForegroundColor Yellow
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
        Write-Host "[DEL] Deleted: $FilePath" -ForegroundColor Gray
        return $true
    }
    catch {
        Write-Host "[SKIP] Could not delete $FilePath : $($_.Exception.Message)" -ForegroundColor Yellow
        return $false
    }
}

# Files to delete
$filesToDelete = @(
    "/www/wwwroot/index.html.backup",
    "/www/wwwroot/index.html.broken_backup",
    "/www/wwwroot/index_clean.html",
    "/www/wwwroot/index_clean.html.br",
    "/www/wwwroot/index_clean.html.gz",
    "/www/wwwroot/js/loadClaudeUsage-temp.js",
    "/www/wwwroot/js/loadClaudeUsage-temp.js.br",
    "/www/wwwroot/js/loadClaudeUsage-temp.js.gz"
)

$count = 0
foreach ($file in $filesToDelete) {
    if (Delete-FtpFile $file) {
        $count++
    }
}

Write-Host "Deleted $count files." -ForegroundColor Green
Write-Host ""
Write-Host "Kept .gz and .br files (they are useful for compression)" -ForegroundColor Cyan
