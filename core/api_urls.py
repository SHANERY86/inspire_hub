from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .draft_views import InspirationDraftCommitAPIView, InspirationDraftPreviewAPIView
from .viewsets import InspirationViewSet, ScreenshotViewSet

router = DefaultRouter()
router.register(r'inspirations', InspirationViewSet, basename='inspiration')
router.register(r'screenshots', ScreenshotViewSet, basename='screenshot')

urlpatterns = [
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
