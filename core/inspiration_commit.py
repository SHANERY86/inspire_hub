"""Shared transactional save for inspiration + optional screenshots (HTML + API)."""
import base64
import binascii

from django.core.files.base import ContentFile
from django.db import transaction

from .models import Inspiration, Screenshot


def commit_inspiration_with_screenshots(
    form_data,
    screenshot_rows,
    *,
    user,
    source=None,
    on_warning=None,
    comic_panel=False,
):
    """
    Create an Inspiration and optional Screenshot rows.

    form_data: dict with source_title, essence, user_thoughts, source_type, reference.
    screenshot_rows: list of dicts with keys:
      extracted_text (str), image_base64 (optional str), filename (optional str).

    Quote is built from every row whose extracted_text is non-empty (matches template flow).
    When comic_panel is False, image files are not stored — only the joined extracted text
    becomes inspiration.quote. When comic_panel is True, every row with decodable image
    data is stored as a Screenshot; extracted_text may be empty (image stored as-is).

    user: owner of the new Inspiration (required).

    source: optional linked Source instance (same user; validated by caller).

    on_warning: optional callable(idx: int, message: str) for skipped screenshots (1-based idx in messages).
    """
    user_thoughts = (form_data.get('user_thoughts') or '').strip()

    all_extracted_texts = []
    for row in screenshot_rows:
        edited = row.get('extracted_text') or ''
        if edited.strip():
            all_extracted_texts.append(edited.strip())

    quote = '\n\n'.join(all_extracted_texts) if all_extracted_texts else None

    reference = form_data.get('reference')
    reference = (
        reference.strip()
        if isinstance(reference, str) and reference.strip()
        else None
    )

    with transaction.atomic():
        inspiration = Inspiration.objects.create(
            user=user,
            source_title=form_data['source_title'].strip(),
            essence=form_data['essence'].strip(),
            quote=quote,
            user_thoughts=user_thoughts if user_thoughts else None,
            source_type=form_data['source_type'].strip(),
            reference=reference,
            source=source,
            is_inspiring=bool(form_data.get('is_inspiring')),
            is_public=bool(form_data.get('is_public')),
        )

        if comic_panel:
            for idx, row in enumerate(screenshot_rows):
                edited_text = row.get('extracted_text') or ''
                b64 = row.get('image_base64')
                filename = row.get('filename') or f'screenshot_{idx}.jpg'

                if not b64:
                    if on_warning:
                        on_warning(
                            idx,
                            'had no image data and was not saved.',
                        )
                    continue

                try:
                    image_data = base64.b64decode(b64, validate=True)
                except (binascii.Error, ValueError):
                    if on_warning:
                        on_warning(
                            idx,
                            'could not be decoded and was not saved.',
                        )
                    continue

                if not image_data:
                    if on_warning:
                        on_warning(
                            idx,
                            'was empty and was not saved.',
                        )
                    continue

                Screenshot.objects.create(
                    inspiration=inspiration,
                    image=ContentFile(image_data, name=filename),
                    extracted_text=edited_text.strip() if edited_text.strip() else '',
                )

    return inspiration
