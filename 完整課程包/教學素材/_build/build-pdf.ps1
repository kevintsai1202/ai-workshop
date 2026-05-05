# =============================================================
# 教學素材 PDF 建置腳本（PowerShell 7+）
#
# 流程：
#   1. 找出 ../*.md（不含 README）
#   2. 用 pandoc 轉成 HTML（內嵌 ./style.css）
#   3. 用 Microsoft Edge headless --print-to-pdf 印成 PDF
#   4. PDF 與 HTML 中介檔輸出至 ../pdf/
#
# 用法：
#   pwsh -File build-pdf.ps1            # 全部重建
#   pwsh -File build-pdf.ps1 -KeepHtml  # 保留中介 HTML 供除錯
# =============================================================

[CmdletBinding()]
param(
    [switch]$KeepHtml
)

$ErrorActionPreference = 'Stop'

# 路徑設定 ----------------------------------------------------
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SrcDir    = Resolve-Path (Join-Path $ScriptDir '..')
$OutDir    = Join-Path $SrcDir 'pdf'
$CssFile   = Join-Path $ScriptDir 'style.css'

# 確認輸出目錄
if (-not (Test-Path $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir | Out-Null
}

# 檢查 pandoc
$pandoc = Get-Command pandoc -ErrorAction SilentlyContinue
if (-not $pandoc) {
    throw 'pandoc 未安裝或不在 PATH 中。請先安裝 pandoc。'
}

# 找 Edge ------------------------------------------------------
$EdgeCandidates = @(
    'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    'C:\Program Files\Microsoft\Edge\Application\msedge.exe'
)
$Edge = $EdgeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $Edge) {
    # 退而求其次找 Chrome
    $ChromeCandidates = @(
        'C:\Program Files\Google\Chrome\Application\chrome.exe',
        'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'
    )
    $Edge = $ChromeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}
if (-not $Edge) {
    throw '找不到 Microsoft Edge 或 Google Chrome 可執行檔。'
}
Write-Host "使用瀏覽器：$Edge" -ForegroundColor Cyan

# HTML 模板 ----------------------------------------------------
$HtmlTemplate = @'
<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
<meta charset="UTF-8">
<title>$title$</title>
<style>
$styles$
</style>
</head>
<body>
$body$
</body>
</html>
'@
$TemplateFile = Join-Path $ScriptDir '_template.html'
$HtmlTemplate | Set-Content -Path $TemplateFile -Encoding UTF8

# 主迴圈 ------------------------------------------------------
$MdFiles = Get-ChildItem -Path $SrcDir -Filter '*.md' -File |
           Where-Object { $_.BaseName -ne 'README' }

if ($MdFiles.Count -eq 0) {
    Write-Warning '找不到任何 Markdown 來源檔。'
    return
}

$CssContent = Get-Content -Path $CssFile -Raw -Encoding UTF8

foreach ($md in $MdFiles) {
    $base    = $md.BaseName
    $htmlOut = Join-Path $OutDir "$base.html"
    $pdfOut  = Join-Path $OutDir "$base.pdf"

    Write-Host "`n==> 處理：$($md.Name)" -ForegroundColor Yellow

    # 1. pandoc: md -> html（不嵌 CSS，用模板中 $styles$ 注入）
    Write-Host '   [1/2] pandoc 轉換 HTML...' -ForegroundColor Gray
    $title = $base -replace '_', ' '
    & pandoc `
        $md.FullName `
        -f gfm `
        -t html5 `
        --metadata "title=$title" `
        --variable "styles:$CssContent" `
        --template "$TemplateFile" `
        -o $htmlOut

    if ($LASTEXITCODE -ne 0) { throw "pandoc 失敗：$($md.Name)" }

    # 2. Edge headless: html -> pdf
    Write-Host '   [2/2] Edge headless 印 PDF...' -ForegroundColor Gray
    $htmlUri = 'file:///' + ($htmlOut -replace '\\', '/' -replace ' ', '%20')

    $edgeArgs = @(
        '--headless=new',
        '--disable-gpu',
        '--no-pdf-header-footer',
        "--print-to-pdf=$pdfOut",
        '--print-to-pdf-no-header',
        $htmlUri
    )

    & $Edge @edgeArgs 2>&1 | Out-Null

    if (-not (Test-Path $pdfOut)) {
        throw "PDF 產出失敗：$pdfOut"
    }

    $size = [math]::Round((Get-Item $pdfOut).Length / 1KB, 1)
    Write-Host "   ✅ 完成：$pdfOut（${size} KB）" -ForegroundColor Green

    # 中介 HTML 是否保留
    if (-not $KeepHtml) {
        Remove-Item $htmlOut -ErrorAction SilentlyContinue
    }
}

# 清理模板
Remove-Item $TemplateFile -ErrorAction SilentlyContinue

Write-Host "`n全部完成！PDF 輸出於：$OutDir" -ForegroundColor Cyan
