# survey_results

アンケート回答を1件ずつ登録し、集計レポート、PDF、Wordを出力する静的Webアプリです。

## ローカル起動

```powershell
npm run dev
```

ブラウザで `http://localhost:4173/` を開きます。

## Cloudflare Pages で公開する

このアプリは静的ファイルだけで動くため、Cloudflare Pages で公開できます。

Git連携で公開する場合の設定:

- Build command: `npm run build`
- Build output directory: `cloudflare-dist`

手元から直接アップロードする場合:

```powershell
npm run build
```

Cloudflare Pages の Direct Upload では、生成された `cloudflare-dist` フォルダをアップロードします。

Wranglerで公開する場合:

```powershell
npx wrangler login
npm run deploy:cloudflare
```

## 公開時の注意

回答データと連絡先データは、Cloudflareに保存されず、利用しているブラウザのIndexedDBに保存されます。別のPCや別のブラウザでは同じデータは見えません。

データを移す場合は、アプリ内の保存ファイル作成と読み込み機能を使います。氏名・住所・電話番号を含む保存ファイルは公開場所に置かないでください。
