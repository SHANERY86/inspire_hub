"""
DRF API serializers.

ModelSerializer infers each API field from the Django model (Meta.model + Meta.fields).
JSON types follow that mapping (e.g. int id, string text, null for empty nullable fields).
Datetimes become ISO-8601 strings in JSON—JSON has no native date type.
Explicit per-field declarations are only needed when you override shape or validation.
"""
from rest_framework import serializers

from .models import Inspiration, Recipe, Screenshot, Source, WordEntry
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


class InspirationScreenshotSummarySerializer(serializers.ModelSerializer):
    """Nested on inspiration list/detail: enough to render thumbnails."""

    class Meta:
        model = Screenshot
        fields = ['id', 'image']
        read_only_fields = ['id', 'image']


class InspirationSerializer(serializers.ModelSerializer):
    source = serializers.PrimaryKeyRelatedField(
        allow_null=True,
        required=False,
        queryset=Source.objects.none(),
    )
    source_display_title = serializers.SerializerMethodField()
    source_display_author = serializers.SerializerMethodField()
    added_by_username = serializers.SerializerMethodField()
    screenshots = InspirationScreenshotSummarySerializer(
        many=True,
        read_only=True,
    )

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
            'tags',
            'is_inspiring',
            'is_public',
            'added_by_username',
            'screenshots',
        ]
        read_only_fields = [
            'id',
            'user',
            'date',
            'source_display_title',
            'source_display_author',
            'added_by_username',
            'screenshots',
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        q = Source.objects.none()
        if request and request.user.is_authenticated:
            q = Source.objects.filter(user=request.user)
        self.fields['source'].queryset = q

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        if request and not request.user.is_authenticated:
            data.pop('user', None)
        return data

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

    def get_added_by_username(self, obj):
        request = self.context.get('request')
        if not request or request.user.is_authenticated:
            return ''
        owner = getattr(obj, 'user', None)
        if owner is None:
            return ''
        return (getattr(owner, 'username', None) or '').strip()

    def validate(self, attrs):
        instance = self.instance
        inspiring = attrs.get(
            'is_inspiring',
            instance.is_inspiring if instance is not None else False,
        )

        if 'is_public' in attrs and attrs['is_public'] and not inspiring:
            raise serializers.ValidationError({
                'is_public': 'Mark this inspiration as inspiring before making it public.',
            })

        if not inspiring:
            attrs['is_public'] = False

        return attrs


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
    essence = serializers.CharField(allow_blank=True, required=False, default='')
    user_thoughts = serializers.CharField(allow_blank=True, required=False, default='')
    source_type = serializers.CharField()
    reference = serializers.CharField(allow_blank=True, required=False, default='')
    tags = serializers.CharField(allow_blank=True, required=False, default='')
    is_comic_panel = serializers.BooleanField(required=False, default=False)
    is_inspiring = serializers.BooleanField(required=False, default=False)
    is_public = serializers.BooleanField(required=False, default=False)
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

    def validate(self, attrs):
        inspiring = attrs.get('is_inspiring', False)
        public = attrs.get('is_public', False)

        if public and not inspiring:
            raise serializers.ValidationError({
                'is_public': 'Mark this inspiration as inspiring before making it public.',
            })

        if not inspiring:
            attrs['is_public'] = False

        return attrs


class RecipeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recipe
        fields = [
            'id',
            'url',
            'title',
            'ingredients',
            'image_url',
            'notes',
            'tags',
            'is_inspiring',
            'is_public',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        instance = self.instance
        inspiring = attrs.get(
            'is_inspiring',
            instance.is_inspiring if instance is not None else False,
        )
        if 'is_public' in attrs and attrs['is_public'] and not inspiring:
            raise serializers.ValidationError({
                'is_public': 'Mark this recipe as inspiring before making it public.',
            })
        if not inspiring:
            attrs['is_public'] = False
        return attrs


class WordEntrySerializer(serializers.ModelSerializer):
    source = serializers.PrimaryKeyRelatedField(
        allow_null=True,
        required=False,
        queryset=Source.objects.none(),
    )
    source_title = serializers.SerializerMethodField()

    class Meta:
        model = WordEntry
        fields = [
            'id',
            'word',
            'definition',
            'part_of_speech',
            'context_sentence',
            'source',
            'source_title',
            'image_url',
            'tags',
            'is_inspiring',
            'is_public',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'source_title']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        q = Source.objects.none()
        if request and request.user.is_authenticated:
            q = Source.objects.filter(user=request.user)
        self.fields['source'].queryset = q

    def get_source_title(self, obj):
        src = getattr(obj, 'source', None)
        if src is None:
            return ''
        return (src.title or '').strip()
