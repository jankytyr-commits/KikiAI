$server = "ftp://windows11.aspone.cz"
$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"

function Create-Dir($path) {
    try {
        $req = [System.Net.FtpWebRequest]::Create("$server$path")
        $req.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
        $req.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        $req.GetResponse()
    }
    catch { } # Ignorovat chybu pokud existuje
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
        Write-Host "Uploaded." -ForegroundColor Green
    }
    catch {
        Write-Host "ERROR uploading $local : $_" -ForegroundColor Red
    }
}

Write-Host "--- EMERGENCY FIX START ---"

# 1. Upload stories.txt (musí obsahovat /wwwroot/)
# Ujistíme se, že lokální soubor je správný
$txtPath = "c:\Users\lordk\.gemini\antigravity\scratch\KikiAI\KikiAI\wwwroot\apps\KiStorybook\stories.txt"
$txtContent = Get-Content $txtPath
if ($txtContent -match "/wwwroot/") {
    Write-Host "Local file has /wwwroot/ prefix. Uploading..."
    Upload-File $txtPath "/www/wwwroot/apps/KiStorybook/stories.txt"
}
else {
    Write-Host "ERROR: Local file missing /wwwroot/ prefix! Not uploading." -ForegroundColor Red
}

# 2. Upload Image
# Cílová cesta: /www/wwwroot/apps/KiStorybook/img/storybook.jpg
Create-Dir "/www/wwwroot/apps/KiStorybook/img"
$imgPath = "c:\Users\lordk\.gemini\antigravity\scratch\KikiAI\KikiAI\wwwroot\apps\KiStorybook\img\storybook.jpg"
if (Test-Path $imgPath) {
    Upload-File $imgPath "/www/wwwroot/apps/KiStorybook/img/storybook.jpg"
}
else {
    Write-Host "ERROR: Local image not found at $imgPath" -ForegroundColor Red
}

Write-Host "--- FIX COMPLETE ---"
