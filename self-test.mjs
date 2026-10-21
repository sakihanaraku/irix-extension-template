// self-test.mjs —— 不需要播放器/Electron，直接验证模板的扩展接口
// 运行：node self-test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'extension.json'), 'utf8'));
const plugin = require(path.join(root, 'index.js'));

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}
const ID_RE = /^[a-z0-9][a-z0-9._-]{1,48}$/i;

// ---- 示例容器构造（与 make-sample.mjs 一致）----
const MAGIC = Buffer.from('HELLOXTS');
function makeContainer(audio, meta) {
  const metaBuf = Buffer.from(JSON.stringify(meta || {}), 'utf8');
  const head = Buffer.alloc(12);
  head.write(MAGIC.toString('latin1'), 0, 'latin1');
  head.writeUInt32LE(metaBuf.length, 8);
  return Buffer.concat([head, metaBuf, audio]);
}
function makeWav(seconds = 0.2, sampleRate = 8000) {
  const samples = Math.max(1, Math.round(seconds * sampleRate));
  const dataSize = samples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0, 'latin1');
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8, 'latin1');
  buf.write('fmt ', 12, 'latin1');
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36, 'latin1');
  buf.writeUInt32LE(dataSize, 40);
  return buf;
}
const FLAC = Buffer.concat([Buffer.from('fLaC', 'latin1'), Buffer.alloc(120, 1)]);
const MP3 = Buffer.concat([Buffer.from('ID3', 'latin1'), Buffer.alloc(120, 2)]);
const WAV = makeWav();
const ctx = {
  appVersion: '1.0.2-fix',
  extension: { id: manifest.id, name: manifest.name, version: manifest.version, dir: root },
  settings: { passthroughUnknown: false },
  log: () => {},
};

try {
  check('manifest：id 合法 / 必填字段 / 声明 .hello',
    ID_RE.test(manifest.id) && manifest.id === path.basename(root) &&
    manifest.extensions.includes('hello') &&
    !!manifest.entry && fs.existsSync(path.join(root, manifest.entry)),
    `${manifest.id} v${manifest.version}`);
  check('模块导出：match / decode / readMeta / extractCover / processAudio / activate / commands',
    plugin.match instanceof RegExp && typeof plugin.decode === 'function' &&
    typeof plugin.readMeta === 'function' && typeof plugin.extractCover === 'function' &&
    typeof plugin.processAudio === 'function' && typeof plugin.activate === 'function' &&
    plugin.commands && typeof plugin.commands.ping === 'function');

  const sample = makeContainer(FLAC, { title: '标题', artist: '艺术家', album: '专辑', duration: 195000 });
  const meta = plugin.readMeta(sample);
  check('readMeta：只读元数据（duration 毫秒）',
    meta && meta.title === '标题' && meta.artist === '艺术家' && meta.duration === 195000, JSON.stringify(meta));
  const decoded = plugin.decode(sample);
  check('decode：FLAC 头识别 / 音频字节 / 元数据',
    decoded.ext === 'flac' && Buffer.isBuffer(decoded.data) && decoded.data.length === FLAC.length &&
    decoded.meta && decoded.meta.title === '标题' && decoded.passthrough === false);
  check('decode：WAV / MP3 头识别',
    plugin.decode(makeContainer(WAV)).ext === 'wav' && plugin.decode(makeContainer(MP3)).ext === 'mp3');
  check('match：只匹配 .hello（大小写不敏感）',
    plugin.match.test('song.hello') && plugin.match.test('SONG.HELLO') && !plugin.match.test('song.flac'));

  const bad1 = (() => { try { plugin.decode(Buffer.alloc(4)); return null; } catch (e) { return e; } })();
  const bad2 = (() => { try { plugin.decode(Buffer.from('NOTHELLO___')); return null; } catch (e) { return e; } })();
  const bad3 = (() => { try { plugin.decode(makeContainer(Buffer.alloc(0))); return null; } catch (e) { return e; } })();
  check('坏文件：短 / 魔数错 / 空音频都抛可读错误', !!bad1 && !!bad2 && !!bad3);

  plugin.activate(ctx);
  check('activate(ctx)：读取 settings 不抛错', true);
  plugin.onSettingsChanged({ passthroughUnknown: true });
  const unknownContainer = makeContainer(Buffer.from('UNKNOWN_AUDIO_HEADER', 'latin1'));
  const pass = plugin.decode(unknownContainer);
  check('设置生效：未知音频头 passthrough=true', pass.passthrough === true);
  plugin.onSettingsChanged({ passthroughUnknown: false });

  check('extractCover / processAudio：可选钩子可调用（示例返回 null / 原样）',
    plugin.extractCover(sample) === null && plugin.processAudio(Buffer.from('abc')).toString() === 'abc');

  const ping = await plugin.commands.ping(ctx);
  check('commands.ping：返回插件版本', /irix-extension-template v1\.0\.0 OK/.test(ping), ping);
} catch (err) {
  check('自检块执行异常', false, String(err && err.stack ? err.stack.split('\n').slice(0, 3).join(' | ') : err));
}

const passed = results.filter((r) => r.ok).length;
const failed = results.length - passed;
console.log(`\n=== irix-extension-template self-test: ${passed}/${results.length} 通过 ===`);
if (failed) for (const r of results) if (!r.ok) console.log(`  ✗ ${r.name}${r.detail ? ' — ' + r.detail : ''}`);
process.exit(failed ? 1 : 0);
