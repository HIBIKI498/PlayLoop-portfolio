# PlayLoop フロントエンド

React / TypeScript / Viteで構成した画面部分です。作品全体の説明は [リポジトリのREADME](../README.md)、環境設定は [開発環境の手順](../docs/SETUP.md) を参照してください。

**このフォルダー内で使うコマンド**

```sh
npm ci
npm run dev
npm run lint
npm run build
```

`npm run dev` が表示したURLを開くと、設定が未完了の場合は案内画面が表示されます。アプリの操作には開発専用のFirebase設定とバックエンドが必要です。

**主なファイル**

| 場所 | 内容 |
| --- | --- |
| `src/main.tsx` | 起動処理と未設定時の案内 |
| `src/App.tsx` | 画面遷移とログイン必須画面の制御 |
| `src/api.ts` | APIへのリクエストとIDトークンの付与 |
| `src/firebase.ts` | 環境変数からのFirebase初期化 |
| `src/components/` | 機能ごとの画面 |
| `src/css/` | スタイル |

環境変数は `.env.example` を参考に、このフォルダーの `.env` へ設定します。`VITE_` で始まる値はブラウザーへ配布されるため、DBパスワードや秘密鍵を設定しないでください。

リポジトリ全体の検証は、ひとつ上のフォルダーで `npm run verify:publication` を実行します。
