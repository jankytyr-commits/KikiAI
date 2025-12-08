$server = "ftp://windows11.aspone.cz"
$user = "EkoBio.org_lordkikin"
$pass = "Brzsilpot7!"

$req = [System.Net.FtpWebRequest]::Create("$server/www/")
$req.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
$req.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectoryDetails
$response = $req.GetResponse()
$reader = New-Object System.IO.StreamReader($response.GetResponseStream())
Write-Host $reader.ReadToEnd()
