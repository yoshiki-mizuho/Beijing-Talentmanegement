#!/bin/sh
# 基盤から取り込んだものを、指定した版に揃える。版を上げるときの入口は、このコマンド 1 つ。
# 正本は、基盤のリポジトリ（chosen-ryoiki-group/hamburg/hub-platform）の contract/hub-files/update-contract.sh。
# Hub のリポジトリでは scripts/update-contract.sh に置く。写すのは最初の 1 回だけ（後は、取った版のものに自分で置き換わる）。
#
# 使い方: scripts/update-contract.sh <版> [--desktop]      例: scripts/update-contract.sh 0.17.0
#   --desktop  デスクトップ版を始めるときに 1 回だけ付ける。desktop/scripts/desktop.sh と desktop/desktop.version を置く
#              （次は desktop/scripts/desktop.sh init <製品名> <最初に開くパス> <アプリの名前>）。
#   版は 0.15.0 か hub-contract/v0.15.0 の形（基盤のリポジトリのブランチ・コミットも可）。
#   版の一覧と変更の内容: 基盤のリポジトリの contract/CHANGELOG.md（取った後は contract/CHANGELOG.md）
#
# 1 回の取得で、次を取った版に揃える:
#   contract/               proto、Claude Code 向けの基盤の決まり、利用ガイド（guide.md）、設定ファイルの書式
#                           （deploy-values.md）、CHANGELOG.md、画面の見た目の決まり（design/）、
#                           公開する口の書式（hubs/FORMAT.md）。版は contract/VERSION に書く
#   .claude/skills/hub-*/   Claude Code のスキル。丸ごと置き換える（hub- で始まらない、この Hub 独自のスキルには触らない）
#   scripts/                update-contract.sh（このファイル）、hub-contracts.sh、devkit.sh（devkit を使っているとき）
#   devkit.version          ファイルがあるとき（.devkit/ は、次の scripts/devkit.sh up が取り込み直す）
#   desktop/                desktop.version と scripts/desktop.sh（デスクトップ版を持つとき。殻は別に取り込み直す）
# 取った版に contract/hub-files/ が無い（0.14.1 以前）ときは、contract/ とスキルだけを取り込む。
#
# 環境変数:
#   HUB_PLATFORM_REPO   基盤のリポジトリ（既定 https://gitlab.com/chosen-ryoiki-group/hamburg/hub-platform.git）
#   HUB_PLATFORM_REF    取る先のブランチ・タグ・コミット（既定は <版>）。基盤の担当が、タグを打つ前に確かめるとき用
set -eu

REPO="${HUB_PLATFORM_REPO:-https://gitlab.com/chosen-ryoiki-group/hamburg/hub-platform.git}"
SELF="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"

die() { echo "FATAL: $*" >&2; exit 1; }
usage() { sed -n '2,/^[^#]/{/^#/s/^# \{0,1\}//p;}' "$SELF"; exit 1; }

# 0.15.0 → hub-contract/v0.15.0。ほかの形（タグ・ブランチ・コミット）は、そのまま
norm_ref() {
  if echo "$1" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$'; then echo "hub-contract/v$1"; else echo "$1"; fi
}

# put <基盤の中のパス> <置き場所>: 取った版のものと違うときだけ置き換える（隣に書いてから mv する）
put() {
  [ -f "$SRC/$1" ] || return 0
  if [ -f "$2" ] && cmp -s "$SRC/$1" "$2"; then return 0; fi
  mkdir -p "$(dirname "$2")"
  cp "$SRC/$1" "$2.new"
  chmod +x "$2.new"
  mv -f "$2.new" "$2"
  CHANGED="${CHANGED} $2"
}

# pin <版を書くファイル>: ファイルがあれば、取った版にする
pin() {
  [ -f "$1" ] || return 0
  if [ "$(sed -n '1p' "$1" | tr -d '[:space:]')" != "$TAG" ]; then
    echo "$TAG" > "$1"
    echo "$1 を ${TAG} にした"
  fi
}

# 本体は関数にまとめ、最後の行で呼ぶ（途中でこのファイルが置き換わっても、読み込み済みの内容で最後まで動く）
main() {
  WITH_DESKTOP=""
  if [ $# -eq 2 ] && [ "$2" = "--desktop" ]; then WITH_DESKTOP=1; set -- "$1"; fi
  [ $# -eq 1 ] || usage
  case "$1" in -*) usage ;; esac
  TAG=$(norm_ref "$1")
  REF=$(norm_ref "${HUB_PLATFORM_REF:-$TAG}")

  if [ -n "${HUB_UPDATE_SRC:-}" ]; then
    # 取った版の update-contract.sh として、Hub の update-contract.sh から呼ばれた（取得は済んでいる）
    SRC="$HUB_UPDATE_SRC"
    cd "$HUB_UPDATE_ROOT"
  else
    cd "$(dirname "$SELF")/.."
    TMP=$(mktemp -d)
    trap 'rm -rf "$TMP"' EXIT
    SRC="$TMP/platform"
    git init --quiet "$SRC"
    git -C "$SRC" fetch --quiet --depth 1 "$REPO" "$REF" \
      || die "基盤のリポジトリ（${REPO}）から ${REF} を取れない。版の名前と、リポジトリを読めるかを確かめる"
    git -C "$SRC" -c advice.detachedHead=false checkout --quiet FETCH_HEAD
    # このファイルが取った版のものと違うときは、取った版のものに取り込みを任せる（その中で、このファイルも置き換わる）
    NEW="$SRC/contract/hub-files/update-contract.sh"
    if [ -f "$NEW" ] && ! cmp -s "$NEW" "$SELF"; then
      echo "scripts/update-contract.sh が ${TAG} のものと違うので、${TAG} のもので取り込む"
      RC=0
      if [ -n "$WITH_DESKTOP" ]; then
        HUB_UPDATE_SRC="$SRC" HUB_UPDATE_ROOT="$PWD" sh "$NEW" "$1" --desktop || RC=$?
      else
        HUB_UPDATE_SRC="$SRC" HUB_UPDATE_ROOT="$PWD" sh "$NEW" "$1" || RC=$?
      fi
      exit "$RC"
    fi
  fi

  for p in contract/proto contract/hub-platform-for-claude.md contract/CHANGELOG.md contract/skills \
           contract/hubs/FORMAT.md guide/README.md deploy/helm/hub-app/README.md design; do
    [ -e "$SRC/$p" ] || die "${REF} には ${p} が無い（0.14.0 以降の版を指定する）。何も書き換えていない"
  done

  # --- 契約（contract/）。contract/hubs/<製品名>/（ほかの Hub から取り込んだ定義）には触らない ---
  mkdir -p contract/hubs
  rm -rf contract/proto contract/design
  cp -r "$SRC/contract/proto" contract/proto
  cp -r "$SRC/design" contract/design
  cp "$SRC/contract/hub-platform-for-claude.md" contract/hub-platform-for-claude.md
  cp "$SRC/contract/CHANGELOG.md" contract/CHANGELOG.md
  cp "$SRC/guide/README.md" contract/guide.md
  cp "$SRC/deploy/helm/hub-app/README.md" contract/deploy-values.md
  cp "$SRC/contract/hubs/FORMAT.md" contract/hubs/FORMAT.md
  echo "$TAG" > contract/VERSION

  # --- スキル（.claude/skills/hub-*/）。基盤から無くなったものは消える ---
  mkdir -p .claude/skills
  for d in .claude/skills/hub-*; do
    if [ -e "$d" ] || [ -L "$d" ]; then rm -rf "$d"; fi
  done
  for d in "$SRC/contract/skills"/hub-*; do
    [ -f "$d/SKILL.md" ] || continue
    cp -r "$d" ".claude/skills/$(basename "$d")"
  done

  # --- スクリプトと、devkit・デスクトップ版の版 ---
  CHANGED=""
  DESKTOP=""
  if [ -d "$SRC/contract/hub-files" ]; then
    put contract/hub-files/update-contract.sh scripts/update-contract.sh
    put contract/hub-files/hub-contracts.sh scripts/hub-contracts.sh
    if [ -f scripts/devkit.sh ] || [ -f devkit.version ]; then
      put devkit/hub-files/devkit.sh scripts/devkit.sh
      pin devkit.version
    fi
    if [ -n "$WITH_DESKTOP" ] && [ ! -f desktop/desktop.version ]; then
      mkdir -p desktop
      echo "$TAG" > desktop/desktop.version
    fi
    if [ -f desktop/scripts/desktop.sh ] || [ -f desktop/desktop.version ]; then
      put desktop/hub-files/desktop.sh desktop/scripts/desktop.sh
      pin desktop/desktop.version
      DESKTOP=1
    fi
  else
    echo "お知らせ: ${TAG} には contract/hub-files/ が無い（0.14.1 以前）。scripts/、devkit.version、desktop/ は、そのままにした"
  fi

  echo "更新した: ${TAG}"
  [ -z "$CHANGED" ] || echo "スクリプトを ${TAG} のものに置き換えた:${CHANGED}"
  if [ -n "$WITH_DESKTOP" ]; then
    echo "デスクトップ版を始める: desktop/scripts/desktop.sh update の後、desktop/scripts/desktop.sh init <製品名> <最初に開くパス> <アプリの名前>"
  elif [ -n "$DESKTOP" ]; then
    echo "デスクトップ版の殻を取り込み直す: desktop/scripts/desktop.sh update"
  fi
  git status --short -- contract .claude/skills scripts devkit.version desktop 2>/dev/null || true
  exit 0
}

main "$@"
