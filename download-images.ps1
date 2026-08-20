# Run this from inside the site-package folder, on your own machine
# (this sandbox has no network access to theglobalacademy.ac, so the
# images couldn't be fetched automatically — this script does it for you).
#
# In PowerShell:
#   cd path\to\site-package
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\download-images.ps1

$ErrorActionPreference = "Stop"
$imagesDir = Join-Path $PSScriptRoot "images"

$files = @{
    "logo-header.png"       = "https://theglobalacademy.ac/wp-content/uploads/2021/01/GlobalAcademy600whitetrianglewkickerwhitebgxx.png"
    "hero-banner.png"       = "https://theglobalacademy.ac/wp-content/uploads/2024/05/homepage-imageshallow.png"
    "researcher-1.jpeg"     = "https://theglobalacademy.ac/wp-content/uploads/2024/10/%E9%92%B1%E7%AD%B1%E7%AD%B1%E7%85%A7%E7%89%87-aspect-ratio-1-1.jpeg"
    "researcher-2.png"      = "https://theglobalacademy.ac/wp-content/uploads/2024/07/Dr_Shah.png"
    "researcher-3.jpg"      = "https://theglobalacademy.ac/wp-content/uploads/2024/07/result-aspect-ratio-1-1-1.jpg"
    "article-1.png"         = "https://theglobalacademy.ac/wp-content/uploads/2026/06/triple-panel-LinkedIn.png"
    "article-2.png"         = "https://theglobalacademy.ac/wp-content/uploads/2026/01/beesandladybirds-scaled.png"
    "article-3.png"         = "https://theglobalacademy.ac/wp-content/uploads/2025/10/Feature-blog-image_Hack_your_Planet_If_Oxford_2025_A4.png"
    "footer-logo.png"       = "https://theglobalacademy.ac/wp-content/uploads/2021/01/theglobalacademy1.png"
    "seuk-badge.png"        = "https://theglobalacademy.ac/wp-content/uploads/2021/01/100px_reversedtowhite_SEUK_Certified.png"
    "footer-logo-white.png" = "https://theglobalacademy.ac/wp-content/uploads/2021/01/100px_theglobalacademywhite.png"
}

foreach ($name in $files.Keys) {
    $dest = Join-Path $imagesDir $name
    Write-Host "Downloading $name ..."
    Invoke-WebRequest -Uri $files[$name] -OutFile $dest
}

Write-Host "Done. Images saved into $imagesDir"
