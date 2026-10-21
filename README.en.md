# irix-extension-template

**English** | [中文](README.md) | [日本語](README.ja.md)

**Extension template for iRix Audio Player** — copy this repository to quickly build a
"container → playable audio" extension.

- Main project: [sakihanaraku/irix-audio-player](https://github.com/sakihanaraku/irix-audio-player)
- Extension authoring guide: [EXTENSIONS.md](https://github.com/sakihanaraku/irix-audio-player/blob/main/EXTENSIONS.md)

This template demonstrates the current extension interfaces: `decode` / `readMeta` /
`extractCover` / `processAudio` / `activate` / `deactivate` / `onSettingsChanged` /
`commands`, plus declarative `settings` and `commands` in the manifest.

## What it does

The sample container `.hello` wraps a piece of raw audio:

```
[0, 8) "HELLOXTS" | [8,12) metadata JSON length N | [12,12+N) JSON | [12+N,...) audio
```

The template:

- recognizes the `.hello` suffix (visible in the file browser after install + restart);
- extracts the original audio (FLAC/MP3/WAV/OGG/M4A/AAC);
- reads title / artist / album / duration (milliseconds);
- `readMeta()` fast path: adding to the playlist only reads metadata, no full decode;
- declarative settings: one boolean switch (pass through unknown headers);
- command button: "test command" returns the extension version;
- still plays when metadata is corrupted.

## Quick start

```bash
# 1) wrap any audio file into .hello
node make-sample.mjs input.flac song.hello "Test Song" "Test Artist" "Test Album" 195000

# 2) package (run inside the template directory)
tar -cf iRix-Extension-irix-extension-template-1.0.0.xtxs .
# Windows PowerShell: tar -cf iRix-Extension-irix-extension-template-1.0.0.xtxs .

# 3) App → Settings → Extensions → Install extension… → pick the .xtxs → restart
```

Self-test without launching the player:

```bash
node self-test.mjs
# or npm test
```

## Make it your own

1. Copy the whole directory/repository and rename it to your extension id
   (lowercase letters/digits/`.` `-` `_`);
2. Edit `extension.json`: `id` / `name` / `version` / `description` / `author` / `extensions`,
   plus your own `settings` / `commands`;
3. Edit `index.js`: `MAGIC`, parsing logic, `match` regexp, `module.exports.id`;
4. Follow the main project's `EXTENSIONS.md` for Node unit tests + real playback/settings/commands;
5. Open a Pull Request against `extensions/community/<id>/` in the main project (update `CATALOG.md` too).

## Interface demo

| Interface | Use in this template |
|---|---|
| `activate(ctx)` | read `ctx.settings`, write a log line |
| `onSettingsChanged(values)` | update the internal settings cache immediately |
| `deactivate()` | placeholder: release resources (none here) |
| `commands.ping` | returns `irix-extension-template v<version> OK` |
| `readMeta(buffer)` | playlist fast path (metadata only) |
| `decode(buffer)` | the actual container decode |
| `extractCover()` | returns null in this sample (return a Buffer if your format has cover art) |
| `processAudio(data)` | returns data unchanged (file-level post-processing, not real-time DSP) |
| `match` | `/\.hello$/i` |

## Notes

- `decode()` / `readMeta()` / `extractCover()` / `processAudio()` **must return synchronously**
  (the player does not `await` them);
- `meta.duration` is in **milliseconds**;
- `cover` must be a JPEG/PNG Buffer;
- invalid files must throw readable errors, never over-allocate or loop forever;
- extensions run in the main process with full Node privileges — only implement what you need;
- `settings` / `commands` are **declarative UI only** and do not sandbox the extension.

## Known limitations (of this template)

- only supports the sample `.hello` format; it is not a real ecosystem;
- no cover parsing (see `cover` / `extractCover` if you need it);
- no encryption/signature; teaching purposes only.

## License

MIT
