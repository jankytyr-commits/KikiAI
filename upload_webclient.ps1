$server = "ftp://windows11.aspone.cz"
$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"

$localFile = "c:\Users\lordk\.gemini\antigravity\scratch\KikiAI\KikiAI\wwwroot\apps\KiStorybook\stories.txt"
$remoteFile = "$server/www/wwwroot/apps/KiStorybook/stories.txt"

Write-Host "Uploading $localFile to $remoteFile" -ForegroundColor Cyan

$webclient = New-Object System.Net.WebClient
$webclient.Credentials = New-Object System.Net.NetworkCredential($user, $pass)

try {
    $webclient.UploadFile($remoteFile, $localFile)
    Write-Host "Upload successful!" -ForegroundColor Green
}
catch {
    Write-Host "Upload failed: $_" -ForegroundColor Red
}
