# Deploy CommanderGem
$ftpServer = "ftp://windows11.aspone.cz"
$ftpUser = "EkoBio.org_lordkikin"
$ftpPass = "Brzsilpot7!"
$localDir = "c:\Users\lordk\.gemini\antigravity\scratch\KikiAI\CommanderGem"
$remoteBase = "/www/wwwroot/apps/commandergem"

function Create-FtpDirectory {
    param ($RemotePath)
    try {
        $uri = "$ftpServer$RemotePath"
        Write-Host "Creating $RemotePath..." -NoNewline
        $request = [System.Net.FtpWebRequest]::Create($uri)
        $request.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $request.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        $response = $request.GetResponse()
        $response.Close()
        Write-Host " Done" -ForegroundColor Green
    }
    catch { Write-Host " (Exists)" -ForegroundColor Gray }
}

function Upload-File {
    param ($LocalPath, $RemotePath)
    try {
        $uri = "$ftpServer$RemotePath"
        Write-Host "Uploading $(Split-Path $LocalPath -Leaf) -> $RemotePath..." -NoNewline
        $webclient = New-Object System.Net.WebClient
        $webclient.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $webclient.UploadFile($uri, $LocalPath)
        Write-Host " Done" -ForegroundColor Green
    }
    catch { Write-Host " Failed: $_" -ForegroundColor Red }
}

function Upload-Directory-Recursive {
    param ($LocalPath, $RemotePath)
    
    Create-FtpDirectory $RemotePath
    
    $items = Get-ChildItem -Path $LocalPath
    foreach ($item in $items) {
        if ($item.Name -eq ".git" -or $item.Name -eq ".vs" -or $item.Name -eq ".vscode") { continue }
        
        $targetRemotePath = "$RemotePath/$($item.Name)"
        
        if ($item.PSIsContainer) {
            Upload-Directory-Recursive $item.FullName $targetRemotePath
        }
        else {
            Upload-File $item.FullName $targetRemotePath
        }
    }
}

Write-Host "=== Deploying CommanderGem ===" -ForegroundColor Cyan
Write-Host "Local: $localDir"
Write-Host "Remote: $remoteBase"

# Ensure parent directories exist
Create-FtpDirectory "/www/wwwroot/apps"

# Upload recursively
Upload-Directory-Recursive $localDir $remoteBase

Write-Host "`n=== Deployment Complete ===" -ForegroundColor Green
