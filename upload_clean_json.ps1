$server = "ftp://windows11.aspone.cz"
$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"

$localFile = "c:\Users\lordk\.gemini\antigravity\scratch\KikiAI\stories_clean.json"
$remoteFile = "$server/www/wwwroot/apps/KiStorybook/stories.txt"

Write-Host "Uploading clean stories.txt..." -ForegroundColor Cyan

# Read as UTF8 without BOM and upload
$content = [System.IO.File]::ReadAllText($localFile, [System.Text.UTF8Encoding]::new($false))
$bytes = [System.Text.Encoding]::UTF8.GetBytes($content)

$req = [System.Net.FtpWebRequest]::Create($remoteFile)
$req.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
$req.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
$req.UseBinary = $true
$req.ContentLength = $bytes.Length

$stream = $req.GetRequestStream()
$stream.Write($bytes, 0, $bytes.Length)
$stream.Close()
$req.GetResponse().Close()

Write-Host "SUCCESS!" -ForegroundColor Green
