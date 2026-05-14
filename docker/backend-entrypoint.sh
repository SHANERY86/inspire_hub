#!/bin/sh
set -e

python manage.py migrate --noinput
python manage.py collectstatic --noinput

# Gunicorn 26+ opens an optional control socket (extra thread). On small hosts (e.g. Pi) this can
# warn "can't start new thread"; disabling is fine unless you use the gunicornc CLI.
# INSPIRE_DEV_LOGGING=true: HTTP access log to stdout with %(T)s request time (seconds).
_base_args="inspire_hub.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 90 --no-control-socket"
case "${INSPIRE_DEV_LOGGING:-}" in
  1|true|True|yes|YES) exec gunicorn $_base_args --access-logfile - --access-logformat '%(t)s %(m)s %(U)s%(q)s %(s)s %(B)s %(T)ss' ;;
  *) exec gunicorn $_base_args ;;
esac
