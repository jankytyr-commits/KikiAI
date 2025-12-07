$server = "ftp://windows11.aspone.cz"
$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"
$baseRemote = "/www/wwwroot"

function Upload-File($local, $remote) {
    try {
        $uri = "$server$remote"
        Write-Host "Uploading $local -> $remote"
        $req = [System.Net.FtpWebRequest]::Create($uri)
        $req.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
        $req.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
        $req.UseBinary = $true
        $req.KeepAlive = $false
        
        $bytes = [System.IO.File]::ReadAllBytes($local)
        $req.ContentLength = $bytes.Length
        $s = $req.GetRequestStream()
        $s.Write($bytes, 0, $bytes.Length)
        $s.Close()
        $req.GetResponse().Close()
        Write-Host "Uploaded!"
    }
    catch {
        Write-Host "ERROR uploading $local : $_"
    }
}

Upload-File "c:\Users\lordk\.gemini\antigravity\scratch\KikiAI\KikiAI\wwwroot\index.html" "$baseRemote/index.html"

# Ensure image is there too
Upload-File "c:\Users\lordk\.gemini\antigravity\scratch\KikiAI\KikiAI\wwwroot\img\storybook.jpg" "$baseRemote/img/storybook.jpg"
