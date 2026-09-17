#!/bin/sh
set -eu

archive="/home/bobf/bripick-deploy.tar.gz"
web_root="/var/www/bripick"
stage="/var/www/.bripick-stage-$$"
backup="/var/www/.bripick-backup-$(date +%Y%m%d-%H%M%S)-$$"

cleanup() {
  rm -rf -- "$stage"
}
trap cleanup EXIT INT TERM

if [ ! -f "$archive" ]; then
  echo "Deployment archive is missing: $archive" >&2
  exit 1
fi

mkdir -p -- "$stage"
tar -xzf "$archive" -C "$stage"

if [ ! -f "$stage/index.html" ]; then
  echo "Deployment archive does not contain index.html" >&2
  exit 1
fi

chown -R root:www-data "$stage"
find "$stage" -type d -exec chmod 755 {} +
find "$stage" -type f -exec chmod 644 {} +

if [ -e "$web_root" ]; then
  mv -- "$web_root" "$backup"
fi

mv -- "$stage" "$web_root"

if ! nginx -t; then
  rm -rf -- "$web_root"
  if [ -e "$backup" ]; then
    mv -- "$backup" "$web_root"
  fi
  exit 1
fi

if ! curl -fsS -H "Host: bripick.coreluma.kr" http://127.0.0.1/ >/dev/null; then
  rm -rf -- "$web_root"
  if [ -e "$backup" ]; then
    mv -- "$backup" "$web_root"
  fi
  echo "Local Nginx health check failed; previous release restored." >&2
  exit 1
fi

rm -f -- "$archive"
echo "Server release activated successfully."
