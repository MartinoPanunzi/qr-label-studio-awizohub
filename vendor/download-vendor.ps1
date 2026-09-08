# Downloads bwip-js + jspdf for offline use
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path "$PSScriptRoot" | Out-Null
Invoke-WebRequest -Uri "https://cdnjs.cloudflare.com/ajax/libs/bwip-js/4.3.0/bwip-js-min.js" -OutFile "$PSScriptRoot/bwip-js-min.js"
Invoke-WebRequest -Uri "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" -OutFile "$PSScriptRoot/jspdf.umd.min.js"
Write-Output "vendor OK"
