"""Shared OCR logic for template views and API draft endpoints."""
import base64
import io

import requests
from django.conf import settings
from PIL import Image


class OcrError(Exception):
    """OCR could not run or the OCR API reported a failure."""


def ocr_image_text(uploaded_file) -> str:
    """
    Run OCR.space on an uploaded image file and return the stripped text ('' if none found).

    `uploaded_file` is a Django UploadedFile-like object (read/seek). Raises OcrError on failure.
    """
    if not settings.OCR_SPACE_API_KEY:
        raise OcrError(
            'OCR API key not configured. Please add OCR_SPACE_API_KEY to your .env file.'
        )

    try:
        image = Image.open(uploaded_file)

        max_width = 2000
        if image.width > max_width:
            ratio = max_width / image.width
            new_size = (max_width, int(image.height * ratio))
            image = image.resize(new_size, Image.Resampling.LANCZOS)

        if image.mode in ('RGBA', 'P'):
            image = image.convert('RGB')

        compressed = io.BytesIO()
        image.save(compressed, format='JPEG', quality=92, optimize=True)
        compressed.seek(0)

        response = requests.post(
            'https://api.ocr.space/parse/image',
            files={'file': ('image.jpg', compressed, 'image/jpeg')},
            data={
                'apikey': settings.OCR_SPACE_API_KEY,
                'language': 'eng',
                'isOverlayRequired': False,
                'detectOrientation': True,
                'scale': True,
                'OCREngine': 2,
            },
            timeout=60,
        )
    except Exception as exc:
        raise OcrError(f'Error extracting text: {str(exc)}') from exc

    try:
        result = response.json()
    except ValueError:
        raise OcrError(f'OCR API Error: {response.text[:200]}')

    if isinstance(result, str):
        raise OcrError(f'OCR API returned: {result[:200]}')

    if isinstance(result, dict):
        if result.get('IsErroredOnProcessing'):
            raise OcrError(f"OCR Error: {result.get('ErrorMessage', 'Unknown error')}")
        try:
            parsed_text = result.get('ParsedResults', [{}])[0].get('ParsedText', '')
        except Exception as exc:
            raise OcrError(f'Error extracting text: {str(exc)}') from exc
        return (parsed_text or '').strip()

    raise OcrError(f'Unexpected OCR response format: {type(result)}')


def extract_text_from_upload(uploaded_file) -> str:
    """
    Run OCR.space on an uploaded image file.

    Never raises: errors and empty results come back as human-readable text.
    """
    try:
        text = ocr_image_text(uploaded_file)
    except OcrError as exc:
        return str(exc)
    return text if text else 'No text detected in image'


def uploaded_file_to_base64(uploaded_file) -> str:
    uploaded_file.seek(0)
    return base64.b64encode(uploaded_file.read()).decode('utf-8')
