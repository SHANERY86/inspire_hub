"""
DRF API serializers.

ModelSerializer infers each API field from the Django model (Meta.model + Meta.fields).
JSON types follow that mapping (e.g. int id, string text, null for empty nullable fields).
Datetimes become ISO-8601 strings in JSON—JSON has no native date type.
Explicit per-field declarations are only needed when you override shape or validation.
"""
from rest_framework import serializers

from .models import Inspiration, Screenshot, Source
from .source_isbn import normalize_isbn


class SourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Source
        fields = [
            'id',
            'title',
            'author',
            'isbn',
            'source_type',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_isbn(self, value):
        n = normalize_isbn(value or '')
        if not n:
            return ''
        if len(n) not in (10, 13):
            raise serializers.ValidationError(
                'ISBN must be 10 or 13 digits (ISBN-10 may end with X).'
            )
        return n

    def validate(self, attrs):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return attrs
        if 'isbn' in attrs:
            isbn = attrs.get('isbn') or ''
        elif self.instance:
            isbn = self.instance.isbn or ''
        else:
            isbn = ''
        if not isbn:
            return attrs
        qs = Source.objects.filter(user=request.user, isbn=isbn)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                {'isbn': 'You already have a source with this ISBN.'}
            )
        return attrs


class InspirationSerializer(serializers.ModelSerializer):
    source = serializers.PrimaryKeyRelatedField(
        allow_null=True,
        required=False,
        queryset=Source.objects.none(),
    )
    source_display_title = serializers.SerializerMethodField()
    source_display_author = serializers.SerializerMethodField()

    class Meta:
        model = Inspiration
        fields = [
            'id',
            'user',
            'source',
            'source_title',
            'source_display_title',
            'source_display_author',
            'essence',
            'date',
            'quote',
            'user_thoughts',
            'source_type',
            'reference',
        ]
        read_only_fields = [
            'id',
            'user',
            'date',
            'source_display_title',
            'source_display_author',
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        q = Source.objects.none()
        if request and request.user.is_authenticated:
            q = Source.objects.filter(user=request.user)
        self.fields['source'].queryset = q

    def get_source_display_title(self, obj):
        src = getattr(obj, 'source', None)
        if src is None:
            return ''
        return (src.title or '').strip()

    def get_source_display_author(self, obj):
        src = getattr(obj, 'source', None)
        if src is None:
            return ''
        return (src.author or '').strip()


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

    def validate_inspiration(self, inspiration):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if inspiration.user_id != request.user.id:
                raise serializers.ValidationError(
                    'Invalid inspiration id or not permitted.'
                )
        return inspiration


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
    source = serializers.PrimaryKeyRelatedField(
        queryset=Source.objects.none(),
        allow_null=True,
        required=False,
    )
    screenshots = ScreenshotDraftItemSerializer(many=True, required=False, default=list)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        q = Source.objects.none()
        if request and request.user.is_authenticated:
            q = Source.objects.filter(user=request.user)
        self.fields['source'].queryset = q
