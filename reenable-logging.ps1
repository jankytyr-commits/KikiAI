[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
$FtpServer = "windows11.aspone.cz"
$FtpUsername = "EkoBio.org_lordkikin"
$FtpPassword = "Brzsilpot7!"

$credentials = New-Object System.Net.NetworkCredential($FtpUsername, $FtpPassword)

# Create debug web.config content
$webConfigContent = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <location path="." inheritInChildApplications="false">
    <system.webServer>
      <handlers>
        <add name="aspNetCore" path="*" verb="*" modules="AspNetCoreModuleV2" resourceType="Unspecified" />
      </handlers>
      <aspNetCore processPath=".\KikiAI.exe" stdoutLogEnabled="true" stdoutLogFile=".\logs\stdout" hostingModel="inprocess">
        <environmentVariables>
          <environmentVariable name="ASPNETCORE_ENVIRONMENT" value="Production" />
        </environmentVariables>
      </aspNetCore>
    </system.webServer>
  </location>
</configuration>
<!--ProjectGuid: 4D998BC0-9CDC-5B43-6E23-5D70C87BC7A2-->
"@

$localFile = "web_debug_temp.config"
Set-Content -Path $localFile -Value $webConfigContent

Write-Host "Re-enabling logging on server..." -ForegroundColor Yellow

try {
    $ftpUri = "ftp://$FtpServer/www/web.config"
    $request = [System.Net.FtpWebRequest]::Create($ftpUri)
    $request.Credentials = $credentials
    $request.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
    $request.UseBinary = $true
    $request.KeepAlive = $false
    
    $content = [System.IO.File]::ReadAllBytes($localFile)
    $request.ContentLength = $content.Length
    $s = $request.GetRequestStream()
    $s.Write($content, 0, $content.Length)
    $s.Close()
    $request.GetResponse().Close()
    Write-Host "[OK] Logging enabled." -ForegroundColor Green
}
catch {
    Write-Host "[FAIL] Could not enable logging: $($_.Exception.Message)" -ForegroundColor Red
}

Remove-Item $localFile
