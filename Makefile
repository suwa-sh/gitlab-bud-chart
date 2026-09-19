# 品質チェックの入口。fmt / lint / sast は qlty、test は各言語のテストランナーで実行する
#
#   make setup   依存のインストール
#   make fmt     全ファイルを整形
#   make lint    静的解析 + セキュリティ検査のゲート (CI と同じ) + 型チェック
#   make test    frontend / backend のユニットテスト
#   make sast    セキュリティ検査だけを実行
#   make check   lint + test をまとめて実行 (コミット前に通す)
#   make bump VERSION=x.y.z   バージョン表記を 3 か所まとめて更新 (リリース手順は README を参照)
#
# 注意: `qlty check --fix` は --filter / --no-formatters の指定にかかわらず全ファイルを整形する。
#       整形は `make fmt` で明示的に行い、ゲートは --no-fix で実行する

BACKEND_PYTHON := backend/.venv/bin/python
# CI と同じゲート。medium 以上の指摘が 1 件でもあれば失敗する (コードスメルは low に triage 済み)
QLTY_GATE := qlty check --all --no-fix --no-progress --no-upgrade-check --no-formatters --fail-level medium
# セキュリティ系プラグイン (コード脆弱性 / 依存の脆弱性・コンテナ設定 / シークレット混入 / CI 設定)
SAST_PLUGINS := bandit,trivy,osv-scanner,trufflehog,zizmor

.PHONY: setup fmt lint test test-frontend test-backend sast check bump

setup:
	npm ci --prefix frontend --no-audit --no-fund
	uv venv backend/.venv --python 3.12 --allow-existing
	uv pip install --python $(BACKEND_PYTHON) -r backend/requirements-dev.txt
	qlty check --install-only

fmt:
	qlty fmt --all

lint:
	$(QLTY_GATE)
	npm run typecheck --prefix frontend

test: test-frontend test-backend

test-frontend:
	npm test --prefix frontend

test-backend:
	cd backend && .venv/bin/python -m pytest

sast:
	$(QLTY_GATE) --filter $(SAST_PLUGINS)

check: lint test

# バージョンは 3 か所に書かれている。1 か所でも漏れると /docs の表示やイメージと食い違うので、まとめて更新する
bump:
	@echo "$(VERSION)" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$$' || { echo "usage: make bump VERSION=x.y.z"; exit 1; }
	npm version $(VERSION) --no-git-tag-version --allow-same-version --prefix frontend > /dev/null
	sed -i.bak -E 's/^version = "[^"]+"/version = "$(VERSION)"/' backend/pyproject.toml && rm backend/pyproject.toml.bak
	sed -i.bak -E 's/^(    version=)"[^"]+",/\1"$(VERSION)",/' backend/app/main.py && rm backend/app/main.py.bak
	@echo "--- updated to $(VERSION):"
	@grep -m1 '"version"' frontend/package.json
	@grep -m1 '"version"' frontend/package-lock.json
	@grep '^version = ' backend/pyproject.toml
	@grep -E '^    version=' backend/app/main.py
