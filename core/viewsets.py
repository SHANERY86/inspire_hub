from django.db.models import Prefetch
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .filters import InspirationFilter, ScreenshotFilter
from .models import Inspiration, Screenshot, Source
from .serializers import InspirationSerializer, ScreenshotSerializer, SourceSerializer


class SourceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = SourceSerializer

    def get_queryset(self):
        return Source.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class InspirationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = InspirationSerializer
    filterset_class = InspirationFilter

    def get_queryset(self):
        shot_qs = Screenshot.objects.order_by('uploaded_at', 'pk')
        return (
            Inspiration.objects.filter(user=self.request.user)
            .select_related('source')
            .prefetch_related(Prefetch('screenshots', queryset=shot_qs))
            .order_by('-date')
        )

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
