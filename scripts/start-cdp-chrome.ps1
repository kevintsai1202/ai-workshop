# =============================================================================
# 啟動 Chrome 並開啟 CDP（Remote Debugging Port 9222）
# 用途：給 scripts/scrape-tools.mjs --cdp 模式用
# 流程：強砍既有 Chrome → 找 chrome.exe → 啟動帶 debug port → 輪詢確認 port 開
# =============================================================================

$ErrorActionPreference = "Stop"

# 1) 強制關閉所有 chrome.exe（包含背景殘留）
Write-Host ""
Write-Host "[1/4] 關閉所有現有 Chrome..." -ForegroundColor Cyan
Stop-Process -Name chrome -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

$remaining = Get-Process chrome -ErrorAction SilentlyContinue
if ($remaining) {
    Write-Host "  ⚠ 仍有 chrome.exe 在跑：" -ForegroundColor Yellow
    $remaining | Format-Table Id, ProcessName -AutoSize
    Write-Host "  請手動於 Task Manager 結束後重跑此腳本" -ForegroundColor Yellow
    exit 1
}
Write-Host "  ✓ 所有 Chrome 已關閉" -ForegroundColor Green

# 2) 找 chrome.exe 安裝位置
Write-Host ""
Write-Host "[2/4] 偵測 Chrome 安裝位置..." -ForegroundColor Cyan
$chromePaths = @(
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)
$chromeExe = $chromePaths | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chromeExe) {
    Write-Host "  ❌ 找不到 chrome.exe，請手動指定路徑後重跑：" -ForegroundColor Red
    Write-Host "     `$env:CHROME_EXE = 'C:\path\to\chrome.exe'; .\start-cdp-chrome.ps1" -ForegroundColor Red
    exit 1
}
if ($env:CHROME_EXE) { $chromeExe = $env:CHROME_EXE }
Write-Host "  ✓ Chrome 位置：$chromeExe" -ForegroundColor Green

# 3) 啟動 debug Chrome（背景，不阻塞此 PS 視窗）
Write-Host ""
Write-Host "[3/4] 啟動 Chrome（debug port 9222 + 您的真實 profile）..." -ForegroundColor Cyan
$userDataDir = "$env:LOCALAPPDATA\Google\Chrome\User Data"
$profileDir = if ($env:CHROME_PROFILE) { $env:CHROME_PROFILE } else { "Default" }
Write-Host "  user-data-dir：$userDataDir" -ForegroundColor Gray
Write-Host "  profile-directory：$profileDir" -ForegroundColor Gray

Start-Process $chromeExe -ArgumentList @(
    "--remote-debugging-port=9222",
    "--user-data-dir=$userDataDir",
    "--profile-directory=$profileDir"
)

# 4) 輪詢 port 9222 直到就緒（最多等 15 秒）
Write-Host ""
Write-Host "[4/4] 等待 port 9222 就緒（最多 15 秒）..." -ForegroundColor Cyan
$ok = $false
for ($i = 1; $i -le 15; $i++) {
    Start-Sleep -Seconds 1
    try {
        $r = Invoke-WebRequest -Uri http://localhost:9222/json/version -UseBasicParsing -TimeoutSec 2
        Write-Host "  ✓ Port 9222 已就緒（第 $i 秒）" -ForegroundColor Green
        Write-Host ""
        Write-Host "Chrome 回應：" -ForegroundColor Gray
        ($r.Content | ConvertFrom-Json) | Format-List Browser, "Protocol-Version", User-Agent
        $ok = $true
        break
    } catch {
        Write-Host "  $i/15 ..." -ForegroundColor DarkGray
    }
}

if (-not $ok) {
    Write-Host ""
    Write-Host "❌ Port 9222 始終未就緒。診斷資訊：" -ForegroundColor Red
    Get-Process chrome -ErrorAction SilentlyContinue | Format-Table Id, ProcessName, MainWindowTitle
    Write-Host ""
    Write-Host "可能原因：" -ForegroundColor Yellow
    Write-Host "  1. 您的 Chrome 設定有「在背景繼續執行應用程式」啟用 — 砍不乾淨" -ForegroundColor Yellow
    Write-Host "     → chrome://settings/system 關閉「在 Google Chrome 關閉時繼續執行背景應用程式」後重試" -ForegroundColor Yellow
    Write-Host "  2. Profile 名稱不是 Default — 用環境變數指定：" -ForegroundColor Yellow
    Write-Host "     `$env:CHROME_PROFILE = 'Profile 1'; .\scripts\start-cdp-chrome.ps1" -ForegroundColor Yellow
    Write-Host "  3. 公司 GPO 鎖定了 remote debugging — 換 --user-data-dir=`$env:TEMP\chrome-cdp" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🎉 Chrome 已就緒。下一步：" -ForegroundColor Green
Write-Host "  1) 在這個 Chrome 視窗內登入 chatgpt.com、notebooklm.google.com、labs.google/whisk" -ForegroundColor White
Write-Host "  2) 另開一個 PowerShell 視窗執行：" -ForegroundColor White
Write-Host "     cd d:\GitHub\ai-workshop" -ForegroundColor Cyan
Write-Host "     node scripts/scrape-tools.mjs --cdp --pause --ids codex,notebooklm,whisk" -ForegroundColor Cyan
Write-Host ""
