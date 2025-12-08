$server = "ftp://windows11.aspone.cz"
$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"

try {
    $req = [System.Net.FtpWebRequest]::Create("$server/www/wwwroot/apps/KiStorybook/stories.txt")
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
    
    Write-Host "=== Content from FTP ===" -ForegroundColor Cyan
    Write-Host $content
    Write-Host "========================" -ForegroundColor Cyan
    
    if ($content -like "*http://www.ekobio.org/wwwroot*") {
        Write-Host "SUCCESS: File has NEW URLs!" -ForegroundColor Green
    }
    else {
        Write-Host "PROBLEM: File still has OLD URLs!" -ForegroundColor Red
    }
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
