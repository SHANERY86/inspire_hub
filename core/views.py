"""HTML views: serve the built React shell when Django handles the site root (e.g. local runserver)."""
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, HttpResponse
from django.views.decorators.http import require_GET


@require_GET
def spa_index(request):
    """
    Production SPA is normally served by nginx from the frontend image.
    When hitting Django directly (runserver), return the Vite build if present.
    """
    dist_index = Path(settings.BASE_DIR) / 'frontend' / 'dist' / 'index.html'
    if dist_index.is_file():
        return FileResponse(dist_index.open('rb'), content_type='text/html; charset=utf-8')
    return HttpResponse(
        '<!doctype html><html><body><p>React production build not found. '
        'Run <code>npm run build</code> in <code>frontend/</code>, or use '
        '<code>npm run dev</code> (Vite) and open the dev URL instead.</p></body></html>',
        content_type='text/html; charset=utf-8',
        status=503,
    )
