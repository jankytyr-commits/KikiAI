$server = "ftp://windows11.aspone.cz"
$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"

try {
    # Add timestamp to avoid cache
    $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $req = [System.Net.FtpWebRequest]::Create("$server/www/wwwroot/apps/KiStorybook/stories.txt?t=$timestamp")
    $req.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
    $req.Method = [System.Net.WebRequestMethods+Ftp]::DownloadFile
    $req.UseBinary = $true
    
    $response = $req.GetResponse()
    $stream = $response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $content = $reader.ReadToEnd()
    $reader.Close()
    $stream.Close()
    $response.Close()
    
    Write-Host "=== Fresh content from FTP ===" -ForegroundColor Cyan
    Write-Host $content
    
    # Check if it contains the new URL
    if ($content -match "http://www.ekobio.org/wwwroot") {
        Write-Host "`n✓ File contains NEW URLs!" -ForegroundColor Green
    }
    else {
        Write-Host "`n✗ File still has OLD URLs!" -ForegroundColor Red
    }
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
