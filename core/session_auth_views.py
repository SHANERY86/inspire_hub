"""Session login/logout/me for the React SPA (same auth backend as Django admin)."""
import json

from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie


@method_decorator(ensure_csrf_cookie, name='dispatch')
class SessionCsrfView(View):
    """GET: set csrftoken cookie so the SPA can POST with X-CSRFToken."""

    def get(self, request):
        return JsonResponse({'detail': 'ok'})


@method_decorator(csrf_protect, name='dispatch')
class SessionLoginView(View):
    """POST JSON { username, password } → establish session."""

    def post(self, request):
        try:
            data = json.loads(request.body.decode() or '{}')
        except json.JSONDecodeError:
            return JsonResponse({'detail': 'Invalid JSON.'}, status=400)

        username = (data.get('username') or '').strip()
        password = data.get('password') or ''
        if not username:
            return JsonResponse({'detail': 'Username required.'}, status=400)

        user = authenticate(request, username=username, password=password)
        if user is None:
            return JsonResponse({'detail': 'Invalid credentials.'}, status=400)
        if not user.is_active:
            return JsonResponse({'detail': 'Account disabled.'}, status=403)

        login(request, user)
        return JsonResponse(
            {
                'id': user.pk,
                'username': user.get_username(),
            }
        )


@method_decorator(csrf_protect, name='dispatch')
class SessionLogoutView(View):
    def post(self, request):
        logout(request)
        return JsonResponse({'detail': 'ok'})


class SessionMeView(View):
    def get(self, request):
        if not request.user.is_authenticated:
            return JsonResponse({'detail': 'Not authenticated.'}, status=401)
        return JsonResponse(
            {
                'id': request.user.pk,
                'username': request.user.get_username(),
            }
        )
