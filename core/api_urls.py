from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .dictionary_lookup_view import DictionaryLookupAPIView
from .recipe_scrape_view import RecipeScrapeAPIView
from .word_image_search_view import WordImageSearchAPIView
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
from .source_isbn_view import SourceISBNLookupAPIView
from .viewsets import InspirationViewSet, RecipeViewSet, ScreenshotViewSet, SourceViewSet, WordEntryViewSet

router = DefaultRouter()
router.register(r'inspirations', InspirationViewSet, basename='inspiration')
router.register(r'screenshots', ScreenshotViewSet, basename='screenshot')
router.register(r'sources', SourceViewSet, basename='source')
router.register(r'words', WordEntryViewSet, basename='word-entry')
router.register(r'recipes', RecipeViewSet, basename='recipe')

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
        'words/dictionary-lookup/',
        DictionaryLookupAPIView.as_view(),
        name='dictionary-lookup',
    ),
    path(
        'words/image-search/',
        WordImageSearchAPIView.as_view(),
        name='word-image-search',
    ),
    path(
        'recipes/scrape/',
        RecipeScrapeAPIView.as_view(),
        name='recipe-scrape',
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
