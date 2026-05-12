#!/bin/sh
set -e

python manage.py migrate --noinput
python manage.py collectstatic --noinput

# Gunicorn 26+ opens an optional control socket (extra thread). On small hosts (e.g. Pi) this can
# warn "can't start new thread"; disabling is fine unless you use the gunicornc CLI.
exec gunicorn inspire_hub.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 2 \
  --timeout 90 \
  --no-control-socket
