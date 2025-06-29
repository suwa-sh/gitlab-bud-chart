# ADR-002: 技術スタック選定

## 決定事項

gitlab-bud-chartプロジェクトの技術スタックとして、以下の組み合わせを選定する：

- **Frontend**: React + TypeScript + Vite + Recharts
- **Backend**: FastAPI + Python + Python-GitLab
- **Testing**: Playwright + pytest + Vitest
- **Development**: Node.js 18+ + Python 3.11+

## 根拠

### 1. プロジェクト要件との適合性
- **高速開発**: Vite による高速な開発サーバー
- **型安全性**: TypeScript による開発時エラー削減
- **チャート機能**: Recharts による高品質な可視化
- **GitLab統合**: Python-GitLab 公式ライブラリの活用

### 2. チーム生産性
- **学習コスト**: 広く採用されている技術の選択
- **エコシステム**: 豊富なライブラリとツールサポート
- **開発体験**: モダンな開発ツールによる効率化

### 3. 保守性・拡張性
- **コミュニティサポート**: 活発なコミュニティによる長期サポート
- **パフォーマンス**: 実績ある高性能ライブラリの採用
- **互換性**: 標準的な技術による将来の移行容易性

## 詳細な設計内容

### Frontend技術スタック

#### React + TypeScript
```json
{
  "選定理由": [
    "コンポーネントベース開発による再利用性",
    "TypeScriptによる型安全な開発",
    "豊富なエコシステムとライブラリ",
    "チーム内での技術習熟度"
  ],
  "代替案との比較": {
    "Vue.js": "React比較で学習コスト優位だが、エコシステムでReactが上回る",
    "Angular": "大規模向けだが、本プロジェクト規模では過剰",
    "Svelte": "軽量だが、エコシステムが限定的"
  }
}
```

#### Vite
```json
{
  "選定理由": [
    "ES Modulesベースの高速ビルド",
    "HMR（Hot Module Replacement）による開発効率",
    "TypeScript標準サポート",
    "軽量な設定とプラグインシステム"
  ],
  "代替案との比較": {
    "Create React App": "設定済みだが柔軟性と速度でViteが優位",
    "Webpack": "設定の複雑さでViteが優位",
    "Rollup": "低レベル過ぎて開発効率が劣る"
  }
}
```

#### Recharts
```json
{
  "選定理由": [
    "React向けネイティブ設計",
    "Burn-up/Burn-downチャート対応",
    "レスポンシブデザイン対応",
    "カスタマイゼーション容易性"
  ],
  "代替案との比較": {
    "Chart.js": "React統合で複雑性増加",
    "D3.js": "学習コストと開発工数増加",
    "Victory": "バンドルサイズでRechartsが優位"
  }
}
```

#### その他Frontend依存関係
```typescript
// package.json dependencies (予定)
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.8.0",
  "recharts": "^2.8.0",
  "axios": "^1.6.0",
  "@types/react": "^18.2.0",
  "@types/react-dom": "^18.2.0"
}
```

### Backend技術スタック

#### FastAPI + Python
```json
{
  "選定理由": [
    "高性能ASGI対応による処理速度",
    "自動APIドキュメント生成（OpenAPI）",
    "Pydanticによる型ヒントベースバリデーション",
    "非同期処理標準サポート"
  ],
  "代替案との比較": {
    "Flask": "軽量だが機能不足、手動設定多数",
    "Django": "機能過多、RESTAPIには重い",
    "Express.js": "Node.js統一の利点はあるがPython GitLabライブラリが使えない"
  }
}
```

#### Python-GitLab
```json
{
  "選定理由": [
    "GitLab公式認定ライブラリ",
    "全GitLab API機能カバー",
    "Self-hosted GitLab対応",
    "認証方式の豊富なサポート"
  ],
  "代替案との比較": {
    "requests + 手動実装": "保守コストと信頼性でpython-gitlabが優位",
    "GitLab GraphQL": "REST APIで十分、複雑性回避",
    "gitlab-api": "非公式ライブラリのため信頼性に懸念"
  }
}
```

#### Uvicorn + Pydantic
```json
{
  "uvicorn": {
    "選定理由": "ASGI高性能サーバー、FastAPI推奨実装"
  },
  "pydantic": {
    "選定理由": "データバリデーション、シリアライゼーション、型安全性"
  }
}
```

#### Backend依存関係
```python
# pyproject.toml dependencies (予定)
[tool.poetry.dependencies]
python = "^3.11"
fastapi = "^0.104.0"
uvicorn = "^0.24.0"
python-gitlab = "^4.0.0"
pydantic = "^2.5.0"
httpx = "^0.25.0"
```

### Testing技術スタック

#### Playwright
```json
{
  "選定理由": [
    "クロスブラウザE2Eテスト対応",
    "スクリーンショット自動取得",
    "ヘッドレス実行サポート",
    "高速で安定したテスト実行"
  ],
  "要件対応": "playwright を headless で利用。スクリーンショットは毎回取る",
  "代替案との比較": {
    "Cypress": "ブラウザ制限あり、Playwrightが多機能",
    "Selenium": "設定複雑、実行速度でPlaywrightが優位",
    "Puppeteer": "Chrome専用、クロスブラウザでPlaywrightが優位"
  }
}
```

#### pytest + Vitest
```json
{
  "pytest": {
    "対象": "Backend単体・統合テスト",
    "選定理由": "Python標準的テストフレームワーク、豊富なプラグイン"
  },
  "vitest": {
    "対象": "Frontend単体テスト",
    "選定理由": "Viteベース高速実行、TypeScript標準サポート"
  }
}
```

### 開発環境・ツール

#### 開発言語バージョン
```bash
# Node.js
node: ">=18.18.0"
npm: ">=9.0.0"

# Python
python: ">=3.11.0"
poetry: ">=1.6.0"
```

#### コード品質管理
```json
{
  "frontend": {
    "linter": "ESLint + TypeScript ESLint",
    "formatter": "Prettier",
    "type_checker": "TypeScript Compiler"
  },
  "backend": {
    "linter": "ruff (既存設定準拠)",
    "formatter": "black",
    "type_checker": "mypy"
  }
}
```

#### ビルド・パッケージ管理
```json
{
  "frontend": {
    "package_manager": "npm",
    "build_tool": "Vite",
    "bundler": "Rollup (Vite内蔵)"
  },
  "backend": {
    "package_manager": "Poetry",
    "dependency_lock": "poetry.lock",
    "virtual_env": "Poetry管理"
  }
}
```

### パフォーマンス考慮事項

#### Frontend最適化
- **Code Splitting**: React.lazy による動的インポート
- **Bundle Optimization**: Vite の Tree Shaking
- **Cache Strategy**: ブラウザキャッシュ活用

#### Backend最適化
- **Async Processing**: FastAPI の async/await
- **Response Compression**: uvicorn の gzip 圧縮
- **Memory Management**: Python-GitLab の効率的利用

### セキュリティ考慮事項

#### Frontend
- **XSS Prevention**: React の標準エスケープ
- **CSRF Protection**: SameSite Cookie 設定
- **Content Security Policy**: 適切な CSP ヘッダー

#### Backend
- **Input Validation**: Pydantic バリデーション
- **CORS Configuration**: 適切なオリジン制限
- **API Rate Limiting**: 過度なリクエスト制御

### 技術選定のリスク評価

#### 高リスク要因
```json
{
  "dependency_conflicts": {
    "risk": "低",
    "mitigation": "Poetry/npm lock ファイルによる固定"
  },
  "version_compatibility": {
    "risk": "低", 
    "mitigation": "LTS バージョン採用"
  },
  "performance_bottleneck": {
    "risk": "中",
    "mitigation": "各段階でのパフォーマンステスト実施"
  }
}
```

#### 技術負債回避戦略
- **定期更新**: 四半期ごとの依存関係更新
- **セキュリティ**: 脆弱性スキャン自動化
- **監視**: パフォーマンス指標の継続測定

## 承認

- **決定日**: 2025-06-28
- **承認者**: Development Team
- **レビュー予定**: 各Task完了時点での適合性確認