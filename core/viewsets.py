from django.db.models import Prefetch
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly

from .filters import InspirationFilter, ScreenshotFilter
from .models import Inspiration, Screenshot, Source, WordEntry
from .serializers import (
    InspirationSerializer,
    ScreenshotSerializer,
    SourceSerializer,
    WordEntrySerializer,
)


class SourceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = SourceSerializer

    def get_queryset(self):
        return Source.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class InspirationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]
    serializer_class = InspirationSerializer
    filterset_class = InspirationFilter

    def get_queryset(self):
        shot_qs = Screenshot.objects.order_by('uploaded_at', 'pk')
        base = Inspiration.objects.select_related('source', 'user').prefetch_related(
            Prefetch('screenshots', queryset=shot_qs)
        )
        if self.request.user.is_authenticated:
            return base.filter(user=self.request.user).order_by('-date')
        return base.filter(is_public=True, is_inspiring=True).order_by('-date')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ScreenshotViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ScreenshotSerializer
    filterset_class = ScreenshotFilter

    def get_queryset(self):
        return (
            Screenshot.objects.filter(inspiration__user=self.request.user)
            .select_related('inspiration')
            .order_by('-uploaded_at')
        )


class WordEntryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]
    serializer_class = WordEntrySerializer

    def get_queryset(self):
        qs = WordEntry.objects.select_related('source')
        if self.request.user.is_authenticated:
            return qs.filter(user=self.request.user)
        return qs.filter(is_public=True, is_inspiring=True)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
