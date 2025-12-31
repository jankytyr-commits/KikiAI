$server = "ftp://windows11.aspone.cz"
$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"

$localFile = "c:\Users\lordk\.gemini\antigravity\scratch\KikiAI\CommanderGem\js\star-map.js"
$remoteFile = "$server/www/wwwroot/apps/commandergem/js/star-map.js"

Write-Host "Uploading improved star-map.js..." -ForegroundColor Cyan

$webclient = New-Object System.Net.WebClient
$webclient.Credentials = New-Object System.Net.NetworkCredential($user, $pass)

try {
    $webclient.UploadFile($remoteFile, $localFile)
    Write-Host "SUCCESS! Stars should now cover full screen!" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
}
