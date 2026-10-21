'use strict';

// ============================================================================
// irix-extension-template —— iRix Audio Player 扩展模板
//
// 用途：复制这个目录，快速写一个「容器 → 可播放音频」的插件。
// 示例容器格式（可按你的真实格式替换）：
//   [0, 8)         magic "HELLOXTS"
//   [8, 12)        元数据 JSON 长度 N（uint32 little-endian）
//   [12, 12+N)     元数据 JSON：{ title, artist, album, duration }（duration 单位毫秒）
//   [12+N, ...)    原始音频数据（FLAC/MP3/WAV/OGG/...）
//
// 接口约定（详见 iRix Audio Player 仓库的 EXTENSIONS.md）：
//   module.exports = {
//     id, match: RegExp,
//     decode(buffer, { name }),              // 必须同步
//     readMeta?(buffer, { name }),           // 只读元数据（加入列表快速路径）
//     extractCover?(buffer, { name }),       // 只取封面 Buffer
//     processAudio?(data, ctx),              // 文件级音频后处理（不是实时 DSP）
//     activate?(ctx), deactivate?(),         // 生命周期
//     onSettingsChanged?(values, key),       // 设置变更通知
//     commands?: { [id]: (ctx) => any },     // 与 extension.json 的 commands 对应
//   }
// ============================================================================

const MAGIC = Buffer.from('HELLOXTS');
const MAX_HEADER = 64 * 1024;      // 头部 JSON 上限，防止坏文件让我们分配巨大内存

/** 从文件头判断真实音频格式（返回不带点的扩展名） */
function detectExt(buf) {
  const head = (n) => buf.subarray(0, n).toString('latin1');
  if (head(4) === 'fLaC') return 'flac';
  if (head(4) === 'OggS') return 'ogg';
  if (head(4) === 'RIFF') return 'wav';
  if (head(3) === 'ID3') return 'mp3';
  if (buf.length > 1 && buf[0] === 0xff && (buf[1] & 0xf6) === 0xf0) return 'aac';
  if (head(4) === 'ftyp') return 'm4a';
  return null;
}

/** 读容器头，返回 { meta, data }（decode / readMeta 共用） */
function splitContainer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    throw new Error('文件太短，不是 HELLOXTS 容器');
  }
  if (!buffer.subarray(0, 8).equals(MAGIC)) {
    throw new Error('魔数不匹配（不是 .hello 容器）');
  }
  const headLen = buffer.readUInt32LE(8);
  if (headLen < 2 || headLen > MAX_HEADER || 12 + headLen > buffer.length) {
    throw new Error('容器头部长度不合法');
  }
  let meta = null;
  try {
    const j = JSON.parse(buffer.subarray(12, 12 + headLen).toString('utf8'));
    if (j && typeof j === 'object') {
      meta = {
        title: String(j.title || ''),
        artist: String(j.artist || ''),
        album: String(j.album || ''),
        duration: Number(j.duration) || 0,   // 毫秒
      };
    }
  } catch {
    meta = null;                   // 元数据坏了不影响播放
  }
  return { meta, data: buffer.subarray(12 + headLen) };
}

/** 当前设置（由 activate / onSettingsChanged 更新；只读缓存，不是全局状态） */
let currentSettings = { passthroughUnknown: false };

/**
 * 把 .hello 容器解成原始音频（同步）。
 * @param {Buffer} buffer 整个文件内容
 * @param {{ name?: string }} [opts]
 */
function decode(buffer, opts) {
  const { meta, data } = splitContainer(buffer);
  if (!data.length) throw new Error('容器里没有音频数据');
  const ext = detectExt(data);
  // 设置示例：认不出格式时按用户设置 passthrough（播放器会退回原文件处理）
  if (!ext && currentSettings.passthroughUnknown) {
    return { data: Buffer.alloc(0), ext: 'bin', meta, passthrough: true };
  }
  if (!ext) throw new Error('无法识别容器里的音频格式');
  return { data, ext, meta, passthrough: false };
}

/**
 * 只读元数据：加入播放列表时走快速路径（不解码整个音频）。
 * 返回 null 表示"读不出来，让播放器回退到完整解码"。
 */
function readMeta(buffer) {
  try {
    const { meta } = splitContainer(buffer);
    return meta;
  } catch {
    return null;
  }
}

// 可选：从容器直接取封面 Buffer（JPEG/PNG，>64 字节才会被采用）。
// 本示例容器没有封面，返回 null；自己的格式有封面就返回 Buffer。
function extractCover() {
  return null;
}

// 可选：文件级音频后处理（不是实时 DSP）。
// 本示例原样返回；确认可播放时不要随意改字节。
function processAudio(data) {
  return data;
}

module.exports = {
  id: 'irix-extension-template',
  match: /\.hello$/i,

  // --- 生命周期 / 设置 / 命令（可选） ---
  activate(ctx) {
    currentSettings = { ...ctx.settings };
    ctx.log('irix-extension-template activated, app', ctx.appVersion);
  },
  deactivate() {
    // 如果插件持有资源，在这里释放（本模板没有）
  },
  onSettingsChanged(values) {
    currentSettings = { ...values };
  },
  commands: {
    async ping(ctx) {
      return `irix-extension-template v${ctx.extension.version} OK`;
    },
  },

  // --- 核心接口 ---
  decode,
  readMeta,
  extractCover,
  processAudio,
};
