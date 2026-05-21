# リールクエスト

ブラウザで遊べる、ルーレット式コマンドのカードバトルゲームです。

## ローカルで起動

`start-game.bat` をダブルクリックして、表示された URL をブラウザで開きます。

```text
http://127.0.0.1:8000/
```

## GitHub Pages で公開

1. このフォルダの中身を GitHub リポジトリへ push します。
2. GitHub のリポジトリ画面で `Settings` → `Pages` を開きます。
3. `Build and deployment` の `Source` を `GitHub Actions` にします。
4. `main` ブランチへ push すると、自動で公開されます。

公開後の URL は、GitHub Actions の `Deploy to GitHub Pages` 実行結果か、`Settings` → `Pages` に表示されます。
