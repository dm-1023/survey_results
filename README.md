# アンケート台帳

アンケート回答を1件ずつ登録し、集計レポート、PDF、Wordを出力する静的Webアプリです。

## ローカル起動

```powershell
npm run dev
```

ブラウザで `http://localhost:4173/` を開きます。

## 回答用紙の画像取込

回答一覧の「アンケートPDF出力・印刷」で作成した用紙は、「画像から回答を登録」から読み取れます。1件分の全ページをJPEG・PNG・WebP画像で追加すると、用紙を自動識別し、単一選択・複数選択・表形式の回答を入力画面へ反映します。

数字、自由記述、連絡先、「その他」の記入文字はPaddleOCRで仮入力します。手書き文字には誤認識があり得るため、読み取り後に表示される切り出し画像と照合して修正してください。

選択判定と文字認識はブラウザ内で実行され、追加した画像や認識結果は外部へ送信されません。画像自体も回答データには保存されません。初回だけ文字認識モデルと実行プログラムを読み込むため、開始まで時間がかかることがあります。

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
