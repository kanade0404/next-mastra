# Git安全システム実装の経緯

## 背景

開発中に `git commit --amend` を既にpush済みのコミットに対して実行してしまい、リモートとの競合が発生する問題があった。これを機械的に防ぐシステムを実装。

## 実装過程

### 1. 問題の特定

- `git commit --amend` をpush済みコミットに実行
- リモートとローカルで異なるコミットハッシュが生成
- `git push` 時に競合が発生し、force pushが必要になる

### 2. 解決策の検討

push済みコミットかどうかを機械的にチェックする方法：

```bash
# 現在のブランチ名取得
CURRENT_BRANCH=$(git branch --show-current)

# HEADのハッシュ取得
HEAD_HASH=$(git rev-parse HEAD)

# リモートブランチ存在チェック
git show-ref --verify --quiet "refs/remotes/origin/$CURRENT_BRANCH"

# HEADがリモートに含まれているかチェック
git branch -r --contains "$HEAD_HASH" | grep -q "origin/$CURRENT_BRANCH"
```

### 3. 実装方法の進化

#### Phase 1: package.jsonインラインスクリプト

- 複雑な条件分岐をワンライナーで実装
- 可読性・保守性に問題

#### Phase 2: 別ファイルへの分離

- `scripts/safe-amend.sh` として独立
- `--check-only` オプション追加
- lefthook統合対応

## 実装されたソリューション

### 1. safe-amendスクリプト

**ファイル**: `scripts/safe-amend.sh`

```bash
#!/bin/bash
# push済みコミットのamendを防止
# --check-only オプションでチェックのみ実行可能
```

### 2. 使用方法

1. **pnpmスクリプト**: `pnpm safe-amend`
2. **Gitエイリアス**: `git safe-amend`
3. **lefthookフック**: pre-commitで自動チェック
4. **手動修正**: 新しいコミット作成

### 3. エラーメッセージ

- 明確な警告表示
- 代替手段の提示
- README.mdへの参照

## 効果

- push済みコミットの誤ったamendを防止
- force pushの必要性を削減
- 安全な開発ワークフローの確立

## 今後の改善案

- 複数人開発でのコンフリクト検出
- ブランチ保護ルールとの連携
- CI/CDパイプラインでの追加チェック
