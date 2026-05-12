from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .filters import ScreenshotFilter
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

    def get_queryset(self):
        return Inspiration.objects.filter(user=self.request.user).order_by('-date')

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
