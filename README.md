PlayLoop — Portfolio

React / TypeScript / Express / MySQL / Firebase Authenticationを使った、ゲーム商品の出品・検索・購入手続きと掲示板の学習用アプリです。共同制作したアプリを、コードレビュー用に整理しています。

商品検索、出品・編集、購入履歴、お気に入り、掲示板、アカウント画面のコードを収録しています。決済はデモで、実際の支払い処理はありません。

このリポジトリには画像、実際の接続設定、利用者データ、以前のGit履歴を含めていません。画像がない箇所はテキストで表示します。設定が未完了の場合は準備中画面を表示し、実サービスへの接続を開始しません。

**構成**

- `PlayLoop/`：React / Viteのフロントエンド
- `server.js`、`server/`：Express API、Firebase IDトークン検証、環境変数設定
- `.env.example`、`PlayLoop/.env.example`：ダミーの設定例
- `scripts/check-publication.cjs`：Gitの登録内容・履歴の確認
- `test/`：本人確認と公開対象チェックのテスト

**ローカルでの確認**

Node.js 22.13以降とGitを使用します。リポジトリ直下で実行してください。

```sh
npm ci
npm ci --prefix PlayLoop
npm test
npm run build --prefix PlayLoop
npm run lint --prefix PlayLoop
npm run check:publication
```

フロントエンドは `npm run dev --prefix PlayLoop` で起動します。ダミー設定のままでは、案内画面までの表示になります。

ログインやAPIを動かす場合は、`.env.example` を同じフォルダーの `.env` にコピーし、`PlayLoop/.env.example` も `PlayLoop/.env` にコピーします。自分で用意した開発専用FirebaseプロジェクトとMySQLを設定してください。サーバーは `npm start` で起動し、既定では `127.0.0.1` だけで待ち受けます。

Firebaseのフロントエンド設定とサーバーの `FIREBASE_PROJECT_ID` は同じ開発用プロジェクトを指定します。サーバーはFirebase Admin SDKでIDトークンを検証します。この用途で秘密鍵ファイルをリポジトリに置く必要はありません。Firebase側のアクセス制御・API制限は別途設定してください。[Firebase公式のIDトークン検証](https://firebase.google.com/docs/auth/admin/verify-id-tokens)

MySQLにはソースのSQLに対応するテーブル定義が別途必要です。このリポジトリには、既存DBのダンプやデータは含めていません。実サービスに接続した一連の動作確認は未実施です。

**設定・データの扱い**

- `.env` と `.env.*` はGit対象外です。例外はダミー値だけの `.env.example` です。
- `VITE_` 変数はブラウザーに配布されます。DBパスワード、秘密鍵、セッションsecretを設定しないでください。[Viteの環境変数](https://vite.dev/guide/env-and-mode)
- カード番号・CVC・名義・有効期限を入力・保存する機能はありません。支払方法名だけを保存します。
- 住所・ユーザー・投稿・商品の動作確認には架空データを使用してください。
- APIの更新操作・個人の履歴取得にはIDトークンが必要です。UIDやメールをリクエスト本文で指定しても、本人情報として採用しません。
- 画像アップロード機能は残していますが、画像ファイル自体はGitに追加できないルールにしています。

**公開前の確認**

`.githooks` のpre-commit / pre-pushで、環境ファイル・画像・代表的な認証情報・コミットメールを検査します。`npm ci` 時に、このリポジトリ内だけのフック設定を行います。フックは回避可能なので、公開前には `npm run check:publication` と目視確認も実施してください。自動検査は任意の氏名や未知の秘密情報を完全には検出できません。

公開確認の記録は [PUBLICATION_REVIEW.md](PUBLICATION_REVIEW.md) にあります。公開・デプロイは自動化していません。コードの公開と、実ユーザーを受け入れるサービスの運用は別に検証してください。
