$server = "ftp://windows11.aspone.cz"
$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"
$baseRemote = "/www/wwwroot/apps/KiStorybook"

function Upload-File($local, $remote) {
    try {
        $uri = "$server$remote"
        Write-Host "Uploading $local -> $remote"
        $req = [System.Net.FtpWebRequest]::Create($uri)
        $req.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
        $req.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
        $req.UseBinary = $true
        
        $bytes = [System.IO.File]::ReadAllBytes($local)
        $req.ContentLength = $bytes.Length
        $s = $req.GetRequestStream()
        $s.Write($bytes, 0, $bytes.Length)
        $s.Close()
        $req.GetResponse().Close()
        Write-Host "Uploaded successfully."
    }
    catch {
        Write-Host "ERROR uploading $local : $_"
    }
}

Upload-File "c:\Users\lordk\.gemini\antigravity\scratch\KikiAI\KikiAI\wwwroot\apps\KiStorybook\stories.json" "$baseRemote/stories.json"
