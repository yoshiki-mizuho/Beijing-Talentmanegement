#!/bin/sh
# hub-devkit（手元の開発用の入口と、偽の基盤）を、この Hub のリポジトリで使うためのコマンド。
# 正本は、基盤のリポジトリ（chosen-ryoiki-group/hamburg/hub-platform）の devkit/hub-files/devkit.sh。
# Hub のリポジトリでは scripts/devkit.sh に置く。このファイル 1 つを写せば、使い始められる。
# 版を上げるときは scripts/update-contract.sh <版>（このファイルと devkit.version も、その版に揃う）。
#
# 使い方:
#   scripts/devkit.sh update [<版>]   devkit のソース一式を、基盤のリポジトリから .devkit/ に取り込む。
#                                     版は 0.15.0 か hub-contract/v0.15.0 の形（基盤のリポジトリのブランチ・コミットも可）。
#                                     省くと devkit.version に書いてある版。版を渡すと devkit.version も書き換える。
#   scripts/devkit.sh init <製品名> <パスの接頭辞> [<アプリのサービス名> [<アプリのポート>]]
#                                     起動の設定（docker-compose.yml と dev/devkit.yaml）を置く。最初の 1 回だけ。
#                                     既にあるファイルは書き換えず、見本を <ファイル名>.devkit-sample に置く。
#   scripts/devkit.sh up [<docker compose up の引数>]
#                                     取り込んだ版を確かめて（無い・違うときは取り込み直して）、ビルドして起動する。
#                                     例: scripts/devkit.sh up -d --wait
#   scripts/devkit.sh down [<docker compose down の引数>]
#                                     止める。DB の中身も消すときは -v を付ける。
#   scripts/devkit.sh version         使うと決めた版と、取り込んである版を表示する。
#
# 置かれるもの:
#   .devkit/          基盤から取り込んだソース一式。git の管理から外す（.gitignore に入る）。手で直さない
#   devkit.version    使う版。コミットする（全員が同じ版になる）
#   docker-compose.yml / dev/devkit.yaml   この Hub の持ち物。コミットする。update では書き換わらない
#
# 環境変数:
#   HUB_PLATFORM_REPO   基盤のリポジトリ（既定 https://gitlab.com/chosen-ryoiki-group/hamburg/hub-platform.git）
#
# 要るもの: git（基盤のリポジトリを読めること）、Docker（Compose v2.20 以上）。
# 最初のビルドでは、Go の部品と土台のイメージを取るので、インターネットが要る。
set -eu

REPO="${HUB_PLATFORM_REPO:-https://gitlab.com/chosen-ryoiki-group/hamburg/hub-platform.git}"
DIR=".devkit"
VERSION_FILE="devkit.version"

SELF="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
cd "$(dirname "$SELF")/.."

die() { echo "FATAL: $*" >&2; exit 1; }
usage() { sed -n '2,/^[^#]/{/^#/s/^# \{0,1\}//p;}' "$SELF"; exit 1; }

# 0.15.0 → hub-contract/v0.15.0。ほかの形（タグ・ブランチ・コミット）は、そのまま
norm_ref() {
  if echo "$1" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$'; then echo "hub-contract/v$1"; else echo "$1"; fi
}

wanted_ref() {
  [ -f "$VERSION_FILE" ] || return 0
  norm_ref "$(sed -n '1p' "$VERSION_FILE" | tr -d '[:space:]')"
}

fetched_value() {
  [ -f "$DIR/VERSION" ] || return 0
  sed -n "s/^$1=//p" "$DIR/VERSION" | sed -n '1p'
}

cmd_update() {
  REF=$(norm_ref "${1:-}")
  [ -n "$REF" ] || REF=$(wanted_ref)
  [ -n "$REF" ] || die "版が決まっていない。scripts/devkit.sh update <版> で渡す（例: 0.15.0。版の一覧は基盤のリポジトリの contract/CHANGELOG.md）"
  TMP=$(mktemp -d)
  trap 'rm -rf "$TMP"' EXIT
  git init --quiet "$TMP/platform"
  git -C "$TMP/platform" fetch --quiet --depth 1 "$REPO" "$REF" \
    || die "基盤のリポジトリ（${REPO}）から ${REF} を取れない。版の名前と、リポジトリを読めるかを確かめる"
  git -C "$TMP/platform" -c advice.detachedHead=false checkout --quiet FETCH_HEAD
  [ -f "$TMP/platform/devkit/Dockerfile" ] || die "${REF} には devkit が入っていない（もっと新しい版を指定する）"
  COMMIT=$(git -C "$TMP/platform" rev-parse HEAD)
  rm -rf "$DIR"
  cp -r "$TMP/platform/devkit" "$DIR"
  printf 'ref=%s\ncommit=%s\n' "$REF" "$COMMIT" > "$DIR/VERSION"
  if [ "$(wanted_ref)" != "$REF" ]; then
    echo "$REF" > "$VERSION_FILE"
    echo "${VERSION_FILE} を ${REF} にした（コミットする）"
  fi
  if ! { [ -f .gitignore ] && grep -qx '\.devkit/' .gitignore; }; then
    # 最後の行に改行が無いファイルにも、行として足せるようにする
    if [ -s .gitignore ] && [ -n "$(tail -c 1 .gitignore)" ]; then echo >> .gitignore; fi
    echo '.devkit/' >> .gitignore
    echo ".gitignore に .devkit/ を足した（コミットする）"
  fi
  echo "取り込んだ: ${REF}（コミット ${COMMIT}）→ ${DIR}/"
  if [ -f scripts/devkit.sh ] && ! cmp -s scripts/devkit.sh "$DIR/hub-files/devkit.sh"; then
    echo "お知らせ: scripts/devkit.sh が、この版のものと違う。新しくするには: cp ${DIR}/hub-files/devkit.sh scripts/devkit.sh"
  fi
  if [ ! -f docker-compose.yml ] || [ ! -f dev/devkit.yaml ]; then
    echo "次にやること: scripts/devkit.sh init <製品名> <パスの接頭辞> で、起動の設定を置く"
  fi
}

# place <見本> <置き場所>: 無ければ置く。あれば書き換えず、隣に見本を置く。
place() {
  SRC="$1"; DST="$2"
  mkdir -p "$(dirname "$DST")"
  if [ -e "$DST" ]; then
    render "$SRC" > "${DST}.devkit-sample"
    echo "${DST} は既にあるので、書き換えていない。見本を ${DST}.devkit-sample に置いた（要る所を自分のファイルに写して、見本は消す）"
  else
    render "$SRC" > "$DST"
    echo "置いた: ${DST}"
  fi
}

render() {
  sed \
    -e "s#__HUB_NAME__#${HUB}#g" \
    -e "s#__HUB_PATH_PREFIX__#${PREFIX}#g" \
    -e "s#__APP_SERVICE__#${SERVICE}#g" \
    -e "s#__APP_PORT__#${PORT}#g" \
    "$1"
}

cmd_init() {
  HUB="${1:-}"; PREFIX="${2:-}"
  [ -n "$HUB" ] && [ -n "$PREFIX" ] || die "使い方: scripts/devkit.sh init <製品名> <パスの接頭辞> [<アプリのサービス名> [<アプリのポート>]]"
  SERVICE="${3:-${HUB}-web}"; PORT="${4:-8080}"
  for v in "$HUB" "$PREFIX" "$SERVICE"; do
    echo "$v" | grep -Eq '^[a-z0-9][a-z0-9-]*$' || die "'$v' は使えない（英小文字・数字・ハイフン）"
  done
  echo "$PORT" | grep -Eq '^[0-9]+$' || die "ポート '$PORT' は数字で書く"
  [ -d "$DIR/hub-files/templates" ] || die "${DIR}/ が無い。先に scripts/devkit.sh update <版> を流す"
  place "$DIR/hub-files/templates/docker-compose.yml" docker-compose.yml
  place "$DIR/hub-files/templates/devkit.yaml" dev/devkit.yaml
  echo "次にやること: docker-compose.yml の ${SERVICE} を自分のアプリに合わせて直し、scripts/devkit.sh up で起動する"
}

cmd_up() {
  command -v docker >/dev/null 2>&1 || die "docker が無い。Docker（Compose v2.20 以上）を入れる"
  WANT=$(wanted_ref)
  [ -n "$WANT" ] || die "${VERSION_FILE} が無い。先に scripts/devkit.sh update <版> を流す"
  HAVE=$(fetched_value ref)
  if [ ! -f "$DIR/Dockerfile" ]; then
    echo "${DIR}/ が無いので、${WANT} を取り込む"
    (cmd_update "$WANT")
  elif [ "$HAVE" != "$WANT" ]; then
    echo "取り込んである版（${HAVE}）が ${VERSION_FILE}（${WANT}）と違うので、取り込み直す"
    (cmd_update "$WANT")
  fi
  [ -f docker-compose.yml ] || die "docker-compose.yml が無い。scripts/devkit.sh init <製品名> <パスの接頭辞> で置く"
  [ -f dev/devkit.yaml ] || die "dev/devkit.yaml が無い。scripts/devkit.sh init <製品名> <パスの接頭辞> で置く"
  DEVKIT_VERSION="$(fetched_value ref)@$(fetched_value commit | cut -c 1-8)"
  export DEVKIT_VERSION
  exec docker compose up --build "$@"
}

cmd_down() {
  command -v docker >/dev/null 2>&1 || die "docker が無い"
  exec docker compose down "$@"
}

cmd_version() {
  echo "使うと決めた版（${VERSION_FILE}）: $(wanted_ref)"
  echo "取り込んである版（${DIR}/VERSION）: $(fetched_value ref) $(fetched_value commit)"
}

CMD="${1:-}"
[ -n "$CMD" ] || usage
shift
case "$CMD" in
  update)  cmd_update "$@" ;;
  init)    cmd_init "$@" ;;
  up)      cmd_up "$@" ;;
  down)    cmd_down "$@" ;;
  version) cmd_version ;;
  *)       usage ;;
esac
