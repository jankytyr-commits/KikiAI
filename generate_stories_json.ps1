$baseDir = "c:\Users\lordk\.gemini\antigravity\scratch\KikiAI\KikiAI\wwwroot\apps\KiStorybook"
$jsonFile = "$baseDir\stories.json"

# Get all HTML files except index.html
$files = Get-ChildItem -Path $baseDir -Filter *.html | Where-Object { $_.Name -ne "index.html" }

$list = @()

foreach ($file in $files) {
    # Try to read <title>
    $content = Get-Content $file.FullName -Raw
    $title = $file.Name # Fallback
    if ($content -match "<title>(.*?)</title>") {
        $title = $matches[1]
    }
    
    $list += @{
        filename = $file.Name
        title    = $title
        date     = $file.LastWriteTime.ToString("yyyy-MM-ddTHH:mm:ss")
    }
}

# Convert to JSON and save
$json = $list | ConvertTo-Json -Depth 2
$json | Set-Content $jsonFile -Encoding UTF8

Write-Host "Generated stories.json with $($list.Count) stories."
