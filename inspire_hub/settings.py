"""
Django settings for inspire_hub project.
"""

from pathlib import Path

from decouple import config
from django.urls import reverse_lazy

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY', default='django-insecure-dev-key-change-in-production-123456789')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = config(
    'ALLOWED_HOSTS',
    default='localhost,127.0.0.1',
    cast=lambda v: [s.strip() for s in v.split(',') if s.strip()],
)


def _comma_separated_list(raw: str):
    return [s.strip() for s in raw.split(',') if s.strip()]


_csrf_from_env = _comma_separated_list(config('CSRF_TRUSTED_ORIGINS', default=''))
# Local Vite + Django runserver: merge safe defaults so .env does not need every dev URL.
_local_csrf_origins = [
    'http://127.0.0.1:5173',
    'http://localhost:5173',
    'http://127.0.0.1:8000',
    'http://localhost:8000',
]
if DEBUG:
    CSRF_TRUSTED_ORIGINS = list(dict.fromkeys(_local_csrf_origins + _csrf_from_env))
else:
    CSRF_TRUSTED_ORIGINS = _csrf_from_env

# When TLS terminates at a reverse proxy, nginx should forward X-Forwarded-Proto.
# Only enable in deployments where clients cannot reach Gunicorn directly with a spoofed header.
if config('TRUST_BEHIND_PROXY', default=False, cast=bool):
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Mount URLconf under /<prefix>/ (e.g. inspire-hub) when Apache only proxies that path.
# Empty for dev/tests at site root. Set URL_PATH_PREFIX in .env (Ansible: inspire_url_path_prefix).
URL_PATH_PREFIX = config('URL_PATH_PREFIX', default='').strip().strip('/')

# Session/CSRF cookies scoped to the app path when mounted under a prefix (e.g. /inspire-hub/).
# Skip while DEBUG so local Vite (requests to /api/...) still receives cookies if URL_PATH_PREFIX is set.
if URL_PATH_PREFIX and not DEBUG:
    _cookie_path = f'/{URL_PATH_PREFIX}/'
    SESSION_COOKIE_PATH = _cookie_path
    CSRF_COOKIE_PATH = _cookie_path

GOOGLE_SEARCH_API_KEY = config('GOOGLE_SEARCH_API_KEY', default='')
GOOGLE_SEARCH_CX = config('GOOGLE_SEARCH_CX', default='')

LOGIN_URL = 'core:home'
LOGIN_REDIRECT_URL = reverse_lazy('core:home')
LOGOUT_REDIRECT_URL = reverse_lazy('core:home')

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'django_filters',
    'core',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
    ],
}

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'inspire_hub.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'inspire_hub.wsgi.application'


# Database - PostgreSQL
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='inspire_hub'),
        'USER': config('DB_USER', default='sryan'),
        'PASSWORD': config('DB_PASSWORD', default=''),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
    }
}


# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# Static files (CSS, JavaScript, Images)
STATIC_URL = config('STATIC_URL', default='/static/')
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        # Use the plain Django staticfiles storage to avoid WhiteNoise's compression
        # post-processing during `collectstatic` on low-resource hosts.
        'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage',
    },
}

# Media files (User uploads)
MEDIA_URL = config('MEDIA_URL', default='/media/')
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# OCR.space API Configuration
OCR_SPACE_API_KEY = config('OCR_SPACE_API_KEY', default='')

# Email (signup requests, optional outbound mail)
SIGNUP_REQUEST_NOTIFICATION_EMAIL = config(
    'SIGNUP_REQUEST_NOTIFICATION_EMAIL',
    default='shanery86@gmail.com',
).strip()

DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='webmaster@localhost')

EMAIL_BACKEND = config(
    'EMAIL_BACKEND',
    default='django.core.mail.backends.console.EmailBackend',
)
EMAIL_HOST = config('EMAIL_HOST', default='')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')

if EMAIL_HOST:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'

# Pi / staging: set INSPIRE_DEV_LOGGING=true in .env for Gunicorn access logs + SQL to stdout.
# Turn off for production (noise; SQL may include sensitive literals).
if config('INSPIRE_DEV_LOGGING', default=False, cast=bool):
    LOGGING = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'verbose': {
                'format': '{levelname} {asctime} {name} {message}',
                'style': '{',
            },
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'formatter': 'verbose',
            },
        },
        'loggers': {
            'django.db.backends': {
                'level': 'DEBUG',
                'handlers': ['console'],
                'propagate': False,
            },
        },
    }

# Optional profiling UI: set SILK_ENABLED=true, log in as staff, open /<URL_PATH_PREFIX>/silk/
# (e.g. https://host/inspire-hub/silk/). Turn off when done; stores data in DB (silk_* tables).
SILK_ENABLED = config('SILK_ENABLED', default=False, cast=bool)
if SILK_ENABLED:
    INSTALLED_APPS.append('silk')
    MIDDLEWARE.insert(1, 'silk.middleware.SilkyMiddleware')  # after SecurityMiddleware (pip: django-silk)
    SILKY_AUTHENTICATION = True
    SILKY_AUTHORISATION = True
    SILKY_PYTHON_PROFILER = config('SILK_PYTHON_PROFILER', default=False, cast=bool)

