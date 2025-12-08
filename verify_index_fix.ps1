$server = "ftp://windows11.aspone.cz"
$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"

try {
    $req = [System.Net.FtpWebRequest]::Create("$server/www/wwwroot/apps/KiStorybook/index.html")
    $req.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
    $req.Method = [System.Net.WebRequestMethods+Ftp]::DownloadFile
    
    $response = $req.GetResponse()
    $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
    $content = $reader.ReadToEnd()
    $reader.Close()
    $response.Close()
    
    # Check if it has the new priority order
    if ($content -match "Try stories\.txt FIRST") {
        Write-Host "✓ index.html HAS the fix (stories.txt first)" -ForegroundColor Green
    }
    else {
        Write-Host "✗ index.html DOESN'T have the fix!" -ForegroundColor Red
    }
    
    # Check what it tries to fetch first
    if ($content -match "fetch\('stories\.txt") {
        Write-Host "✓ Fetches stories.txt" -ForegroundColor Green
    }
    else {
        Write-Host "✗ Doesn't fetch stories.txt first" -ForegroundColor Red
    }
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
