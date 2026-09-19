# 品質チェックの入口。fmt / lint / sast は qlty、test は各言語のテストランナーで実行する
#
#   make setup   依存のインストール
#   make fmt     全ファイルを整形
#   make lint    静的解析 + セキュリティ検査のゲート (CI と同じ) + 型チェック
#   make test    frontend / backend のユニットテスト
#   make sast    セキュリティ検査だけを実行
#   make check   lint + test をまとめて実行 (コミット前に通す)
#
# 注意: `qlty check --fix` は --filter / --no-formatters の指定にかかわらず全ファイルを整形する。
#       整形は `make fmt` で明示的に行い、ゲートは --no-fix で実行する

BACKEND_PYTHON := backend/.venv/bin/python
# CI と同じゲート。medium 以上の指摘が 1 件でもあれば失敗する (コードスメルは low に triage 済み)
QLTY_GATE := qlty check --all --no-fix --no-progress --no-upgrade-check --no-formatters --fail-level medium
# セキュリティ系プラグイン (コード脆弱性 / 依存の脆弱性・コンテナ設定 / シークレット混入 / CI 設定)
SAST_PLUGINS := bandit,trivy,osv-scanner,trufflehog,zizmor

.PHONY: setup fmt lint test test-frontend test-backend sast check

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
