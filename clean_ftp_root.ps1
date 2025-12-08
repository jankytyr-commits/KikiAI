$server = "ftp://windows11.aspone.cz"
$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"

function Delete-FtpFile($path) {
    try {
        $uri = "$server$path"
        Write-Host "Deleting File: $path" -ForegroundColor Yellow
        $req = [System.Net.FtpWebRequest]::Create($uri)
        $req.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
        $req.Method = [System.Net.WebRequestMethods+Ftp]::DeleteFile
        $req.GetResponse().Close()
        Write-Host "Deleted." -ForegroundColor Green
    }
    catch {
        Write-Host "Skip (Not found or error): $path" -ForegroundColor Gray
    }
}

function Delete-FtpDirectory($path) {
    try {
        # Recursive delete is hard via simple FTP command, usually needs listing.
        # But here we assume we can delete simply if possible, or we rely on a helper.
        # Standard Clean-up: Rename to _trash first to be safe? No, let's try direct remove.
        # Actually, DeleteDirectory only works if empty. We need recursion.
        
        $uri = "$server$path"
        Write-Host "Deleting Dir: $path" -ForegroundColor Magenta
        
        # 1. List contents
        $req = [System.Net.FtpWebRequest]::Create($uri)
        $req.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
        $req.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectoryDetails
        
        $response = $req.GetResponse()
        $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
        $content = $reader.ReadToEnd()
        $reader.Close()
        $response.Close()
        
        $lines = $content -split "`n"
        foreach ($line in $lines) {
            # Basic parsing for Windows/Unix mixed env
            $parts = $line -split "\s+"
            if ($parts.Count -lt 9) { continue }
            $name = $parts[8..($parts.Length - 1)] -join " "
            if ($name -eq "." -or $name -eq "..") { continue }
            $isDir = $parts[0].StartsWith("d")
             
            if ($isDir) {
                Delete-FtpDirectory "$path/$name"
            }
            else {
                Delete-FtpFile "$path/$name"
            }
        }
        
        # 2. Delete the dir itself
        $req = [System.Net.FtpWebRequest]::Create($uri)
        $req.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
        $req.Method = [System.Net.WebRequestMethods+Ftp]::RemoveDirectory
        $req.GetResponse().Close()
        Write-Host "Removed Dir: $path" -ForegroundColor Green

    }
    catch {
        Write-Host "Error deleting folder $path : $_" -ForegroundColor Red
    }
}

Write-Host "STARTING CLEANUP of FTP Root Duplicates..."

# FILES
Delete-FtpFile "/www/index.html"
Delete-FtpFile "/www/robots.txt"
Delete-FtpFile "/www/favicon.ico"

# DIRECTORIES (Duplicated in Root)
Delete-FtpDirectory "/www/apps"
Delete-FtpDirectory "/www/css"
Delete-FtpDirectory "/www/img"
Delete-FtpDirectory "/www/js"
Delete-FtpDirectory "/www/manuals"

Write-Host "Cleanup Complete."
