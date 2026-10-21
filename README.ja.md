# irix-extension-template

[中文](README.md) | [English](README.en.md) | **日本語**

**iRix Audio Player 拡張テンプレート** —— このリポジトリをコピーして、
「コンテナ → 再生可能な音声」に変換するプラグインをすぐ作れます。

- メインプロジェクト：[sakihanaraku/irix-audio-player](https://github.com/sakihanaraku/irix-audio-player)
- 拡張機能の作成/投稿ガイド：[EXTENSIONS.md](https://github.com/sakihanaraku/irix-audio-player/blob/main/EXTENSIONS.md)

このテンプレートは現在の拡張インターフェースを一通り実演します：
`decode` / `readMeta` / `extractCover` / `processAudio` / `activate` / `deactivate` /
`onSettingsChanged` / `commands`、およびマニフェストの宣言的な `settings` / `commands`。

## できること

サンプルコンテナ `.hello` は生の音声を包みます：

```
[0, 8) "HELLOXTS" | [8,12) メタデータ JSON 長 N | [12,12+N) JSON | [12+N,...) 音声
```

テンプレートの機能：

- `.hello` 拡張子を認識（インストール + 再起動後、ファイルブラウザに表示）；
- コンテナから元の音声を取り出す（FLAC/MP3/WAV/OGG/M4A/AAC）；
- タイトル / アーティスト / アルバム / 長さ（ミリ秒）を読み取る；
- `readMeta()` 高速パス：プレイリスト追加時はメタデータだけ読み、全デコードしない；
- 宣言的設定：設定画面にスイッチを 1 つ生成（未知の音声ヘッダーを通過させる）；
- コマンドボタン：設定画面の「テストコマンド」がプラグインのバージョンを返す；
- メタデータが壊れていても再生できる。

## クイックスタート

```bash
# 1) 任意の音声ファイルを .hello に包む
node make-sample.mjs input.flac song.hello "テスト曲" "テストアーティスト" "テストアルバム" 195000

# 2) パッケージ化（テンプレートディレクトリ内で実行）
tar -cf iRix-Extension-irix-extension-template-1.0.0.xtxs .
# Windows PowerShell: tar -cf iRix-Extension-irix-extension-template-1.0.0.xtxs .

# 3) アプリ → 設定 → 拡張機能 → 拡張機能をインストール… → .xtxs を選択 → 再起動
```

プレイヤーを起動しないセルフテスト：

```bash
node self-test.mjs
# または npm test
```

## 自分のプラグインにする

1. ディレクトリ/リポジトリ全体をコピーし、自分の拡張 id に変更
   （小文字英数字/`.` `-` `_`）；
2. `extension.json` を変更：`id` / `name` / `version` / `description` / `author` / `extensions`、
   および自分の `settings` / `commands`；
3. `index.js` を変更：`MAGIC`、解析ロジック、`match` 正規表現、`module.exports.id`；
4. メインプロジェクトの `EXTENSIONS.md` に従って Node 単体テスト + アプリ内で実際の再生/設定/コマンドを確認；
5. メインプロジェクトの `extensions/community/<id>/` に Pull Request を送る（`CATALOG.md` も更新）。

## インターフェース例

| インターフェース | テンプレートでの用途 |
|---|---|
| `activate(ctx)` | `ctx.settings` を読み、ログを出す |
| `onSettingsChanged(values)` | 設定変更時に内部キャッシュを即時更新 |
| `deactivate()` | プレースホルダー：リソース解放（このテンプレートには無し） |
| `commands.ping` | `irix-extension-template v<version> OK` を返す |
| `readMeta(buffer)` | プレイリスト追加の高速パス（メタデータのみ） |
| `decode(buffer)` | 実際のコンテナデコード |
| `extractCover()` | サンプルでは null（独自形式にカバーがあれば Buffer を返す） |
| `processAudio(data)` | そのまま返す（ファイル単位の後処理。リアルタイム DSP ではない） |
| `match` | `/\.hello$/i` |

## 注意事項

- `decode()` / `readMeta()` / `extractCover()` / `processAudio()` は**同期的に返す**必要があります
  （プレイヤーは `await` しません）；
- `meta.duration` の単位は**ミリ秒**；
- `cover` は JPEG/PNG の Buffer のみ；
- 壊れたファイルでは読みやすいエラーを投げ、過大なメモリ確保や無限ループを避ける；
- プラグインはメインプロセスで動作し、Node の完全な権限を持ちます — 必要な処理だけ実装する；
- `settings` / `commands` は**宣言的 UI のみ**で、権限をサンドボックス化しません。

## 既知の制限（このテンプレート）

- サンプルの `.hello` 形式のみ対応（実際のエコシステムではない）；
- カバー画像の解析は無し（必要なら `cover` / `extractCover` を参照）；
- 暗号化/署名は無し、学習用途のみ。

## License

MIT
