# Inspire Hub

A personal inspiration journal for capturing quotes, thoughts, and screenshots from books, articles, and other sources. Built with Django REST Framework and React, deployed to a Raspberry Pi via Docker and Ansible.

## Features

- **Two-step inspiration flow** — upload a screenshot, OCR extracts the text (via OCR.space), crop and pick the lines you want, then save with your own thoughts
- **Source library** — track books, articles, and other media with ISBN auto-lookup (Open Library)
- **Public spotlight** — mark inspirations as public; guests see a rotating showcase on the home page
- **Screenshot management** — crop, preview, and attach images to inspirations
- **User accounts** — session-based auth with signup request emails to the admin
- **Filtering & browsing** — filter your inspirations by source, search, and view by source gallery

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, react-easy-crop |
| Backend | Django 4.2, Django REST Framework, Gunicorn |
| Database | PostgreSQL 16 |
| OCR | OCR.space API |
| Containers | Docker (multi-stage builds), nginx |
| CI/CD | GitHub Actions — pytest, build + push `linux/arm/v7` images to GHCR |
| Deployment | Ansible playbook to Raspberry Pi |
| Backups | Cron script on Pi with rclone upload to Google Drive |
| Monitoring | Netdata + lightweight HTML dashboard |

## Project structure

```
inspire_hub/
├── core/                       # Django app (models, views, API, templates)
│   ├── models.py               # Source, Inspiration, Screenshot
│   ├── views.py                # DRF viewsets + SPA shell
│   ├── api_urls.py             # /api/v1/ routes
│   └── serializers.py
├── inspire_hub/                # Django project config (settings, urls, wsgi)
├── frontend/                   # React SPA (Vite)
│   ├── src/components/         # AddInspirationView, HomeView, SourcesGalleryView, etc.
│   ├── Dockerfile              # Multi-stage: Node build → nginx
│   └── vite.config.js
├── ansible/                    # Ansible deployment to Pi
│   ├── inventory/hosts.yml     # Host vars, vaulted secrets
│   └── playbooks/deploy.yml    # Pull GHCR images, template .env, start stack
├── scripts/
│   ├── backup-on-pi.sh         # pg_dump + media → .tar.gz, optional rclone to Google Drive
│   └── pi-monitoring-dashboard.html
├── docs/
│   ├── backup-google-drive.md  # Backup + rclone setup guide
│   ├── deploy-apache.md        # Apache reverse proxy setup
│   └── pi-monitoring-dashboard.md
├── tests/                      # pytest suite (API, auth, sources, SPA routes)
├── docker-compose.yml          # Local dev stack (build from source)
├── docker-compose.ghcr.yml     # Production stack (pre-built GHCR images)
├── Dockerfile                  # Backend: Python 3.11 + Gunicorn
├── .github/workflows/          # CI: test + build ARM images
├── .env.example                # Environment variable template
└── requirements.txt            # Python dependencies
```

## Local development

### Prerequisites

- Python 3.11+
- Node 20+
- PostgreSQL (or use Docker)

### Backend

```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # edit DB_HOST=localhost, add OCR_SPACE_API_KEY
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173/inspire-hub/
```

Vite proxies `/inspire-hub/api` to Django at `127.0.0.1:8000`.

### Tests

```bash
pytest
```

## Docker (local build)

```bash
cp .env.example .env
docker compose build
docker compose up -d
```

App at `http://localhost:8080/inspire-hub/`.

## Deployment (Raspberry Pi)

Pre-built ARM images are pushed to GHCR on every merge to `main`/`master`.

```bash
cd ansible
ansible-playbook playbooks/deploy.yml --ask-vault-pass
```

Common tags: `--tags frontend`, `--tags stack`, `--tags env` (refresh `.env`), `--tags full` (default).

See `ansible/inventory/hosts.yml` for host config and vaulted secrets.

## Backups

A cron job on the Pi dumps Postgres and media nightly, uploads to Google Drive via rclone, and removes old local/remote archives.

Setup: [docs/backup-google-drive.md](docs/backup-google-drive.md)

## Monitoring

Netdata runs on the Pi (port 19999). A lightweight HTML dashboard shows CPU, temperature, load, RAM, and disk at a glance.

Setup: [docs/pi-monitoring-dashboard.md](docs/pi-monitoring-dashboard.md)

## Environment variables

See `.env.example` for all options. Key variables:

| Variable | Purpose |
|----------|---------|
| `SECRET_KEY` | Django secret key |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | PostgreSQL connection |
| `OCR_SPACE_API_KEY` | OCR.space API key for text extraction |
| `ALLOWED_HOSTS` | Django allowed hosts |
| `CSRF_TRUSTED_ORIGINS` | Trusted origins for CSRF |
| `URL_PATH_PREFIX` | Subpath mount (e.g. `inspire-hub`) |
| `SILK_ENABLED` | Enable Silk profiling UI (staff only) |

## API

All endpoints live under `/inspire-hub/api/v1/` (or `/<URL_PATH_PREFIX>/api/v1/`).

| Endpoint | Methods | Auth | Purpose |
|----------|---------|------|---------|
| `auth/csrf/` | GET | Public | Set CSRF cookie |
| `auth/login/` | POST | Public | Session login |
| `auth/logout/` | POST | Auth | Session logout |
| `auth/me/` | GET | Auth | Current user |
| `auth/signup-request/` | POST | Public | Email signup request to admin |
| `inspirations/` | CRUD | Auth / ReadOnly | Inspirations (public ones visible to guests) |
| `sources/` | CRUD | Auth | Source library |
| `sources/isbn-lookup/` | GET | Auth | ISBN lookup via Open Library |
| `screenshots/` | CRUD | Auth | Screenshot management |
| `inspiration-drafts/preview/` | POST | Auth | Upload screenshot + OCR preview |
| `inspiration-drafts/commit/` | POST | Auth | Commit previewed draft |

## License

Personal project.
