$server = "ftp://windows11.aspone.cz"
$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"
$url = "$server/www/wwwroot/apps/commandergem/index.html"

Write-Host "Checking remote index.html content..." -ForegroundColor Cyan

try {
    $wc = New-Object System.Net.WebClient
    $wc.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
    $content = $wc.DownloadString($url)
    
    if ($content -match 'id="downloadApp"') {
        Write-Host "SUCCESS: Button code FOUND in remote file." -ForegroundColor Green
        $lines = $content -split "`n" | Select-String "downloadApp" -Context 2, 2
        Write-Host "Snippet:" -ForegroundColor Yellow
        $lines | Out-String | Write-Host
    }
    else {
        Write-Host "FAILURE: Button code NOT found in remote file." -ForegroundColor Red
    }
}
catch {
    Write-Host "Error downloading file: $_" -ForegroundColor Red
}
