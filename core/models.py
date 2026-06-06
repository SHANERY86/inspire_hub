from django.conf import settings
from django.db import models


class Source(models.Model):
    """A work the user is reading or tracking (book, article, etc.)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sources',
    )
    title = models.CharField(max_length=512)
    author = models.CharField(max_length=512, blank=True, default='')
    isbn = models.CharField(max_length=20, blank=True, default='', db_index=True)
    source_type = models.CharField(max_length=50, default='book')
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'source'
        ordering = ['-updated_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'isbn'],
                condition=models.Q(isbn__gt=''),
                name='source_unique_user_isbn',
            )
        ]

    def __str__(self):
        return self.title


class Inspiration(models.Model):
    """Inspiration model for storing insights from various sources"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='inspirations',
    )
    source_title = models.CharField(max_length=255)
    essence = models.CharField(max_length=255, blank=True, default='')
    date = models.DateTimeField(auto_now_add=True)
    quote = models.TextField(blank=True, null=True)  # OCR extracted text
    user_thoughts = models.TextField(blank=True, null=True)
    source_type = models.CharField(max_length=50)
    reference = models.CharField(max_length=255, blank=True, null=True)
    source = models.ForeignKey(
        'Source',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='inspirations',
    )
    tags = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='Optional comma-separated tags for categorising this inspiration.',
    )
    is_inspiring = models.BooleanField(
        default=False,
        db_index=True,
        help_text='When true, this inspiration appears in the home spotlight rotation.',
    )
    is_public = models.BooleanField(
        default=False,
        db_index=True,
        help_text='When true, this inspiration may appear on the public home spotlight for guests.',
    )

    class Meta:
        db_table = 'inspiration'
    
    def __str__(self):
        return f"{self.essence} - {self.date.strftime('%Y-%m-%d')}"


class Screenshot(models.Model):
    """Screenshot model for storing images attached to inspirations"""
    inspiration = models.ForeignKey(
        Inspiration, 
        on_delete=models.CASCADE, 
        related_name='screenshots'
    )
    image = models.ImageField(upload_to='screenshots/')
    extracted_text = models.TextField(blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'screenshot'
    
    def __str__(self):
        return f"Screenshot for {self.inspiration.essence}"


class Recipe(models.Model):
    """A cooking recipe saved from a URL."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='recipes',
    )
    url = models.URLField(max_length=1000, blank=True, default='')
    title = models.CharField(max_length=512)
    ingredients = models.TextField(blank=True, default='')
    instructions = models.TextField(blank=True, default='')
    image_url = models.URLField(max_length=1000, blank=True, default='')
    notes = models.TextField(blank=True, default='')
    tags = models.CharField(max_length=255, blank=True, default='')
    is_inspiring = models.BooleanField(default=False, db_index=True)
    is_public = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'recipe'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class WordEntry(models.Model):
    """A word discovered while reading, with its chosen definition and usage context."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='word_entries',
    )
    word = models.CharField(max_length=255)
    definition = models.TextField()
    part_of_speech = models.CharField(max_length=50, blank=True, default='')
    context_sentence = models.TextField(
        blank=True,
        default='',
        help_text='The sentence from the book where the word was encountered.',
    )
    source = models.ForeignKey(
        'Source',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='word_entries',
    )
    image_url = models.URLField(
        blank=True,
        default='',
        help_text='Optional image URL attached to this word.',
    )
    tags = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='Optional comma-separated tags for categorising this word.',
    )
    is_inspiring = models.BooleanField(
        default=False,
        db_index=True,
        help_text='When true, this word appears in the home spotlight rotation.',
    )
    is_public = models.BooleanField(
        default=False,
        db_index=True,
        help_text='When true, guests can see this word on the public home spotlight.',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'word_entry'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.word} – {self.user}"

