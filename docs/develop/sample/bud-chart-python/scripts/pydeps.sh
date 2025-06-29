#!/bin/bash
set -eu
# 引数
readonly module="${1:?}"

# プロジェクトディレクトリに移動
readonly wk_dir_script="$(dirname $0)"
readonly dir_proj_root="$(cd ${wk_dir_script}/..; pwd)"
cd "${dir_proj_root}" || exit 1


#--------------------------------------------------
# main
#--------------------------------------------------
dir_target="src/main/${module}.py"
pydeps \
    --max-bacon 3 \
    --reverse \
    --no-show \
    --cluster \
    --min-cluster-size 2 \
    --max-cluster-size 8 \
    -o "images/main_${module}.svg" \
    "${dir_target}"
