import django_filters

from .models import Inspiration, Screenshot


class InspirationFilter(django_filters.FilterSet):
    source = django_filters.NumberFilter(field_name='source_id')

    class Meta:
        model = Inspiration
        fields = ['source']


class ScreenshotFilter(django_filters.FilterSet):
    inspiration = django_filters.NumberFilter(field_name='inspiration_id')

    class Meta:
        model = Screenshot
        fields = ['inspiration']
