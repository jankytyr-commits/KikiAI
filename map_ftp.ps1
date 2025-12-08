$server = "ftp://windows11.aspone.cz"
$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"
$startPath = "/www" # Zacneme zde

$global:results = @()

function Get-FtpListing($path) {
    $uri = "$server$path"
    try {
        $req = [System.Net.FtpWebRequest]::Create($uri)
        $req.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
        $req.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectoryDetails
        
        $response = $req.GetResponse()
        $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
        $content = $reader.ReadToEnd()
        $reader.Close()
        $response.Close()

        $lines = $content -split "`r`n"
        
        return $lines
    }
    catch {
        Write-Host "Error listing $path : $_" -ForegroundColor Red
        return $null
    }
}

function Parse-ListingAndRecurse($currentPath) {
    Write-Host "Scanning: $currentPath" -ForegroundColor Cyan
    $lines = Get-FtpListing $currentPath
    
    foreach ($line in $lines) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        
        # Windows FTP format usually: date time <DIR>|size name
        # Example: 12-07-25  10:00PM       <DIR>          wwwroot
        
        $parts = $line -split "\s+", 4
        if ($parts.Count -lt 4) { continue }
        
        $isDir = $parts[2] -eq "<DIR>"
        $name = $parts[3]
        
        if ($name -eq "." -or $name -eq "..") { continue }
        
        $fullPath = "$currentPath/$name"
        
        if ($isDir) {
            $global:results += "DIR  $fullPath"
            Parse-ListingAndRecurse $fullPath
        }
        else {
            $size = $parts[2]
            $global:results += "FILE $fullPath ($size bytes)"
        }
    }
}

Parse-ListingAndRecurse $startPath

$outputFile = "c:\Users\lordk\.gemini\antigravity\scratch\KikiAI\ftp_map.txt"
$global:results | Out-File $outputFile
Write-Host "Mapping complete. Saved to $outputFile" -ForegroundColor Green
