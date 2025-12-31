$server = "ftp://windows11.aspone.cz"
$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"

$localFile = "c:\Users\lordk\.gemini\antigravity\scratch\KikiAI\CommanderGem\index-mod.html"
$remoteFile = "$server/www/wwwroot/apps/commandergem/index-mod.html"

Write-Host "Uploading fixed Kikimmander HTML with star map..." -ForegroundColor Cyan

$webclient = New-Object System.Net.WebClient
$webclient.Credentials = New-Object System.Net.NetworkCredential($user, $pass)

try {
    $webclient.UploadFile($remoteFile, $localFile)
    Write-Host "SUCCESS! Stars should now rotate in Kikimmander!" -ForegroundColor Green
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
}
