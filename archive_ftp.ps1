$server = "ftp://windows11.aspone.cz"
$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"

function Rename-FtpFile($path, $newName) {
    try {
        $uri = "$server$path"
        Write-Host "Renaming $path -> $newName" -ForegroundColor Cyan
        $req = [System.Net.FtpWebRequest]::Create($uri)
        $req.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
        $req.Method = [System.Net.WebRequestMethods+Ftp]::Rename
        $req.RenameTo = $newName
        $req.GetResponse().Close()
        Write-Host "Success." -ForegroundColor Green
    }
    catch {
        Write-Host "Skipping (Not found or error): $_" -ForegroundColor Gray
    }
}

Write-Host "Archiving OLD root directories..."
Rename-FtpFile "/www/apps" "/www/_archive_apps"
Rename-FtpFile "/www/css" "/www/_archive_css"
Rename-FtpFile "/www/js" "/www/_archive_js"
Rename-FtpFile "/www/img" "/www/_archive_img"
Write-Host "Done."
