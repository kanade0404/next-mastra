# actionlint統合の実装経緯

## 背景

GitHub Actionsワークフローの品質向上のため、actionlintによる静的解析を導入。ローカル環境での差異に対応するためDockerフォールバック機能を実装。

## 実装過程

### 1. 基本統合

```yaml
# lefthook.yml
actionlint:
    glob: '.github/workflows/*.{yml,yaml}'
    run: actionlint {staged_files}
```

### 2. 環境差異の対応

actionlintのローカルインストール状況に差があるため、以下の段階的フォールバック実装：

1. **ローカルactionlint**: `which actionlint`でチェック
2. **Docker実行**: `rhysd/actionlint:latest`コンテナ使用
3. **エラー表示**: インストール手順案内

### 3. 最終実装

```bash
if which actionlint >/dev/null 2>&1 && actionlint --version >/dev/null 2>&1; then
    actionlint {staged_files}
elif command -v docker >/dev/null 2>&1; then
    echo "Docker経由でactionlintを実行します..."
    docker run --rm -v $(pwd):/repo --workdir /repo rhysd/actionlint:latest -color
else
    echo "actionlintまたはDockerが見つかりません。"
    exit 1
fi
```

## 解決した問題

### ShellCheck警告

```bash
# 修正前（警告あり）
echo "NODE_ENV=test" >> $GITHUB_ENV

# 修正後（警告なし）
echo "NODE_ENV=test" >> "$GITHUB_ENV"
```

### Node.jsバージョン管理

```yaml
# 修正前（ハードコード）
node-version: '18'

# 修正後（package.json参照）
node-version-file: 'package.json'
```

## Docker統合の利点

- ローカル環境の差異を吸収
- 一貫した実行環境
- バージョン管理の簡素化
- CI/CD環境との整合性

## package.jsonスクリプト

```json
{
    "scripts": {
        "lint:actionlint": "bash -c 'if which actionlint >/dev/null 2>&1 && actionlint --version >/dev/null 2>&1; then actionlint .github/workflows/*.yml; elif command -v docker >/dev/null 2>&1; then echo \"Docker経由でactionlintを実行します...\"; docker run --rm -v $(pwd):/repo --workdir /repo rhysd/actionlint:latest -color; else echo \"actionlintまたはDockerが見つかりません。インストールしてください\"; exit 1; fi'"
    }
}
```

## 効果

- GitHub Actionsの品質向上
- 環境差異による実行失敗の回避
- 開発者体験の統一
- CI/CDパイプラインの安定化
