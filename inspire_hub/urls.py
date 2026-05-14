"""
URL configuration for inspire_hub project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

_prefix = (getattr(settings, 'URL_PATH_PREFIX', None) or '').strip().strip('/')
_base = f'{_prefix}/' if _prefix else ''

urlpatterns = [
    path(f'{_base}admin/', admin.site.urls),
    path(f'{_base}api/v1/', include('core.api_urls')),
    path(_base if _base else '', include('core.urls')),
]

if getattr(settings, 'SILK_ENABLED', False):
    urlpatterns.insert(0, path(f'{_base}silk/', include('silk.urls', namespace='silk')))

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
