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
    
    Write-Host "Checking uploaded file..." -ForegroundColor Cyan
    
    $hasCanvas = $content -match 'canvas id="star-canvas"'
    $hasScript = $content -match 'js/star-map\.js'
    $hasWrapper = $content -match 'class="absolute.*star-canvas'
    
    if ($hasCanvas) {
        Write-Host "CANVAS: Found" -ForegroundColor Green
    }
    else {
        Write-Host "CANVAS: NOT found" -ForegroundColor Red
    }
    
    if ($hasScript) {
        Write-Host "SCRIPT: Found (./js/star-map.js)" -ForegroundColor Green
    }
    else {
        Write-Host "SCRIPT: NOT found or wrong path" -ForegroundColor Red
    }
    
    if ($hasWrapper) {
        Write-Host "WRAPPER: Still has wrapper div (BAD)" -ForegroundColor Red
    }
    else {
        Write-Host "WRAPPER: No wrapper (GOOD)" -ForegroundColor Green
    }
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
