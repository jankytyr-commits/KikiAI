$server = "ftp://windows11.aspone.cz"
$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"

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
        Write-Host "ERROR: $_"
    }
}

# Upload the new controller
Upload-File "c:\Users\lordk\.gemini\antigravity\scratch\KikiAI\KikiAI\StorybookController.cs" "/www/wwwroot/StorybookController.cs"

Write-Host "`nNow you need to restart the application on the server for the new API endpoint to work."
Write-Host "The frontend has been updated to use /api/storybook/list as the primary method."
