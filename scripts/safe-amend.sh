#!/bin/bash

# safe-amend.sh - push済みコミットのamendを防止するスクリプト
# Usage: ./scripts/safe-amend.sh [--check-only]

set -e

# オプション解析
CHECK_ONLY=false
if [[ "$1" == "--check-only" ]]; then
    CHECK_ONLY=true
fi

# 現在のブランチ名を取得
CURRENT_BRANCH=$(git branch --show-current)

# 現在のHEADのハッシュを取得
HEAD_HASH=$(git rev-parse HEAD)

# リモートブランチが存在するかチェック
if git show-ref --verify --quiet "refs/remotes/origin/$CURRENT_BRANCH"; then
    # HEADがリモートブランチに含まれているかチェック
    if git branch -r --contains "$HEAD_HASH" | grep -q "origin/$CURRENT_BRANCH"; then
        echo "🚫 エラー: 既にpush済みのコミットです！"
        echo "新しいコミットを作成してください: git commit -m \"fix: 修正内容\""
        echo ""
        echo "📖 詳細な方法は README.md の「安全なコミット修正」セクションを参照してください"
        exit 1
    fi
fi

# 安全な場合の処理
if [[ "$CHECK_ONLY" == "true" ]]; then
    echo "✅ push済みでないコミットです。amendが安全に実行可能です"
else
    echo "✅ push済みでないコミットです。amendを実行します..."
    # --check-onlyオプション以外の引数を渡す
    shift 2>/dev/null || true  # エラーを無視
    git commit --amend "$@"
    echo "✅ amendが完了しました"
fi