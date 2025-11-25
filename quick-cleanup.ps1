# Quick FTP Cleanup
$FtpServer = "ftpx.aspone.cz"
$FtpUsername = "www.ekobio.org"
$FtpPassword = "czfsOmdoqMnjX3k"
$RemotePath = "/publish"

Write-Host "=== Removing /publish folder from FTP ===" -ForegroundColor Yellow

$credentials = New-Object System.Net.NetworkCredential($FtpUsername, $FtpPassword)

function Delete-FtpDirectoryRecursive {
    param($uri)
    try {
        $request = [System.Net.FtpWebRequest]::Create($uri)
        $request.Credentials = $credentials
        $request.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectoryDetails
        $response = $request.GetResponse()
        $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
        $listing = $reader.ReadToEnd()
        $reader.Close()
        $response.Close()
        
        $lines = $listing -split "`r`n" | Where-Object { $_ }
        
        foreach ($line in $lines) {
            $parts = $line -split "\s+", 9
            if ($parts.Count -ge 9) {
                $name = $parts[8]
                if ($name -eq "." -or $name -eq "..") { continue }
                
                $isDir = $line.StartsWith("d")
                $itemUri = "$uri/$name"
                
                if ($isDir) {
                    Delete-FtpDirectoryRecursive $itemUri
                }
                else {
                    $reqDel = [System.Net.FtpWebRequest]::Create($itemUri)
                    $reqDel.Credentials = $credentials
                    $reqDel.Method = [System.Net.WebRequestMethods+Ftp]::DeleteFile
                    $reqDel.GetResponse().Close()
                    Write-Host "Deleted file: $name" -ForegroundColor Gray
                }
            }
        }
        
        $reqRm = [System.Net.FtpWebRequest]::Create($uri)
        $reqRm.Credentials = $credentials
        $reqRm.Method = [System.Net.WebRequestMethods+Ftp]::RemoveDirectory
        $reqRm.GetResponse().Close()
        Write-Host "Removed directory: $uri" -ForegroundColor Green
    }
    catch {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Delete-FtpDirectoryRecursive "ftp://$FtpServer$RemotePath"
