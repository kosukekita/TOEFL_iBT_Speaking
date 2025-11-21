# TOEFL iBT Speaking Coach

AIを活用したTOEFL iBTスピーキングテスト対策アプリケーション。Gemini APIを使用して、音声回答の自動採点とフィードバックを提供します。

## 機能

- **問題入力**: テキスト入力または画像アップロード（OCR対応）
- **音声回答**: マイクでの直接録音、または音声ファイルのアップロード
- **自動採点**: TOEFL iBT公式ルーブリック（0-4点）に基づく採点
- **詳細フィードバック**:
  - Delivery（発音、イントネーション、流暢さ）
  - Language Use（文法、語彙）
  - Topic Development（内容の一貫性、完成度）
- **フォローアップ質問**: 採点後もチャット形式で質問可能

## 技術スタック

- **フロントエンド**: Next.js 16 (App Router), TypeScript, Tailwind CSS
- **AI**: Google Gemini 2.0 Flash (マルチモーダルAI)
- **デプロイ**: Vercel / Google Cloud Run

## セットアップ

### 前提条件

- Node.js 20以上
- Gemini APIキー（[Google AI Studio](https://aistudio.google.com/app/apikey)で取得）

### インストール

```bash
# リポジトリのクローン
git clone https://github.com/kosukekita/TOEFL_iBT_Speaking.git
cd TOEFL_iBT_Speaking

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env.local
# .env.localファイルを編集して実際の値を設定してください
```

### 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

## 使い方

1. **問題入力**: 左側の「Question / Task」セクションに問題文を入力、または画像をアップロード
2. **音声回答**: 右側の「Your Response」セクションで録音またはファイルをアップロード
3. **採点**: 「Submit for Grading」ボタンをクリック
4. **結果確認**: AIによる採点とフィードバックを確認
5. **質問**: 必要に応じてチャットで追加質問

## Vercelへのデプロイ

### ステップ1: Vercelにプロジェクトをインポート

1. [Vercel](https://vercel.com)にアクセスしてGitHubアカウントでログイン
2. 「Add New...」→「Project」をクリック
3. GitHubリポジトリ `kosukekita/TOEFL_iBT_Speaking` を選択して「Import」
4. プロジェクト設定を確認（通常はデフォルト設定で問題ありません）

### ステップ2: 環境変数の設定

プロジェクトをインポートした後、以下の環境変数を設定します：

1. Vercelダッシュボードでプロジェクトを開く
2. 「Settings」→「Environment Variables」を開く
3. 以下の環境変数を追加：

   | 変数名 | 説明 | 取得方法 |
   |--------|------|----------|
   | `GEMINI_API_KEY` | Gemini APIキー | [Google AI Studio](https://aistudio.google.com/app/apikey) |

4. 環境変数で適用環境を選択：
   - ✅ Production（本番）
   - ✅ Preview（プレビュー）
   - ✅ Development（開発）

5. 「Save」をクリック

### ステップ3: 初回デプロイ

1. 「Deployments」タブに戻る
2. 「Deploy」ボタンをクリック（または、環境変数設定後に自動的にデプロイが開始される場合もあります）

### 自動デプロイについて

VercelにプロジェクトをインポートしてGitHubと連携すると、**以降はGitHubにpushするだけで自動的にデプロイが開始されます**。

- `main`ブランチへのpush → Production環境にデプロイ
- その他のブランチへのpush → Preview環境にデプロイ

### 代替方法: Vercel CLIからデプロイ

Web UIを使わずにCLIからデプロイする場合：

```bash
# Vercel CLIのインストール
npm i -g vercel

# プロジェクトのデプロイ（初回は認証が必要）
vercel

# 環境変数の設定
vercel env add GEMINI_API_KEY

# 本番環境へのデプロイ
vercel --prod
```

## Cloud Runへのデプロイ

```bash
# Google Cloud SDKのインストールと認証が必要
gcloud run deploy toefl-speaking-app \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated

# 環境変数の設定
gcloud run services update toefl-speaking-app \
  --set-env-vars GEMINI_API_KEY=your_api_key_here
```

## ライセンス

MIT

## 作者

Kosuke Kita
