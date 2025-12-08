$server = "ftp://windows11.aspone.cz"
$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"
$startPath = "/www"

$global:results = @()

function Get-FtpListing($path) {
    try {
        $uri = "$server$path"
        if (-not $uri.EndsWith("/")) { $uri += "/" }
        
        $req = [System.Net.FtpWebRequest]::Create($uri)
        $req.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
        $req.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectoryDetails
        
        $response = $req.GetResponse()
        $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
        $content = $reader.ReadToEnd()
        $reader.Close()
        $response.Close()

        return ($content -split "`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    }
    catch {
        Write-Host "Skipping $path (Not a dir or Access Denied)" -ForegroundColor DarkGray
        return $null
    }
}

function Parse-ListingAndRecurse($currentPath) {
    Write-Host "Scanning: $currentPath" -ForegroundColor Cyan
    $lines = Get-FtpListing $currentPath
    
    foreach ($line in $lines) {
        # UNIX format: drwxr-xr-x 1 ftp ftp 0 Dec 07 21:47 name
        # We assume the name starts at index 56 (variable) or is the last part
        
        # Simple splitting by spaces
        $parts = $line -split "\s+"
        if ($parts.Count -lt 9) { continue }
        
        $perms = $parts[0]
        $name = $parts[8..($parts.Length - 1)] -join " " # Join rest of parts as name
        
        if ($name -eq "." -or $name -eq "..") { continue }
        
        $fullPath = "$currentPath/$name"
        
        if ($perms.StartsWith("d")) {
            $global:results += "DIR  $fullPath"
            Parse-ListingAndRecurse $fullPath
        }
        else {
            $global:results += "FILE $fullPath"
        }
    }
}

Parse-ListingAndRecurse $startPath

$outputFile = "c:\Users\lordk\.gemini\antigravity\scratch\KikiAI\ftp_map_unix.txt"
$global:results | Out-File $outputFile
Write-Host "Mapping complete. Saved to $outputFile" -ForegroundColor Green
