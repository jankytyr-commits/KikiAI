$server = "ftp://windows11.aspone.cz"
$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"

try {
    # List contents of /www/wwwroot/apps/kikiai
    $uri = "$server/www/wwwroot/apps/kikiai/"
    Write-Host "Listing: $uri" -ForegroundColor Cyan
    
    $req = [System.Net.FtpWebRequest]::Create($uri)
    $req.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
    $req.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectoryDetails
    
    $response = $req.GetResponse()
    $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
    Write-Host $reader.ReadToEnd()
    $reader.Close()
    $response.Close()
}
catch {
    Write-Host "Error listing apps directory: $_" -ForegroundColor Red
}
