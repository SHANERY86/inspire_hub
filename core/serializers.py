"""
DRF API serializers.

ModelSerializer infers each API field from the Django model (Meta.model + Meta.fields).
JSON types follow that mapping (e.g. int id, string text, null for empty nullable fields).
Datetimes become ISO-8601 strings in JSON—JSON has no native date type.
Explicit per-field declarations are only needed when you override shape or validation.
"""
from rest_framework import serializers

from .models import Inspiration, Screenshot


class InspirationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Inspiration
        fields = [
            'id',
            'source_title',
            'essence',
            'date',
            'quote',
            'user_thoughts',
            'source_type',
            'reference',
        ]
        read_only_fields = ['id', 'date']


class ScreenshotSerializer(serializers.ModelSerializer):
    # Same implicit model→serializer→JSON mapping as InspirationSerializer.
    class Meta:
        model = Screenshot
        fields = [
            'id',
            'inspiration',
            'image',
            'extracted_text',
            'uploaded_at',
        ]
        read_only_fields = ['id', 'uploaded_at']
