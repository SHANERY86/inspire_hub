"""Anonymous POST to notify the site owner of a new-account request (email)."""
import json
import logging
from datetime import datetime
from zoneinfo import ZoneInfo

from django.conf import settings
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_protect

logger = logging.getLogger(__name__)

_username_validator = UnicodeUsernameValidator()


def _client_ip(request):
    forwarded = (request.META.get('HTTP_X_FORWARDED_FOR') or '').split(',')
    if forwarded and forwarded[0].strip():
        return forwarded[0].strip()
    return request.META.get('REMOTE_ADDR') or ''


@method_decorator(csrf_protect, name='dispatch')
class SignupRequestView(View):
    """POST JSON with account-request fields; emails the configured admin address."""

    http_method_names = ['post']

    def post(self, request):
        try:
            data = json.loads(request.body.decode() or '{}')
        except json.JSONDecodeError:
            return JsonResponse({'detail': 'Invalid JSON.'}, status=400)

        first_name = (data.get('first_name') or '').strip()
        last_name = (data.get('last_name') or '').strip()
        location = (data.get('location') or '').strip()
        email = (data.get('email') or '').strip()
        username = (data.get('username') or '').strip()
        password = data.get('password') or ''

        if not first_name or len(first_name) > 100:
            return JsonResponse({'detail': 'First name is required (max 100 characters).'}, status=400)
        if not last_name or len(last_name) > 100:
            return JsonResponse({'detail': 'Last name is required (max 100 characters).'}, status=400)
        if not location or len(location) > 300:
            return JsonResponse({'detail': 'Location is required (max 300 characters).'}, status=400)
        if not email or len(email) > 254:
            return JsonResponse({'detail': 'Email is required.'}, status=400)
        try:
            validate_email(email)
        except ValidationError:
            return JsonResponse({'detail': 'Enter a valid email address.'}, status=400)

        if not username or len(username) > 150:
            return JsonResponse({'detail': 'Username is required (max 150 characters).'}, status=400)
        try:
            _username_validator(username)
        except ValidationError as exc:
            msg = exc.messages[0] if exc.messages else 'Invalid username.'
            return JsonResponse({'detail': msg}, status=400)

        if not password or len(password) < 8:
            return JsonResponse({'detail': 'Password must be at least 8 characters.'}, status=400)
        if len(password) > 256:
            return JsonResponse({'detail': 'Password is too long.'}, status=400)

        to_email = getattr(settings, 'SIGNUP_REQUEST_NOTIFICATION_EMAIL', '').strip()
        if not to_email:
            logger.error('SIGNUP_REQUEST_NOTIFICATION_EMAIL is not configured.')
            return JsonResponse({'detail': 'Account requests are not configured on the server.'}, status=503)

        when = datetime.now(tz=ZoneInfo('UTC')).strftime('%Y-%m-%d %H:%M:%S %Z')
        ip = _client_ip(request)
        body = (
            'Inspire Hub account request\n'
            '\n'
            f'First name: {first_name}\n'
            f'Last name: {last_name}\n'
            f'Location: {location}\n'
            f'Email: {email}\n'
            f'Username requested: {username}\n'
            f'Password requested: {password}\n'
            '\n'
            f'Submitted at (UTC): {when}\n'
            f'Client IP: {ip or "(unknown)"}\n'
        )

        subject = 'inspire hub login request'
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or 'webmaster@localhost'

        try:
            send_mail(
                subject,
                body,
                from_email,
                [to_email],
                fail_silently=False,
            )
        except Exception:
            logger.exception('Failed to send signup request email')
            return JsonResponse(
                {'detail': 'Could not send your request right now. Please try again later.'},
                status=503,
            )

        return JsonResponse({'detail': 'ok'})
