$server = "ftp://windows11.aspone.cz"
$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"

try {
    $req = [System.Net.FtpWebRequest]::Create("$server/www/wwwroot/apps/commandergem/index-mod.html")
    $req.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
    $req.Method = [System.Net.WebRequestMethods+Ftp]::DownloadFile
    
    $response = $req.GetResponse()
    $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
    $content = $reader.ReadToEnd()
    $reader.Close()
    $response.Close()
    
    Write-Host "Checking canvas structure..." -ForegroundColor Cyan
    if ($content -like '*<canvas id="star-canvas"></canvas>*') {
        Write-Host "✓ Canvas is correctly placed (no wrapper)" -ForegroundColor Green
    }
    elseif ($content -like '*<canvas id="star-canvas"*') {
        Write-Host "✓ Canvas exists but check structure..." -ForegroundColor Yellow
        # Extract the canvas part
        $lines = $content -split "`n"
        $canvasLine = $lines | Where-Object { $_ -like '*star-canvas*' } | Select-Object -First 3
        Write-Host "Canvas HTML:" -ForegroundColor Yellow
        $canvasLine | ForEach-Object { Write-Host $_ }
    }
    else {
        Write-Host "✗ Canvas NOT found!" -ForegroundColor Red
    }
    
    if ($content -like '*./js/star-map.js*') {
        Write-Host "✓ star-map.js script correctly loaded" -ForegroundColor Green
    }
    else {
        Write-Host "✗ star-map.js script NOT found or wrong path" -ForegroundColor Red
    }
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
