#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${SWITCHYARD_REPO_URL:-https://github.com/irvanariyanto/switchyard.git}"
INSTALL_DIR="${SWITCHYARD_HOME:-$HOME/.local/share/switchyard}"
BIN_DIR="${SWITCHYARD_BIN_DIR:-$HOME/.local/bin}"
START_AFTER_INSTALL="false"
BACKGROUND="false"

usage() {
  cat <<EOF
Install Switchyard.

Usage:
  install.sh
  install.sh --start
  install.sh --start --background

Environment:
  SWITCHYARD_HOME=$INSTALL_DIR
  SWITCHYARD_BIN_DIR=$BIN_DIR
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --start)
      START_AFTER_INSTALL="true"
      ;;
    --background|-b|--daemon|-d)
      BACKGROUND="true"
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
  shift
done

need_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

need_command git
need_command node
need_command npm

mkdir -p "$BIN_DIR"

if [ -d "$INSTALL_DIR/.git" ]; then
  echo "Updating Switchyard in $INSTALL_DIR..."
  git -C "$INSTALL_DIR" pull --ff-only
elif [ -e "$INSTALL_DIR" ]; then
  echo "Install directory exists but is not a git repository: $INSTALL_DIR"
  echo "Set SWITCHYARD_HOME to another path or remove that directory."
  exit 1
else
  echo "Installing Switchyard to $INSTALL_DIR..."
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"
npm install
npm run build
chmod +x "$INSTALL_DIR/bin/switchyard"
ln -sf "$INSTALL_DIR/bin/switchyard" "$BIN_DIR/switchyard"

cat <<EOF
Switchyard installed.

Command:
  $BIN_DIR/switchyard

Default URL:
  http://127.0.0.1:49287
EOF

case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *)
    echo
    echo "Add this to your shell profile if 'switchyard' is not found:"
    echo "  export PATH=\"$BIN_DIR:\$PATH\""
    ;;
esac

if [ "$START_AFTER_INSTALL" = "true" ]; then
  if [ "$BACKGROUND" = "true" ]; then
    "$BIN_DIR/switchyard" start --background
  else
    "$BIN_DIR/switchyard" start
  fi
fi
