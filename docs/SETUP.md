# 開発環境の手順

以下のコマンドは、特に指定がない限りリポジトリ直下で実行します。Node.js 22.13以降、npm、Gitが必要です。

**外部サービスを使わずに確認する**

```sh
npm ci
npm ci --prefix PlayLoop
npm run verify:publication
npm run dev --prefix PlayLoop
```

開発サーバーが表示したURLを開きます。Firebaseが未設定の場合、設定案内画面を表示します。自動テストでは認証とDB接続をテスト用の処理に置き換えるため、実際の外部サービスへの接続設定は不要です。

**機能を動かすための準備**

1. 開発専用のFirebaseプロジェクトを用意し、Authenticationのメール・パスワードによるログインを設定します。
2. MySQLに開発用DBと、`server.js` のSQLに対応するテーブルを用意します。テーブル定義・初期化用SQL・データはこのリポジトリに含まれていません。
3. `.env.example` を `.env` に、`PlayLoop/.env.example` を `PlayLoop/.env` にコピーし、下表の設定を入力します。
4. 別々のターミナルで `npm start` と `npm run dev --prefix PlayLoop` を実行します。

Windows PowerShellで設定例をコピーする場合：

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
if (-not (Test-Path PlayLoop/.env)) { Copy-Item PlayLoop/.env.example PlayLoop/.env }
```

この例は、すでに存在する `.env` を上書きしません。コピー後に必要な項目を確認してください。`.env` はGit対象外です。

**バックエンドの設定：ルートの `.env`**

| 変数 | 内容 |
| --- | --- |
| `HOST` | 待ち受けアドレス。設定例はローカル専用の `127.0.0.1` |
| `PORT` | APIのポート。設定例は `3000` |
| `CORS_ORIGIN` | フロントエンドのURL。設定例は `http://localhost:5173` |
| `DB_HOST` / `DB_PORT` | 自分の開発用MySQLのホストとポート |
| `DB_USER` / `DB_PASSWORD` | 自分の開発用DBの認証情報 |
| `DB_NAME` | 用意した開発用DBの名前 |
| `FIREBASE_PROJECT_ID` | フロントエンドと同じFirebaseプロジェクトのID |

`DB_HOST`、`DB_USER`、`DB_PASSWORD`、`DB_NAME`、`FIREBASE_PROJECT_ID` が未設定、または必須値が `replace-me`・`demo-` で始まる場合、バックエンドは起動しません。

このAPIはFirebase Admin SDKでIDトークンを検証します。秘密鍵ファイルをリポジトリに置く手順はありません。Firebase側の認証・アクセス制御は使用するプロジェクトで設定してください。[Firebase公式：IDトークンの検証](https://firebase.google.com/docs/auth/admin/verify-id-tokens)

**フロントエンドの設定：`PlayLoop/.env`**

| 変数 | 内容 |
| --- | --- |
| `VITE_API_BASE_URL` | APIのURL。設定例は `http://localhost:3000` |
| `VITE_FIREBASE_API_KEY` | 自分のFirebase WebアプリのAPIキー |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Webアプリの認証ドメイン |
| `VITE_FIREBASE_PROJECT_ID` | FirebaseプロジェクトID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase WebアプリのStorage設定 |
| `VITE_FIREBASE_MESSAGE_SENDER_ID` | Firebase設定の `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | Firebase設定の `appId` |

`VITE_` で始まる環境変数はビルドしたJavaScriptに含まれます。DBパスワード、秘密鍵、サーバー用の認証情報には使わないでください。環境変数を変更した後は開発サーバーを再起動します。[Vite公式：環境変数](https://vite.dev/guide/env-and-mode)

フロントエンドのURLが変わる場合は `CORS_ORIGIN`、APIのURLが変わる場合は `VITE_API_BASE_URL` も合わせて変更してください。

**検証コマンド**

| コマンド | 検証内容 |
| --- | --- |
| `npm test` | APIの認証・本人確認、ダミー設定の拒否、公開対象チェックのテスト |
| `npm run lint --prefix PlayLoop` | フロントエンドのESLint |
| `npm run build --prefix PlayLoop` | TypeScriptの型確認とViteビルド |
| `npm run check:publication` | 作業中・ステージ済み・履歴の公開対象とコミット情報の検査 |
| `npm run verify:publication` | 上記を順番に実行し、失敗した時点で停止 |

公開対象チェックの出力には検出した値を表示せず、該当ファイルやコミットと検出項目を表示します。GitHubだけに存在する履歴やコメント等は、このローカルのコマンドでは検査しません。

**動作確認の範囲**

この版はソースコードの確認用です。購入処理はデモで、決済サービスには接続しません。住所・表示名・投稿などの確認には架空の情報を使用してください。

Firebase・MySQLへ実接続した一連の操作、本番環境の設定、全機能のセキュリティ検証は未実施です。具体的な実施記録は [PUBLICATION_REVIEW.md](../PUBLICATION_REVIEW.md) にあります。
