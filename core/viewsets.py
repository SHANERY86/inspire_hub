from rest_framework import viewsets
from rest_framework.exceptions import ValidationError

from .models import Inspiration, Screenshot
from .serializers import InspirationSerializer, ScreenshotSerializer


class InspirationViewSet(viewsets.ModelViewSet):
    queryset = Inspiration.objects.all().order_by('-date')
    serializer_class = InspirationSerializer


class ScreenshotViewSet(viewsets.ModelViewSet):
    queryset = Screenshot.objects.select_related('inspiration').all().order_by('-uploaded_at')
    serializer_class = ScreenshotSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        inspiration = self.request.query_params.get('inspiration')
        if inspiration is not None:
            try:
                inspiration_id = int(inspiration)
            except (TypeError, ValueError):
                raise ValidationError({'inspiration': 'Must be an integer id.'})
            qs = qs.filter(inspiration_id=inspiration_id)
        return qs
