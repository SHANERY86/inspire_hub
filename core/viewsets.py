from rest_framework import viewsets

from .filters import ScreenshotFilter
from .models import Inspiration, Screenshot
from .serializers import InspirationSerializer, ScreenshotSerializer


class InspirationViewSet(viewsets.ModelViewSet):
    queryset = Inspiration.objects.all().order_by('-date')
    serializer_class = InspirationSerializer


class ScreenshotViewSet(viewsets.ModelViewSet):
    queryset = Screenshot.objects.select_related('inspiration').all().order_by('-uploaded_at')
    serializer_class = ScreenshotSerializer
    filterset_class = ScreenshotFilter
