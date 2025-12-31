$server = "ftp://windows11.aspone.cz"
$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"
$baseUrl = "$server/www/wwwroot/apps/commandergem"

$timestamp = Get-Date -Format "yyyyMMdd_HHmm"
$backupDirName = "_backup_$timestamp"
$backupUrl = "$baseUrl/$backupDirName"

$credentials = New-Object System.Net.NetworkCredential($user, $pass)

function Exec-Ftp($url, $method) {
    $req = [System.Net.FtpWebRequest]::Create($url)
    $req.Credentials = $credentials
    $req.Method = $method
    return $req.GetResponse()
}

function Upload-Ftp($url, $localPath) {
    $client = New-Object System.Net.WebClient
    $client.Credentials = $credentials
    $client.UploadFile($url, $localPath)
}

function Move-To-Backup($fileName) {
    $fileUrl = "$baseUrl/$fileName"
    $targetUrl = "$backupUrl/$fileName"
    
    Write-Host "Backing up $fileName..." -NoNewline
    
    try {
        # 1. Download to temp
        $wc = New-Object System.Net.WebClient
        $wc.Credentials = $credentials
        $tempFile = [System.IO.Path]::GetTempFileName()
        $wc.DownloadFile($fileUrl, $tempFile)
        
        # 2. Upload to backup
        $wc.UploadFile($targetUrl, $tempFile)
        
        # 3. Delete original (only if upload succeeded)
        $req = [System.Net.FtpWebRequest]::Create($fileUrl)
        $req.Credentials = $credentials
        $req.Method = [System.Net.WebRequestMethods+Ftp]::DeleteFile
        $req.GetResponse().Close()
        
        Remove-Item $tempFile
        Write-Host " DONE" -ForegroundColor Green
    }
    catch {
        Write-Host " SKIPPED (Not found or error: $_)" -ForegroundColor Yellow
    }
}

try {
    Write-Host "Starting Cleanup & Deployment..." -ForegroundColor Cyan
    
    # 1. Create Backup Directory
    Write-Host "Creating backup directory: $backupDirName"
    try {
        Exec-Ftp $backupUrl ([System.Net.WebRequestMethods+Ftp]::MakeDirectory) | Out-Null
    }
    catch {
        Write-Host "Directory might already exist or error: $_" -ForegroundColor Yellow
    }

    # 2. Backup Files
    Move-To-Backup "index.html"
    Move-To-Backup "main.js"
    # Also backup index-mod.html to be safe before we delete it later? 
    # Actually, we will delete index-mod.html from server, but we have the source locally.
    
    # 3. Deploy New Version
    $localIndexMod = "c:\Users\lordk\.gemini\antigravity\scratch\KikiAI\CommanderGem\index-mod.html"
    $targetIndex = "$baseUrl/index.html"
    
    Write-Host "Deploying new index.html..." -NoNewline
    Upload-Ftp $targetIndex $localIndexMod
    Write-Host " DONE" -ForegroundColor Green
    
    # 4. Cleanup old index-mod.html on server if it exists
    Write-Host "Cleaning up server index-mod.html..." -NoNewline
    try {
        $req = [System.Net.FtpWebRequest]::Create("$baseUrl/index-mod.html")
        $req.Credentials = $credentials
        $req.Method = [System.Net.WebRequestMethods+Ftp]::DeleteFile
        $req.GetResponse().Close()
        Write-Host " DELETED" -ForegroundColor Green
    }
    catch {
        Write-Host " NOT FOUND (clean)" -ForegroundColor Green
    }

    Write-Host "SUCCESS! Deployment Complete." -ForegroundColor Green
    Write-Host "Backup located at: apps/commandergem/$backupDirName" -ForegroundColor Gray

}
catch {
    Write-Host "FATAL ERROR: $_" -ForegroundColor Red
}
