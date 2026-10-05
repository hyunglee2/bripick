#!/bin/sh
set -eu

archive="/home/bobf/bripick-deploy.tar.gz"
web_root="/var/www/bripick-app"
stage="/var/www/.bripick-app-stage-$$"
backup="/var/www/.bripick-app-backup-$(date +%Y%m%d-%H%M%S)-$$"
service_file="/etc/systemd/system/bripick.service"
nginx_file="/etc/nginx/sites-available/bripick"

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

if [ ! -f "$stage/server.js" ]; then
  echo "Deployment archive does not contain the standalone Next.js server" >&2
  exit 1
fi

if [ ! -f /etc/bripick.env ]; then
  echo "Missing /etc/bripick.env (SUPABASE_URL and SUPABASE_ANON_KEY)" >&2
  exit 1
fi

chown -R www-data:www-data "$stage"
find "$stage" -type d -exec chmod 755 {} +
find "$stage" -type f -exec chmod 644 {} +

if [ -e "$web_root" ]; then
  mv -- "$web_root" "$backup"
fi

mv -- "$stage" "$web_root"

cat > "$service_file" <<'EOF'
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
ExecStart=/usr/bin/node /var/www/bripick-app/server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

cat > "$nginx_file" <<'EOF'
server {
  listen 80;
  server_name bripick.coreluma.kr;
  client_max_body_size 3m;

  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
EOF

ln -sfn "$nginx_file" /etc/nginx/sites-enabled/bripick
systemctl daemon-reload
systemctl enable bripick >/dev/null

if ! nginx -t || ! systemctl restart bripick; then
  rm -rf -- "$web_root"
  if [ -e "$backup" ]; then
    mv -- "$backup" "$web_root"
    systemctl restart bripick || true
  fi
  exit 1
fi

if ! curl -fsS http://127.0.0.1:3001/ >/dev/null; then
  rm -rf -- "$web_root"
  if [ -e "$backup" ]; then
    mv -- "$backup" "$web_root"
  fi
  echo "Local Nginx health check failed; previous release restored." >&2
  exit 1
fi

rm -f -- "$archive"
systemctl reload nginx
echo "Next.js server release activated successfully."
