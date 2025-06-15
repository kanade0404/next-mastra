This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/route.ts`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## API Routes

This directory contains example API routes for the headless API app.

For more details, see [route.js file convention](https://nextjs.org/docs/app/api-reference/file-conventions/route).

## 開発環境設定

### actionlint (GitHub Actionsワークフローのリント)

GitHub Actionsワークフローの品質を保つため、actionlintをインストールすることを推奨します：

```bash
# macOS (Homebrew)
brew install actionlint

# Linux/Windows (手動インストール)
curl -s https://api.github.com/repos/rhymond/actionlint/releases/latest \
| grep "browser_download_url.*linux_amd64.tar.gz" \
| cut -d '"' -f 4 \
| xargs curl -L | tar xz -C /tmp && sudo mv /tmp/actionlint /usr/local/bin/

# または Docker経由で実行
docker run --rm -v .:/repo --workdir /repo rhymond/actionlint:latest

# VSCode拡張
# marketplace で "actionlint" を検索してインストール
```

インストール後、以下のコマンドでワークフローをチェックできます：

```bash
pnpm lint:actionlint
```

### 安全なコミット修正

push済みのコミットをamendしてしまうミスを防ぐため、以下の方法を推奨します：

#### 方法1: safe-amendスクリプトを使用

```bash
# 危険: git commit --amend (push済みコミットの場合エラーになる可能性)
# 安全:
pnpm safe-amend
```

#### 方法2: Gitエイリアスを設定

```bash
# グローバル設定
git config --global alias.safe-amend '!f() { CURRENT_BRANCH=$(git branch --show-current); HEAD_HASH=$(git rev-parse HEAD); if git show-ref --verify --quiet "refs/remotes/origin/$CURRENT_BRANCH" && git branch -r --contains "$HEAD_HASH" | grep -q "origin/$CURRENT_BRANCH"; then echo "🚫 エラー: 既にpush済みのコミットです！"; echo "新しいコミットを作成してください: git commit -m \"fix: 修正内容\""; exit 1; else git commit --amend "$@"; fi; }; f'

# 使用方法
git safe-amend
```

#### 方法3: push済みコミットを修正する正しい手順

```bash
# 1. 修正ファイルをステージング
git add 修正ファイル

# 2. 新しいコミットを作成（amendではなく）
git commit -m "fix: 修正内容"

# 3. 通常通りpush
git push
```
