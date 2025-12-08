$server = "ftp://windows11.aspone.cz"
$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"

try {
    $req = [System.Net.FtpWebRequest]::Create("$server/www/wwwroot/apps/KiStorybook/bookcase/")
    $req.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
    $req.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectoryDetails
    $response = $req.GetResponse()
    $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
    Write-Host "=== Contents of /www/wwwroot/apps/KiStorybook/bookcase/ ===" -ForegroundColor Cyan
    Write-Host $reader.ReadToEnd()
}
catch { Write-Host "Error: $_" -ForegroundColor Red }
