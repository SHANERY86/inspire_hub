import django_filters

from .models import Screenshot


class ScreenshotFilter(django_filters.FilterSet):
    inspiration = django_filters.NumberFilter(field_name='inspiration_id')

    class Meta:
        model = Screenshot
        fields = ['inspiration']
