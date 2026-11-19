#!/bin/sh
# ほかの Hub が公開している口（gRPC の定義とイベント）と予定を、基盤のリポジトリの最新から読む。
# 写しは持たない。見るたびに取りに行く。使うと決めた定義だけを --take で取り込む。
# 正本は、基盤のリポジトリ（chosen-ryoiki-group/hamburg/hub-platform）の contract/hub-files/hub-contracts.sh。
# Hub のリポジトリでは scripts/hub-contracts.sh に置く（scripts/update-contract.sh <版> が、取った版のものに置き換える）。
#
# 使い方:
#   scripts/hub-contracts.sh                    一覧（全 Hub の、出している口と予定）
#   scripts/hub-contracts.sh <製品名>           その Hub の説明と、定義のファイルの一覧
#   scripts/hub-contracts.sh <製品名> --take    定義を contract/hubs/<製品名>/ に取り込み、
#                                               取り込んだ基盤のコミットを contract/hubs/<製品名>/VERSION に書く
#
# 環境変数:
#   HUB_PLATFORM_REPO   基盤のリポジトリ（既定 https://gitlab.com/chosen-ryoiki-group/hamburg/hub-platform.git）
#   HUB_PLATFORM_REF    読むブランチ・タグ・コミット（既定 main。版は 0.15.0 か hub-contract/v0.15.0 の形）
set -eu
NAME="${1:-}"
MODE="${2:-}"
REPO="${HUB_PLATFORM_REPO:-https://gitlab.com/chosen-ryoiki-group/hamburg/hub-platform.git}"
REF="${HUB_PLATFORM_REF:-main}"
SELF="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"

usage() { sed -n '2,/^[^#]/{/^#/s/^# \{0,1\}//p;}' "$SELF"; exit 1; }
case "$NAME" in -*) usage ;; esac
if [ -n "$NAME" ]; then
  echo "$NAME" | grep -Eq '^[a-z0-9][a-z0-9-]*$' || { echo "FATAL: '$NAME' は製品名として使えない（英小文字・数字・ハイフン）"; exit 1; }
fi
[ -z "$MODE" ] || [ "$MODE" = "--take" ] || usage
# 0.15.0 → hub-contract/v0.15.0。ほかの形（タグ・ブランチ・コミット）は、そのまま
if echo "$REF" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$'; then REF="hub-contract/v${REF}"; fi

cd "$(dirname "$SELF")/.."
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
git init --quiet "$TMP/platform"
git -C "$TMP/platform" fetch --quiet --depth 1 "$REPO" "$REF" \
  || { echo "FATAL: 基盤のリポジトリ（${REPO}）から ${REF} を取れない。リポジトリを読めるかを確かめる"; exit 1; }
git -C "$TMP/platform" -c advice.detachedHead=false checkout --quiet FETCH_HEAD
SRC="$TMP/platform/contract/hubs"
COMMIT=$(git -C "$TMP/platform" rev-parse HEAD)
[ -f "$SRC/README.md" ] || { echo "FATAL: 基盤のリポジトリ（${REF}）に、公開している口の一覧（contract/hubs/README.md）が無い"; exit 1; }

# --- 一覧 ---------------------------------------------------------------------
if [ -z "$NAME" ]; then
  cat "$SRC/README.md"
  echo
  echo "（読んだ先: ${REPO} の ${REF}、コミット ${COMMIT}）"
  exit 0
fi

# --- 1 つの Hub ---------------------------------------------------------------
# 一覧のページの「集めた結果」の表から、その Hub の行を取る（表の最初に出てくる行）
HEAD_LINE=$(grep '^| Hub |' "$SRC/README.md" | head -1 || true)
LINE=$(grep "^| ${NAME} |" "$SRC/README.md" | head -1 || true)
state() { echo "$HEAD_LINE"; echo "$LINE"; }
if [ ! -f "$SRC/$NAME/hub.yaml" ]; then
  if [ -n "$LINE" ]; then
    echo "${NAME} の口は、一覧に載っていない。集めた結果:"
    state
  else
    echo "${NAME} は一覧に無い。製品名は、引数なしで流すと確かめられる。"
  fi
  exit 1
fi
case "$LINE" in
  "" | *"| 読めた |"* | *"登録済み"*) ;;
  *) echo "注意: ${NAME} の最新を読めていない。下は前回の内容。集めた結果:"; state; echo ;;
esac

if [ "$MODE" != "--take" ]; then
  [ ! -f "$SRC/$NAME/README.md" ] || cat "$SRC/$NAME/README.md"
  echo
  echo "--- 要約（hub.yaml） ---"
  cat "$SRC/$NAME/hub.yaml"
  echo
  echo "--- 定義のファイル ---"
  (cd "$SRC/$NAME" && find . -type f | sed 's#^\./##' | sort)
  echo
  echo "（読んだ先: ${REPO} の ${REF}、コミット ${COMMIT}）"
  echo "取り込むとき: scripts/hub-contracts.sh ${NAME} --take"
  exit 0
fi

# --- 取り込む -----------------------------------------------------------------
DEST="contract/hubs/$NAME"
rm -rf "$DEST"
mkdir -p contract/hubs
cp -r "$SRC/$NAME" "$DEST"
echo "$COMMIT" > "$DEST/VERSION"
echo "取り込んだ: ${DEST}（基盤のコミット ${COMMIT}）"
git status --short -- "$DEST"
