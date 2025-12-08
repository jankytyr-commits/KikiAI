$server = "ftp://windows11.aspone.cz"
$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"

function List-Dir($path) {
    try {
        $uri = "$server$path"
        Write-Host "--- Listing $path ---" -ForegroundColor Cyan
        $req = [System.Net.FtpWebRequest]::Create($uri)
        $req.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
        $req.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectoryDetails
        
        $response = $req.GetResponse()
        $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
        $content = $reader.ReadToEnd()
        $reader.Close()
        $response.Close()
        
        # Simple print
        Write-Host $content
    }
    catch {
        Write-Host "Error/Empty: $path" -ForegroundColor Red
    }
}

List-Dir "/www/wwwroot/img/"
List-Dir "/www/wwwroot/css/"
List-Dir "/www/wwwroot/js/"
