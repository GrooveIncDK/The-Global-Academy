#!/usr/bin/env bash
# Run this from inside the site-package folder, on your own machine
# (this sandbox has no network access to theglobalacademy.ac, so the
# images couldn't be fetched automatically — this script does it for you).
#
#   chmod +x download-images.sh
#   ./download-images.sh

set -e
cd "$(dirname "$0")/images"

curl -L -o logo-header.png       "https://theglobalacademy.ac/wp-content/uploads/2021/01/GlobalAcademy600whitetrianglewkickerwhitebgxx.png"
curl -L -o hero-banner.png       "https://theglobalacademy.ac/wp-content/uploads/2024/05/homepage-imageshallow.png"
curl -L -o researcher-1.jpeg     "https://theglobalacademy.ac/wp-content/uploads/2024/10/%E9%92%B1%E7%AD%B1%E7%AD%B1%E7%85%A7%E7%89%87-aspect-ratio-1-1.jpeg"
curl -L -o researcher-2.png      "https://theglobalacademy.ac/wp-content/uploads/2024/07/Dr_Shah.png"
curl -L -o researcher-3.jpg      "https://theglobalacademy.ac/wp-content/uploads/2024/07/result-aspect-ratio-1-1-1.jpg"
curl -L -o article-1.png         "https://theglobalacademy.ac/wp-content/uploads/2026/06/triple-panel-LinkedIn.png"
curl -L -o article-2.png         "https://theglobalacademy.ac/wp-content/uploads/2026/01/beesandladybirds-scaled.png"
curl -L -o article-3.png         "https://theglobalacademy.ac/wp-content/uploads/2025/10/Feature-blog-image_Hack_your_Planet_If_Oxford_2025_A4.png"
curl -L -o footer-logo.png       "https://theglobalacademy.ac/wp-content/uploads/2021/01/theglobalacademy1.png"
curl -L -o seuk-badge.png        "https://theglobalacademy.ac/wp-content/uploads/2021/01/100px_reversedtowhite_SEUK_Certified.png"
curl -L -o footer-logo-white.png "https://theglobalacademy.ac/wp-content/uploads/2021/01/100px_theglobalacademywhite.png"

echo "Done. Images saved into $(pwd)"
