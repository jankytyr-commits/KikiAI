[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
$FtpServer = "windows11.aspone.cz"
$FtpUsername = "EkoBio.org_lordkikin"
$FtpPassword = "Brzsilpot7!"

Write-Host "=== Cleanup Old Files from wwwroot Root ===" -ForegroundColor Yellow
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
        Write-Host "[SKIP] $FilePath" -ForegroundColor Yellow
        return $false
    }
}

# Old files to delete (they should be in js/ and css/ folders now)
$filesToDelete = @(
    "/www/wwwroot/app.js",
    "/www/wwwroot/app.js.br",
    "/www/wwwroot/app.js.gz",
    "/www/wwwroot/chat-helpers-debug.js",
    "/www/wwwroot/chat-helpers.js",
    "/www/wwwroot/chat-helpers.js.br",
    "/www/wwwroot/chat-helpers.js.gz",
    "/www/wwwroot/html-preview.js",
    "/www/wwwroot/html-preview.js.br",
    "/www/wwwroot/html-preview.js.gz",
    "/www/wwwroot/loadClaudeUsage-temp.js",
    "/www/wwwroot/message-ui.js",
    "/www/wwwroot/message-ui.js.br",
    "/www/wwwroot/message-ui.js.gz",
    "/www/wwwroot/style-inline-buttons.css",
    "/www/wwwroot/style-inline-buttons.css.br",
    "/www/wwwroot/style-inline-buttons.css.gz",
    "/www/wwwroot/style.css",
    "/www/wwwroot/style.css.br",
    "/www/wwwroot/style.css.gz"
)

$count = 0
foreach ($file in $filesToDelete) {
    if (Delete-FtpFile $file) {
        $count++
    }
}

Write-Host "`nDeleted $count old files from wwwroot root." -ForegroundColor Green
Write-Host "Files are now organized in js/ and css/ folders." -ForegroundColor Cyan
