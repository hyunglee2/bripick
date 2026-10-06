#!/bin/sh
set -eu

archive="/home/bobf/bripick-deploy.tar.gz"
environment_upload="/home/bobf/bripick-deploy.env"
web_root="/var/www/bripick-app"
stage="/var/www/.bripick-app-stage-$$"
backup="/var/www/.bripick-app-backup-$(date +%Y%m%d-%H%M%S)-$$"
service_file="/etc/systemd/system/bripick.service"
nginx_file="/etc/nginx/sites-available/bripick"
certificate_dir="/etc/letsencrypt/live/bripick.coreluma.kr"
certbot_tls_options="/etc/letsencrypt/options-ssl-nginx.conf"
certbot_dhparams="/etc/letsencrypt/ssl-dhparams.pem"

node_binary="$(command -v node || true)"
if [ -z "$node_binary" ]; then
  echo "Node.js is not installed or is not available in PATH" >&2
  exit 1
fi

for tls_file in \
  "$certificate_dir/fullchain.pem" \
  "$certificate_dir/privkey.pem" \
  "$certbot_tls_options" \
  "$certbot_dhparams"; do
  if [ ! -f "$tls_file" ]; then
    echo "Required TLS file is missing: $tls_file" >&2
    exit 1
  fi
done

cleanup() {
  rm -rf -- "$stage"
  rm -f -- "$environment_upload"
}
trap cleanup EXIT INT TERM

if [ ! -f "$archive" ]; then
  echo "Deployment archive is missing: $archive" >&2
  exit 1
fi

mkdir -p -- "$stage"
tar -xzf "$archive" -C "$stage"

if [ ! -f "$stage/server.js" ]; then
  echo "Deployment archive does not contain the standalone Next.js server" >&2
  exit 1
fi

if [ ! -f "$environment_upload" ]; then
  echo "Deployment environment file is missing" >&2
  exit 1
fi

if ! grep -Eq '^SUPABASE_URL=.+$' "$environment_upload" ||
   ! grep -Eq '^SUPABASE_PUBLISHABLE_KEY=.+$' "$environment_upload"; then
  echo "Deployment environment file is missing required Supabase values" >&2
  exit 1
fi

install -o root -g root -m 600 "$environment_upload" /etc/bripick.env
rm -f -- "$environment_upload"

chown -R www-data:www-data "$stage"
find "$stage" -type d -exec chmod 755 {} +
find "$stage" -type f -exec chmod 644 {} +

if [ -e "$web_root" ]; then
  mv -- "$web_root" "$backup"
fi

mv -- "$stage" "$web_root"

cat > "$service_file" <<EOF
[Unit]
Description=Bripick Next.js server
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/bripick-app
Environment=NODE_ENV=production
Environment=HOSTNAME=127.0.0.1
Environment=PORT=3001
EnvironmentFile=/etc/bripick.env
ExecStart=$node_binary /var/www/bripick-app/server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

cat > "$nginx_file" <<'EOF'
server {
  listen 80;
  listen [::]:80;
  server_name bripick.coreluma.kr;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl;
  listen [::]:443 ssl;
  server_name bripick.coreluma.kr;

  ssl_certificate /etc/letsencrypt/live/bripick.coreluma.kr/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/bripick.coreluma.kr/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;
  ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

  client_max_body_size 3m;

  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
EOF

ln -sfn "$nginx_file" /etc/nginx/sites-enabled/bripick
systemctl daemon-reload
systemctl enable bripick >/dev/null

rollback_release() {
  systemctl stop bripick || true
  rm -rf -- "$web_root"
  if [ -e "$backup" ]; then
    mv -- "$backup" "$web_root"
    if [ -f "$web_root/server.js" ]; then
      systemctl restart bripick || true
    fi
  fi
}

if ! nginx -t || ! systemctl restart bripick; then
  systemctl status bripick --no-pager --full || true
  journalctl -u bripick -n 50 --no-pager || true
  rollback_release
  exit 1
fi

healthy=0
attempt=0
while [ "$attempt" -lt 30 ]; do
  if curl -fsS http://127.0.0.1:3001/ >/dev/null 2>&1; then
    healthy=1
    break
  fi
  attempt=$((attempt + 1))
  sleep 1
done

if [ "$healthy" -ne 1 ]; then
  echo "Next.js server did not become healthy within 30 seconds." >&2
  systemctl status bripick --no-pager --full || true
  journalctl -u bripick -n 50 --no-pager || true
  rollback_release
  echo "Previous release restored when available." >&2
  exit 1
fi

rm -f -- "$archive"
systemctl reload nginx
echo "Next.js server release activated successfully."
