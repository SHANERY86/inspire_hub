from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .inspiration_api import (
    InspirationDraftCommitAPIView,
    InspirationDraftPreviewAPIView,
)
from .session_auth_views import (
    SessionCsrfView,
    SessionLoginView,
    SessionLogoutView,
    SessionMeView,
)
from .viewsets import InspirationViewSet, ScreenshotViewSet

router = DefaultRouter()
router.register(r'inspirations', InspirationViewSet, basename='inspiration')
router.register(r'screenshots', ScreenshotViewSet, basename='screenshot')

urlpatterns = [
    path('auth/csrf/', SessionCsrfView.as_view(), name='auth-csrf'),
    path('auth/login/', SessionLoginView.as_view(), name='auth-login'),
    path('auth/logout/', SessionLogoutView.as_view(), name='auth-logout'),
    path('auth/me/', SessionMeView.as_view(), name='auth-me'),
    path(
        'inspiration-drafts/preview/',
        InspirationDraftPreviewAPIView.as_view(),
        name='inspiration-draft-preview',
    ),
    path(
        'inspiration-drafts/commit/',
        InspirationDraftCommitAPIView.as_view(),
        name='inspiration-draft-commit',
    ),
    path('', include(router.urls)),
]
