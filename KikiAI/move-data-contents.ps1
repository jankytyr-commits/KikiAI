# Move Data Directory Contents
$ftpServer = "ftp://windows11.aspone.cz"
$ftpUser = "EkoBio.org_lordkikin"
$ftpPass = "Brzsilpot7!"

function Move-FtpFile {
    param ($OldPath, $NewPath)
    try {
        $uri = "$ftpServer$OldPath"
        Write-Host "Moving $OldPath -> $NewPath..." -NoNewline
        $request = [System.Net.FtpWebRequest]::Create($uri)
        $request.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $request.Method = [System.Net.WebRequestMethods+Ftp]::Rename
        $request.RenameTo = $NewPath
        $response = $request.GetResponse()
        $response.Close()
        Write-Host " Done" -ForegroundColor Green
    }
    catch { Write-Host " Failed: $_" -ForegroundColor Red }
}

function Get-FtpListing {
    param ($RemotePath)
    try {
        $uri = "$ftpServer$RemotePath"
        $request = [System.Net.FtpWebRequest]::Create($uri)
        $request.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $request.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectory
        $response = $request.GetResponse()
        $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
        $files = $reader.ReadToEnd() -split "`r`n" | Where-Object { $_ -ne "" }
        $reader.Close()
        $response.Close()
        return $files
    }
    catch { return @() }
}

function Remove-FtpDirectory {
    param ($RemotePath)
    try {
        $uri = "$ftpServer$RemotePath"
        Write-Host "Removing $RemotePath..." -NoNewline
        $request = [System.Net.FtpWebRequest]::Create($uri)
        $request.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $request.Method = [System.Net.WebRequestMethods+Ftp]::RemoveDirectory
        $response = $request.GetResponse()
        $response.Close()
        Write-Host " Done" -ForegroundColor Green
    }
    catch { Write-Host " Failed: $_" -ForegroundColor Red }
}

# Move Config Files
Write-Host "=== Moving Config Files ===" -ForegroundColor Yellow
$configFiles = Get-FtpListing "/www/Config/"
foreach ($file in $configFiles) {
    # File name only, need to handle if it returns full path or just name
    $fileName = Split-Path $file -Leaf
    Move-FtpFile "/www/Config/$fileName" "/www/apps/kikiai/Config/$fileName"
}

# Move Chats Files
Write-Host "`n=== Moving Chats Files ===" -ForegroundColor Yellow
$chatFiles = Get-FtpListing "/www/Chats/"
foreach ($file in $chatFiles) {
    $fileName = Split-Path $file -Leaf
    Move-FtpFile "/www/Chats/$fileName" "/www/apps/kikiai/Chats/$fileName"
}

# Remove old directories
Write-Host "`n=== Cleanup ===" -ForegroundColor Yellow
Remove-FtpDirectory "/www/Config"
Remove-FtpDirectory "/www/Chats"
