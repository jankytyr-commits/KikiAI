# Cleanup Script
$ftpServer = "ftp://windows11.aspone.cz"
$ftpUser = "EkoBio.org_lordkikin"
$ftpPass = "Brzsilpot7!"

function Delete-FtpDirectory {
    param (
        [string]$RemotePath
    )
    try {
        $uri = "$ftpServer$RemotePath"
        Write-Host "Deleting $RemotePath..." -NoNewline
        $request = [System.Net.FtpWebRequest]::Create($uri)
        $request.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $request.Method = [System.Net.WebRequestMethods+Ftp]::RemoveDirectory
        $response = $request.GetResponse()
        $response.Close()
        Write-Host " Done" -ForegroundColor Green
    }
    catch { Write-Host " Failed: $_" -ForegroundColor Red }
}

# Delete the incorrect directory
# Note: RemoveDirectory only works on empty directories.
# Since I can't easily recursively delete via simple script without recursion logic,
# and I don't want to risk deleting the wrong thing, I will just rename it to indicate it should be deleted.
# Or better, I'll leave it for now and just inform the user. 
# Actually, let's try to rename it to "apps_OLD_DO_NOT_USE" so it's clear.

function Rename-FtpDirectory {
    param (
        [string]$OldPath,
        [string]$NewPath
    )
    try {
        $uri = "$ftpServer$OldPath"
        Write-Host "Renaming $OldPath to $NewPath..." -NoNewline
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

Rename-FtpDirectory "/www/apps" "/www/apps_OLD_DELETE_ME"
