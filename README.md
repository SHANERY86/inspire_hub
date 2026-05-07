# Inspire Hub

A personal inspiration and creative journal application to capture notes from things you read, watch, and your creative endeavors. Built with Django for robust user management and social features.

## Current Status: Draft 1 - Basic Django Setup ✓

Basic Django project structure with a simple home page.

## Why Django?

- **Built-in user authentication** - Login, logout, password management
- **Admin interface** - Free, professional admin panel
- **Social-ready** - Easy to add user profiles, following, sharing
- **Enterprise-grade** - Security, scalability, production-ready

## Prerequisites

- Python 3.8 or higher
- pip

## Setup Instructions

1. **Create a virtual environment:**
   ```bash
   python3 -m venv venv
   ```

2. **Activate the virtual environment:**
   - On macOS/Linux:
     ```bash
     source venv/bin/activate
     ```
   - On Windows:
     ```bash
     venv\Scripts\activate
     ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run migrations:**
   ```bash
   python manage.py migrate
   ```

5. **Run the development server:**
   ```bash
   python manage.py runserver
   ```

6. **Open your browser:**
   Navigate to `http://localhost:8000`

## Project Structure

```
inspire_hub/
├── manage.py              # Django management script
├── inspire_hub/           # Project configuration
│   ├── __init__.py
│   ├── settings.py        # Django settings
│   ├── urls.py            # Main URL routing
│   └── wsgi.py            # WSGI entry point
├── core/                  # Main application
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py          # Database models (to be added)
│   ├── views.py           # View functions
│   ├── urls.py            # App URL routing
│   └── templates/         # HTML templates
│       └── core/
│           └── index.html
├── requirements.txt       # Python dependencies
└── README.md             # This file
```

## Roadmap

- **Draft 1** : Basic Django setup with home page 
- **Draft 2** : Add database models and CRUD operations for entries
- **Draft 3**: Add user authentication and user-specific entries
- **Draft 4**: Add PostgreSQL database
- **Draft 5**: Add screenshot/video upload capability
- **Draft 6** (Current): Add OCR for converting text in images to searchable text ✓

## Development Notes

Using Django for its robust user management system, admin interface, and enterprise-ready architecture. SQLite for now, will migrate to PostgreSQL later.

## External API Service Example

A separate FastAPI service scaffold is included at `collector_service/` to experiment with an external Python API that connects directly to PostgreSQL.

See `collector_service/README.md` for setup and run steps.

## Container Deployment (Apache reverse proxy)

A production-oriented container stack is included:

- `docker-compose.yml` (Postgres + Django + frontend nginx)
- `Dockerfile` (Django/gunicorn image)
- `frontend/Dockerfile` (React build served by nginx)

Quick start:

```bash
cp .env.example .env
docker compose build
docker compose up -d
```

For Apache reverse proxy setup on your host, see `docs/deploy-apache.md`.

