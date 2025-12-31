$server = "ftp://windows11.aspone.cz"
$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"

$localFile = "c:\Users\lordk\.gemini\antigravity\scratch\KikiAI\CommanderGem\style.css"
$remoteFile = "$server/www/wwwroot/apps/commandergem/style.css"

Write-Host "Uploading improved style.css to Kikimmander..." -ForegroundColor Cyan

$webclient = New-Object System.Net.WebClient
$webclient.Credentials = New-Object System.Net.NetworkCredential($user, $pass)

try {
    $webclient.UploadFile($remoteFile, $localFile)
    Write-Host "SUCCESS! Kikimmander styling updated." -ForegroundColor Green
}
catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
}
