# Deploy With Docker Compose + Apache

This setup runs the app stack in containers and uses your host Apache as the public reverse proxy.

## 1) Prepare env file

```bash
cp .env.example .env
```

Edit `.env` and set:

- `SECRET_KEY`
- `DB_PASSWORD`
- `ALLOWED_HOSTS` (include your real host/domain)
- `CSRF_TRUSTED_ORIGINS` (include `https://<your-domain>`)
- `OCR_SPACE_API_KEY` (optional, needed for OCR)

## 2) Start containers

```bash
docker compose build
docker compose up -d
```

The frontend container listens on host port `8080`.

## 3) Apache reverse proxy config (`/inspire-hub/` subfolder)

Enable required modules:

```bash
sudo a2enmod proxy proxy_http headers rewrite ssl
sudo systemctl restart apache2
```

Example vhost:

```apache
<VirtualHost *:80>
    ServerName inspire.local
    RewriteEngine On
    RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
</VirtualHost>

<VirtualHost *:443>
    ServerName inspire.local

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/inspire.local/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/inspire.local/privkey.pem

    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "https"

    # Keep existing root site untouched and mount Inspire Hub under /inspire-hub/
    ProxyPass /inspire-hub/ http://127.0.0.1:8080/
    ProxyPassReverse /inspire-hub/ http://127.0.0.1:8080/
</VirtualHost>
```

Reload Apache:

```bash
sudo apachectl configtest
sudo systemctl reload apache2
```

Notes:

- `frontend/vite.config.js` is already set to `base: '/inspire-hub/'`.
- Keep `ALLOWED_HOSTS` and `CSRF_TRUSTED_ORIGINS` host-based (for example `https://inspire.local`), not path-based.

## 4) Create admin user

```bash
docker compose exec backend python manage.py createsuperuser
```

## 5) Useful operations

```bash
docker compose logs -f
docker compose restart backend
docker compose down
```
