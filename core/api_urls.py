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
from .signup_request_view import SignupRequestView
from .source_api import SourceISBNLookupAPIView
from .viewsets import InspirationViewSet, ScreenshotViewSet, SourceViewSet

router = DefaultRouter()
router.register(r'inspirations', InspirationViewSet, basename='inspiration')
router.register(r'screenshots', ScreenshotViewSet, basename='screenshot')
router.register(r'sources', SourceViewSet, basename='source')

urlpatterns = [
    path('auth/csrf/', SessionCsrfView.as_view(), name='auth-csrf'),
    path('auth/login/', SessionLoginView.as_view(), name='auth-login'),
    path('auth/logout/', SessionLogoutView.as_view(), name='auth-logout'),
    path('auth/me/', SessionMeView.as_view(), name='auth-me'),
    path('auth/signup-request/', SignupRequestView.as_view(), name='auth-signup-request'),
    path(
        'sources/isbn-lookup/',
        SourceISBNLookupAPIView.as_view(),
        name='source-isbn-lookup',
    ),
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
