$server = "ftp://windows11.aspone.cz"
$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"
$baseRemote = "/www/wwwroot/apps/KiStorybook/index.html"
$local = "c:\Users\lordk\.gemini\antigravity\scratch\KikiAI\KikiAI\wwwroot\apps\KiStorybook\index.html"

try {
    Write-Host "Uploading updated index..."
    $req = [System.Net.FtpWebRequest]::Create("$server$baseRemote")
    $req.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
    $req.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
    $req.UseBinary = $true
    
    $bytes = [System.IO.File]::ReadAllBytes($local)
    $req.ContentLength = $bytes.Length
    $s = $req.GetRequestStream()
    $s.Write($bytes, 0, $bytes.Length)
    $s.Close()
    $req.GetResponse().Close()
    Write-Host "Done."
}
catch {
    Write-Host "Error: $_"
}
