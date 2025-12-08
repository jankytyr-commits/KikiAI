$server = "ftp://windows11.aspone.cz"
$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"

function Delete-FtpDirectory($path) {
    try {
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
            $parts = $line -split "\s+"
            if ($parts.Count -lt 9) { continue }
            $name = $parts[8..($parts.Length - 1)] -join " "
            if ($name -eq "." -or $name -eq "..") { continue }
            $isDir = $parts[0].StartsWith("d")
             
            if ($isDir) {
                Delete-FtpDirectory "$path/$name"
            }
            else {
                # Delete file
                try {
                    $dReq = [System.Net.FtpWebRequest]::Create("$uri/$name")
                    $dReq.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
                    $dReq.Method = [System.Net.WebRequestMethods+Ftp]::DeleteFile
                    $dReq.GetResponse().Close()
                    Write-Host "  Deleted file: $name" -ForegroundColor Gray
                }
                catch { Write-Host "  Failed to delete $name" -ForegroundColor Red }
            }
        }
        
        # 2. Delete the dir itself
        $req = [System.Net.FtpWebRequest]::Create($uri)
        $req.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
        $req.Method = [System.Net.WebRequestMethods+Ftp]::RemoveDirectory
        $req.GetResponse().Close()
        Write-Host "Removed Directory: $path" -ForegroundColor Green

    }
    catch {
        Write-Host "Log: Skipping $path (Not found or error)" -ForegroundColor DarkGray
    }
}

# Delete the OLD commander
# 1. In wwwroot (where it shouldn't be effectively, but might physically exist)
Delete-FtpDirectory "/www/wwwroot/apps/commander"
# 2. In root (just in case leftovers)
Delete-FtpDirectory "/www/apps/commander"
Delete-FtpDirectory "/www/wwwroot/commander" 

Write-Host "Cleanup of old commander finished."
