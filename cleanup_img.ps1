$server = "ftp://windows11.aspone.cz"
$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"

function Delete-FtpFile($path) {
    try {
        $uri = "$server$path"
        Write-Host "Deleting: $path"
        $req = [System.Net.FtpWebRequest]::Create($uri)
        $req.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
        $req.Method = [System.Net.WebRequestMethods+Ftp]::DeleteFile
        $req.GetResponse().Close()
        Write-Host "Deleted."
    }
    catch { Write-Host "Error: $_" }
}

Delete-FtpFile "/www/wwwroot/img/storybook.jpg"
