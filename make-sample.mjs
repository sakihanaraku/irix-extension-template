// 生成模板测试文件：把任意音频包成 .hello 容器
// 用法：node make-sample.mjs <输入音频> <输出.hello> [title] [artist] [album] [durationMs]
import fs from 'node:fs';
import path from 'node:path';

const [input, output, title, artist, album, dur] = process.argv.slice(2);
if (!input || !output) {
  console.error('用法: node make-sample.mjs <输入音频> <输出.hello> [title] [artist] [album] [durationMs]');
  process.exit(1);
}
const audio = fs.readFileSync(input);
const meta = {
  title: title || path.basename(input, path.extname(input)),
  artist: artist || '',
  album: album || '',
  duration: Number(dur) || 0,      // 毫秒
};
const metaBuf = Buffer.from(JSON.stringify(meta), 'utf8');
if (metaBuf.length > 64 * 1024) {
  console.error('元数据太大（模板格式上限 64 KB）');
  process.exit(1);
}
const head = Buffer.alloc(12);
head.write('HELLOXTS', 0, 'latin1');
head.writeUInt32LE(metaBuf.length, 8);
fs.writeFileSync(output, Buffer.concat([head, metaBuf, audio]));
console.log(`✓ ${output}  (音频 ${audio.length} B + 头部 ${metaBuf.length} B)`);
