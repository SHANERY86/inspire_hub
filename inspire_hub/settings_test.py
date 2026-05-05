"""
Test-only settings: SQLite so pytest does not need PostgreSQL CREATEDB.

`runserver` and normal dev still use `inspire_hub.settings` (Postgres).
Pytest uses this module via `pytest.ini` → `DJANGO_SETTINGS_MODULE`.
"""
from .settings import *  # noqa: F403

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'pytest.sqlite3',
    }
}
