# GitLab Issue ラベル解析・データ変換ルール

## 概要

このドキュメントでは、GitLab Issue のラベルを解析し、プロジェクト管理用のデータに変換するためのルールを定義します。

## ラベル解析ルール

### 1. Point（ポイント）ラベル

- **形式**: `p:数値`
- **例**: `p:1.0`, `p:0.5`, `p:2.0`
- **用途**: 作業量・工数の見積もり
- **正規表現**: `^p:(\d+(?:\.\d+)?)$`

#### 解析ルール

```python
# 小数点を含む数値をサポート
point_pattern = re.compile(r'^p:(\d+(?:\.\d+)?)$')
if point_match := point_pattern.match(label):
    point_value = float(point_match.group(1))
```

#### 検証ルール

- 値は 0 より大きい必要がある
- 100 を超える場合は警告を出力
- 複数の point ラベルが存在する場合、最後に解析されたものを採用

### 2. Kanban Status（かんばんステータス）ラベル

- **形式**: `#ステータス名`
- **例**: `#作業中`, `#完了`, `#未着手`, `#レビュー中`, `#ブロック中`
- **用途**: 作業進捗状況の管理
- **正規表現**: `^#(.+)$`

#### 標準ステータス

- `#未着手` - 作業開始前
- `#作業中` - 作業実行中
- `#完了` - 作業完了
- `#レビュー中` - レビュー待ち・実施中
- `#ブロック中` - 何らかの理由で作業が停止

#### 完了判定ステータス

以下のキーワードを含むステータスは完了とみなされる：

- `完了`, `済`, `done`, `completed`, `finished`

### 3. Service（サービス）ラベル

- **形式**: `s:サービス名`
- **例**: `s:backend`, `s:frontend`, `s:infrastructure`
- **用途**: 担当システム・コンポーネントの分類
- **正規表現**: `^s:(.+)$`

#### 標準サービス

- `s:frontend` - フロントエンド関連
- `s:backend` - バックエンド関連
- `s:infrastructure` - インフラ関連
- `s:design` - デザイン関連
- `s:testing` - テスト関連

### 4. Quarter（四半期）ラベル

- **形式**: `@FYyyQx`
- **例**: `@FY25Q1`, `@FY25Q2`, `@FY24Q4`
- **用途**: 会計年度・四半期での分類
- **正規表現**: `^@(.+)$`

#### 形式検証

- 標準形式: `FY\d{2}Q[1-4]`
- FY: Fiscal Year（会計年度）
- 年度は 2 桁表記
- Q の後は 1-4 の四半期番号

## データ変換ルール

### completed_at（完了日時）の決定

#### 優先順位

1. **due_date + closed 状態**: due_date が設定されており、issue の state が'closed'の場合
2. **kanban_status 完了系**: kanban_status が完了を示すキーワードを含む場合、updated_at を使用
3. **その他**: null

```python
def _determine_completed_at(issue):
    # Rule 1: due_date + closed state
    if issue.due_date and issue.state == 'closed':
        return issue.due_date

    # Rule 2: kanban_statusが完了系
    if issue.kanban_status:
        completed_statuses = ['完了', '済', 'done', 'completed', 'finished']
        if any(status in issue.kanban_status.lower() for status in completed_statuses):
            return issue.updated_at or issue.created_at

    # Rule 3: その他
    return None
```
