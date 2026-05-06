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


class ScreenshotDraftItemSerializer(serializers.Serializer):
    """One screenshot row after OCR preview (commit payload)."""

    image_base64 = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )
    filename = serializers.CharField(required=False, allow_blank=True, default='')
    extracted_text = serializers.CharField(allow_blank=True, required=False, default='')
    keep = serializers.BooleanField(required=False, default=False)


class InspirationDraftCommitSerializer(serializers.Serializer):
    source_title = serializers.CharField()
    essence = serializers.CharField()
    user_thoughts = serializers.CharField(allow_blank=True, required=False, default='')
    source_type = serializers.CharField()
    reference = serializers.CharField(allow_blank=True, required=False, default='')
    screenshots = ScreenshotDraftItemSerializer(many=True, required=False, default=list)
