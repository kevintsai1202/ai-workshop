// =============================================================================
// 為「完整課程包/教學素材/」下的 CSV 補上 UTF-8 BOM
//
// 為什麼：Windows 中文版 Excel 預設以 Big5 / ANSI 解讀「無 BOM 的 CSV」，
// 造成中文亂碼。在檔案開頭加上 EF BB BF（UTF-8 BOM），Excel 雙擊就會自動以
// UTF-8 開啟，學員不需要手動指定編碼。
//
// 執行：node scripts/ensure-csv-bom.mjs
// 結果：直接覆寫原檔。Idempotent（已含 BOM 的檔案會跳過）。
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { glob } from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TARGET_DIR = path.join(ROOT, '完整課程包', '教學素材');

const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);

function hasBom(buf) {
  return buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF;
}

async function main() {
  // Node 22+ 才有內建 fs.promises.glob，相容性 fallback：用 readdir 遞迴
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && full.toLowerCase().endsWith('.csv')) files.push(full);
    }
  }
  walk(TARGET_DIR);

  let added = 0, skipped = 0;
  for (const file of files) {
    const buf = fs.readFileSync(file);
    if (hasBom(buf)) {
      console.log(`  ✓ ${path.relative(ROOT, file)}（已有 BOM，跳過）`);
      skipped++;
    } else {
      fs.writeFileSync(file, Buffer.concat([BOM, buf]));
      console.log(`  + ${path.relative(ROOT, file)}（已補 BOM）`);
      added++;
    }
  }

  console.log(`\n完成：補 BOM ${added} 個檔、已含 BOM 跳過 ${skipped} 個檔`);
}

main().catch(err => { console.error('❌', err); process.exit(1); });
