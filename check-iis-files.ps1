[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
$FtpServer = "windows11.aspone.cz"
$FtpUsername = "EkoBio.org_lordkikin"
$FtpPassword = "Brzsilpot7!"

$credentials = New-Object System.Net.NetworkCredential($FtpUsername, $FtpPassword)

$filesToCheck = @(
    "Microsoft.AspNetCore.Server.IIS.dll",
    "Microsoft.AspNetCore.Server.IISIntegration.dll",
    "Microsoft.AspNetCore.Server.Kestrel.dll",
    "KikiAI.deps.json",
    "KikiAI.runtimeconfig.json"
)

Write-Host "=== Checking Critical Files on FTP ===" -ForegroundColor Cyan

foreach ($file in $filesToCheck) {
    $ftpUri = "ftp://$FtpServer/www/$file"
    try {
        $request = [System.Net.FtpWebRequest]::Create($ftpUri)
        $request.Credentials = $credentials
        $request.Method = [System.Net.WebRequestMethods+Ftp]::GetFileSize
        $request.KeepAlive = $false
        $response = $request.GetResponse()
        $size = $response.ContentLength
        $response.Close()
        Write-Host "[OK] Found $file ($size bytes)" -ForegroundColor Green
    }
    catch {
        Write-Host "[MISSING] $file" -ForegroundColor Red
    }
}
