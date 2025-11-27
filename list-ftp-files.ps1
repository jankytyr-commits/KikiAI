[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
$FtpServer = "windows11.aspone.cz"
$FtpUsername = "EkoBio.org_lordkikin"
$FtpPassword = "Brzsilpot7!"

Write-Host "=== FTP Directory Listing ===" -ForegroundColor Green

$credentials = New-Object System.Net.NetworkCredential($FtpUsername, $FtpPassword)

function List-FtpDirectory {
    param (
        [string]$Path
    )
    
    $ftpUri = "ftp://$FtpServer$Path"
    
    try {
        $request = [System.Net.FtpWebRequest]::Create($ftpUri)
        $request.Credentials = $credentials
        $request.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectoryDetails
        $request.UseBinary = $true
        $request.KeepAlive = $false
        
        $response = $request.GetResponse()
        $responseStream = $response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($responseStream)
        
        $listing = @()
        while ($line = $reader.ReadLine()) {
            $listing += $line
        }
        
        $reader.Close()
        $responseStream.Close()
        $response.Close()
        
        return $listing
    }
    catch {
        Write-Host "Error listing $Path : $($_.Exception.Message)" -ForegroundColor Red
        return @()
    }
}

# List /www/
Write-Host "`n--- /www/ ---" -ForegroundColor Cyan
$wwwFiles = List-FtpDirectory "/www/"
$wwwFiles | ForEach-Object { Write-Host $_ }

# List /www/wwwroot/
Write-Host "`n--- /www/wwwroot/ ---" -ForegroundColor Cyan
$wwwrootFiles = List-FtpDirectory "/www/wwwroot/"
$wwwrootFiles | ForEach-Object { Write-Host $_ }

Write-Host "`n=== Analysis ===" -ForegroundColor Green

# Extract filenames from /www/
$wwwFileNames = $wwwFiles | ForEach-Object {
    if ($_ -match '([^\s]+)$') {
        $matches[1]
    }
} | Where-Object { $_ -and $_ -notmatch '^d' }

# Extract filenames from /www/wwwroot/
$wwwrootFileNames = $wwwrootFiles | ForEach-Object {
    if ($_ -match '([^\s]+)$') {
        $matches[1]
    }
} | Where-Object { $_ -and $_ -notmatch '^d' }

Write-Host "`nFiles in /www/:" -ForegroundColor Yellow
$wwwFileNames | ForEach-Object { Write-Host "  $_" }

Write-Host "`nFiles in /www/wwwroot/:" -ForegroundColor Yellow
$wwwrootFileNames | ForEach-Object { Write-Host "  $_" }

# Find duplicates
$duplicates = $wwwFileNames | Where-Object { $wwwrootFileNames -contains $_ }

if ($duplicates) {
    Write-Host "`nDuplicate files (exist in both /www/ and /www/wwwroot/):" -ForegroundColor Red
    $duplicates | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    
    Write-Host "`nRecommendation: Delete these files from /www/ (keep only in /www/wwwroot/)" -ForegroundColor Yellow
}
else {
    Write-Host "`nNo duplicate files found." -ForegroundColor Green
}

# Files only in /www/
$onlyInWww = $wwwFileNames | Where-Object { $wwwrootFileNames -notcontains $_ }
if ($onlyInWww) {
    Write-Host "`nFiles only in /www/ (potentially obsolete):" -ForegroundColor Magenta
    $onlyInWww | ForEach-Object { Write-Host "  $_" -ForegroundColor Magenta }
}

Write-Host "`n=== Summary ===" -ForegroundColor Green
Write-Host "Total files in /www/: $($wwwFileNames.Count)"
Write-Host "Total files in /www/wwwroot/: $($wwwrootFileNames.Count)"
Write-Host "Duplicate files: $($duplicates.Count)"
Write-Host "Files only in /www/: $($onlyInWww.Count)"
