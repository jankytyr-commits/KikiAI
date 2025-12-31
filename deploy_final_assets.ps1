$server = "ftp://windows11.aspone.cz"
$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"
$baseUrl = "$server/www/wwwroot/apps/commandergem"
$localBase = "c:\Users\lordk\.gemini\antigravity\scratch\KikiAI\CommanderGem"

$credentials = New-Object System.Net.NetworkCredential($user, $pass)
$wc = New-Object System.Net.WebClient
$wc.Credentials = $credentials

function Download-Lib($url, $name) {
    if (-not (Test-Path "$localBase\$name")) {
        Write-Host "Downloading $name from CDN..." -ForegroundColor Yellow
        try {
            # Use a separate WebClient for non-FTP downloads to avoid credential issues
            $httpWc = New-Object System.Net.WebClient
            $httpWc.DownloadFile($url, "$localBase\$name")
            Write-Host "Downloaded $name." -ForegroundColor Green
        }
        catch {
            Write-Host "Failed to download $name : $_" -ForegroundColor Red
        }
    }
    else {
        Write-Host "$name exists locally." -ForegroundColor Gray
    }
}

function Upload-File($localPath, $remoteName) {
    $remoteUrl = "$baseUrl/$remoteName"
    Write-Host "Uploading $remoteName..." -NoNewline
    try {
        $wc.UploadFile($remoteUrl, $localPath)
        Write-Host " OK" -ForegroundColor Green
    }
    catch {
        Write-Host " FAILED: $_" -ForegroundColor Red
    }
}

# 1. Ensure Libraries Exist
Download-Lib "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js" "jszip.min.js"
Download-Lib "https://cdnjs.cloudflare.com/ajax/libs/heic2any/0.0.4/heic2any.min.js" "heic2any.min.js"

# 2. Upload Everything
Write-Host "`nStarting Full Asset Deployment..." -ForegroundColor Cyan

# Libraries & CSS
Upload-File "$localBase\jszip.min.js" "jszip.min.js"
Upload-File "$localBase\heic2any.min.js" "heic2any.min.js"
Upload-File "$localBase\style.css" "style.css"

# JS Files
Upload-File "$localBase\js\main-fallback.js" "js/main-fallback.js"
Upload-File "$localBase\js\star-map.js" "js/star-map.js"

# HTML (Final overwrite)
Upload-File "$localBase\index-mod.html" "index.html"

Write-Host "Deployment Complete." -ForegroundColor Green
