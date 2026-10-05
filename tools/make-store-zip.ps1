# Gera o zip de distribuicao da Chrome Web Store (so os arquivos da extensao).
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$manifest = Get-Content (Join-Path $root "manifest.json") -Raw | ConvertFrom-Json
$dist = Join-Path $root "store\dist"
$zip = Join-Path $root ("store\sfx-clone-v" + $manifest.version + ".zip")

if (Test-Path $dist) { Remove-Item $dist -Recurse -Force -Confirm:$false }
New-Item -ItemType Directory -Force "$dist\content", "$dist\popup", "$dist\runtime", "$dist\icons" | Out-Null

Copy-Item (Join-Path $root "manifest.json") $dist
Copy-Item (Join-Path $root "content\content.js") "$dist\content"
Copy-Item (Join-Path $root "popup\popup.html"), (Join-Path $root "popup\popup.js") "$dist\popup"
Copy-Item (Join-Path $root "runtime\scrollfx.runtime.js") "$dist\runtime"
Copy-Item (Join-Path $root "icons\icon16.png"), (Join-Path $root "icons\icon48.png"), (Join-Path $root "icons\icon128.png") "$dist\icons"

if (Test-Path $zip) { Remove-Item $zip -Force -Confirm:$false }
Compress-Archive -Path "$dist\*" -DestinationPath $zip
Remove-Item $dist -Recurse -Force -Confirm:$false
Write-Host "OK: $zip"
