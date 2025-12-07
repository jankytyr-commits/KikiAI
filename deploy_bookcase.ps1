$server = "ftp://windows11.aspone.cz"
$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"
$baseRemote = "/www/wwwroot/apps/KiStorybook/bookcase"

function Make-Dir($path) {
    try {
        $uri = "$server$path"
        $req = [System.Net.FtpWebRequest]::Create($uri)
        $req.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
        $req.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        $req.GetResponse().Close()
        Write-Host "Created $path"
    }
    catch { }
}

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
        Write-Host "Uploaded."
    }
    catch {
        Write-Host "ERROR uploading $local : $_"
    }
}

Make-Dir $baseRemote
Upload-File "c:\Users\lordk\.gemini\antigravity\scratch\KikiAI\KikiAI\wwwroot\apps\KiStorybook\bookcase\test_story.html" "$baseRemote/test_story.html"
Upload-File "c:\Users\lordk\.gemini\antigravity\scratch\KikiAI\KikiAI\wwwroot\apps\KiStorybook\bookcase\web.config" "$baseRemote/web.config"
