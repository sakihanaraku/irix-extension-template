# irix-extension-template

**中文** | [English](README.en.md) | [日本語](README.ja.md)

**iRix Audio Player 扩展模板** —— 复制这个仓库，快速写一个「容器 → 可播放音频」的插件。

- 主项目：[sakihanaraku/irix-audio-player](https://github.com/sakihanaraku/irix-audio-player)
- 插件开发/投稿指南：[EXTENSIONS.md](https://github.com/sakihanaraku/irix-audio-player/blob/main/EXTENSIONS.md)

模板演示当前扩展接口：`decode` / `readMeta` / `extractCover` / `processAudio` /
`activate` / `deactivate` / `onSettingsChanged` / `commands`，以及清单里的
声明式 `settings` 和 `commands`。

## 它能做什么

示例容器 `.hello` 包住一段原始音频：

```
[0, 8) "HELLOXTS" | [8,12) 元数据 JSON 长度 N | [12,12+N) JSON | [12+N,...) 音频
```

模板会：

- 认识 `.hello` 后缀（安装并重启后，文件浏览器里可见）；
- 从容器里取出原始音频（FLAC/MP3/WAV/OGG/M4A/AAC）；
- 读取标题 / 艺术家 / 专辑 / 时长（毫秒）；
- `readMeta()` 快速路径：加入播放列表时只读元数据，不解码整首；
- 声明式设置：设置里生成一个开关（未知格式时放行）；
- 命令按钮：设置里的「测试命令」返回插件版本；
- 元数据损坏时仍然能播放。

## 快速试跑

```bash
# 1) 任意找一个音频文件，包成 .hello
node make-sample.mjs input.flac song.hello "测试歌曲" "测试艺术家" "测试专辑" 195000

# 2) 打包（在模板目录内执行）
tar -cf iRix-Extension-irix-extension-template-1.0.0.xtxs .
# Windows PowerShell: tar -cf iRix-Extension-irix-extension-template-1.0.0.xtxs .

# 3) 应用 → 设置 → 扩展 → 安装扩展… → 选 .xtxs → 重启应用
```

不需要启动播放器的自测：

```bash
node self-test.mjs
# 或 npm test
```

## 改成你自己的插件

1. 复制整个目录/仓库，改名为你的插件 id（小写字母/数字/`.-_`）；
2. 改 `extension.json`：`id` / `name` / `version` / `description` / `author` / `extensions`，
   以及你的 `settings` / `commands`；
3. 改 `index.js`：`MAGIC`、解析逻辑、`match` 正则、`module.exports.id`；
4. 按主项目的 `EXTENSIONS.md` 做 Node 单测 + 应用内真实播放/设置/命令；
5. 向主项目 `extensions/community/<id>/` 提 PR（同时更新 `CATALOG.md`）。

## 接口演示

| 接口 | 模板里的用途 |
|---|---|
| `activate(ctx)` | 读取 `ctx.settings`、打印日志 |
| `onSettingsChanged(values)` | 用户改设置后即时更新内部缓存 |
| `deactivate()` | 占位：释放资源（本模板没有资源） |
| `commands.ping` | 返回 `irix-extension-template v<version> OK` |
| `readMeta(buffer)` | 加入列表快速路径（只读元数据） |
| `decode(buffer)` | 真正的容器解码 |
| `extractCover()` | 示例返回 null（自己的格式有封面可返回 Buffer） |
| `processAudio(data)` | 示例原样返回（文件级后处理，不是实时 DSP） |
| `match` | `/\.hello$/i` |

## 接口提醒

- `decode()` / `readMeta()` / `extractCover()` / `processAudio()` **必须同步返回**（播放器不会 `await`）；
- `meta.duration` 单位是**毫秒**；
- `cover` 只接受 JPEG/PNG Buffer；
- 坏文件必须抛错，不能越界/死循环；
- 插件运行在主进程，拥有完整 Node 权限 —— 只写你自己需要的逻辑；
- `settings` / `commands` 只是**声明式界面**，不隔离权限。

## 已知限制（模板自身）

- 只支持示例 `.hello` 格式，没有真实生态；
- 不解析封面（可参考接口自行加 `cover` / `extractCover`）；
- 没有加密/签名，仅作教学用途。

## License

MIT
