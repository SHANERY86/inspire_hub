from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .viewsets import InspirationViewSet, ScreenshotViewSet

router = DefaultRouter()
router.register(r'inspirations', InspirationViewSet, basename='inspiration')
router.register(r'screenshots', ScreenshotViewSet, basename='screenshot')

urlpatterns = [
    path('', include(router.urls)),
]
