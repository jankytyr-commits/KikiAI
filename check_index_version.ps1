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
    if ($content -like "*Try stories.txt FIRST*") {
        Write-Host "SUCCESS: index.html HAS the fix!" -ForegroundColor Green
    }
    else {
        Write-Host "PROBLEM: index.html doesn't have the fix" -ForegroundColor Red
        Write-Host "Checking what's there..." -ForegroundColor Yellow
        
        if ($content -like "*Try ASP.NET API endpoint*") {
            Write-Host "Found: Old version (API first)" -ForegroundColor Red
        }
    }
}
catch {
    Write-Host "Error downloading: $_" -ForegroundColor Red
}
