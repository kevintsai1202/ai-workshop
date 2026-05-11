// =============================================================================
// 產生工作坊網址的 QR Code SVG
//
// 為什麼：工作坊現場需要把網址 https://kevintsai1202.github.io/ai-workshop
// 投影出來讓學員掃碼進站；QR Code 預先產成 SVG 矢量檔，比執行期 JS 動態
// 產生（或外部 API）更可靠 — 學員 / 投影網路不穩時也能渲染。
//
// 執行：node scripts/gen-qr.mjs
// 產出：assets/qr-workshop.svg（矢量、任意縮放不失真、檔案小）
//
// 參數：errorCorrectionLevel 採用 'M'（~15% 容錯），中等容量足以承載這串網址
// 且讓邊角的 logo 疊圖空間足夠（如果未來想中央嵌 logo）。
// 邊框（quiet zone）margin: 1，讓 SVG 邊緣留白最小化，外層由 HTML 卡片
// 自行控制 padding，視覺更乾淨。
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// 工作坊正式網址（GitHub Pages）
const URL = 'https://kevintsai1202.github.io/ai-workshop';
const OUT = path.join(ROOT, 'assets', 'qr-workshop.svg');

const svg = await QRCode.toString(URL, {
  type: 'svg',
  errorCorrectionLevel: 'M',
  margin: 1,
  color: {
    dark: '#0f1419',   // QR 模組色：近黑（呼應 --fg）
    light: '#ffffff'   // 背景色：純白，確保掃碼器辨識率
  }
});

fs.writeFileSync(OUT, svg, 'utf-8');
console.log(`✅ QR Code 已產生：${path.relative(ROOT, OUT)}`);
console.log(`   網址：${URL}`);
console.log(`   檔案大小：${(fs.statSync(OUT).size / 1024).toFixed(2)} KB`);
