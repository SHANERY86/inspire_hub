import base64
import binascii
import io

import requests
from django.conf import settings
from django.contrib import messages
from django.core.files.base import ContentFile
from django.db import DatabaseError, transaction
from django.shortcuts import redirect, render

from .models import Inspiration, Screenshot
from PIL import Image


def home(request):
    """Home page view"""
    return render(request, 'core/index.html')


def add_inspiration(request):
    """Step 1: Add inspiration form"""
    if request.method == 'POST':
        # Get form data
        form_data = {
            'source_title': request.POST.get('source_title'),
            'essence': request.POST.get('essence'),
            'user_thoughts': request.POST.get('user_thoughts', ''),
            'source_type': request.POST.get('source_type'),
            'reference': request.POST.get('reference', ''),
        }
        
        # Handle screenshot uploads and extract text
        screenshots = request.FILES.getlist('screenshots')
        screenshot_data = []
        
        # Validation: If no screenshots, user_thoughts is required
        if not screenshots and not form_data['user_thoughts'].strip():
            messages.error(request, 'Please either upload a screenshot or enter your thoughts.')
            return render(request, 'core/add_inspiration.html')
        
        for uploaded_file in screenshots:
            # Extract text using OCR.space API
            try:
                # Check if API key is configured
                if not settings.OCR_SPACE_API_KEY:
                    extracted_text = "OCR API key not configured. Please add OCR_SPACE_API_KEY to your .env file."
                else:
                    # Open and compress image
                    image = Image.open(uploaded_file)
                    
                    # Resize if too large
                    max_width = 2000
                    if image.width > max_width:
                        ratio = max_width / image.width
                        new_size = (max_width, int(image.height * ratio))
                        image = image.resize(new_size, Image.Resampling.LANCZOS)
                    
                    # Convert to RGB if needed (for JPEG)
                    if image.mode in ('RGBA', 'P'):
                        image = image.convert('RGB')
                    
                    # Save compressed image to bytes
                    compressed = io.BytesIO()
                    image.save(compressed, format='JPEG', quality=92, optimize=True)
                    compressed.seek(0)
                    
                    # Call OCR.space API
                    response = requests.post(
                        'https://api.ocr.space/parse/image',
                        files={'file': ('image.jpg', compressed, 'image/jpeg')},
                        data={
                            'apikey': settings.OCR_SPACE_API_KEY,
                            'language': 'eng',
                            'isOverlayRequired': False,
                            'detectOrientation': True,
                            'scale': True,
                            'OCREngine': 2
                        }
                    )
                    
                    # Parse response - handle both JSON and string responses
                    try:
                        result = response.json()
                    except ValueError:
                        # Response is not JSON (likely an error message)
                        extracted_text = f"OCR API Error: {response.text[:200]}"
                    else:
                        # Check if result is a dict (JSON) or string
                        if isinstance(result, str):
                            extracted_text = f"OCR API returned: {result[:200]}"
                        elif isinstance(result, dict):
                            if result.get('IsErroredOnProcessing'):
                                extracted_text = f"OCR Error: {result.get('ErrorMessage', 'Unknown error')}"
                            else:
                                parsed_text = result.get('ParsedResults', [{}])[0].get('ParsedText', '')
                                extracted_text = parsed_text.strip() if parsed_text.strip() else "No text detected in image"
                        else:
                            extracted_text = f"Unexpected OCR response format: {type(result)}"
                    
            except Exception as e:
                extracted_text = f"Error extracting text: {str(e)}"
            
            # Convert image to base64 for preview (reset file pointer first)
            uploaded_file.seek(0)
            image_data = uploaded_file.read()
            image_base64 = base64.b64encode(image_data).decode('utf-8')
            
            screenshot_data.append({
                'image_base64': image_base64,
                'filename': uploaded_file.name,
                'extracted_text': extracted_text
            })
        
        # Store in session for preview page
        request.session['form_data'] = form_data
        request.session['screenshot_data'] = screenshot_data
        
        # Redirect to preview page
        return redirect('core:preview_inspiration')
    
    return render(request, 'core/add_inspiration.html')


def _preview_session_valid(form_data, screenshot_data):
    """Return True if session payload is usable for preview/save."""
    if not isinstance(form_data, dict) or not form_data:
        return False
    required = ('source_title', 'essence', 'source_type')
    if not all(str(form_data.get(k) or '').strip() for k in required):
        return False
    if screenshot_data is not None and not isinstance(screenshot_data, list):
        return False
    return True


def preview_inspiration(request):
    """Step 2: Preview and edit extracted text"""
    if request.method == 'POST':
        form_data = request.session.get('form_data') or {}
        screenshot_data = request.session.get('screenshot_data') or []

        if not _preview_session_valid(form_data, screenshot_data):
            messages.error(
                request,
                'Your session expired or the form data is incomplete. Please start again.',
            )
            request.session.pop('form_data', None)
            request.session.pop('screenshot_data', None)
            return redirect('core:add_inspiration')

        user_thoughts = (form_data.get('user_thoughts') or '').strip()

        all_extracted_texts = []
        for idx, screenshot_info in enumerate(screenshot_data):
            if not isinstance(screenshot_info, dict):
                continue
            # Prefer whatever the user submitted. If the textarea is empty,
            # we do not want to silently fall back to the original OCR text.
            edited_text = request.POST.get(f'extracted_text_{idx}', '')
            if edited_text and edited_text.strip():
                all_extracted_texts.append(edited_text)

        quote = "\n\n".join(all_extracted_texts) if all_extracted_texts else None
        reference = form_data.get('reference')
        reference = reference.strip() if isinstance(reference, str) and reference.strip() else None

        try:
            with transaction.atomic():
                inspiration = Inspiration.objects.create(
                    source_title=form_data['source_title'].strip(),
                    essence=form_data['essence'].strip(),
                    quote=quote,
                    user_thoughts=user_thoughts if user_thoughts else None,
                    source_type=form_data['source_type'].strip(),
                    reference=reference,
                )

                for idx, screenshot_info in enumerate(screenshot_data):
                    if not isinstance(screenshot_info, dict):
                        messages.warning(
                            request,
                            f'Screenshot {idx + 1} had invalid data and was skipped.',
                        )
                        continue

                    if not request.POST.get(f'keep_screenshot_{idx}'):
                        continue

                    edited_text = request.POST.get(f'extracted_text_{idx}', '')
                    b64 = screenshot_info.get('image_base64')
                    filename = screenshot_info.get('filename') or f'screenshot_{idx}.jpg'

                    if not b64:
                        messages.warning(
                            request,
                            f'Screenshot {idx + 1} had no image data and was not saved.',
                        )
                        continue

                    if not edited_text or not edited_text.strip():
                        messages.warning(
                            request,
                            f'Screenshot {idx + 1} had empty extracted text and was not saved.',
                        )
                        continue

                    try:
                        image_data = base64.b64decode(b64, validate=True)
                    except (binascii.Error, ValueError):
                        messages.warning(
                            request,
                            f'Screenshot {idx + 1} could not be decoded and was not saved.',
                        )
                        continue

                    if not image_data:
                        messages.warning(
                            request,
                            f'Screenshot {idx + 1} was empty and was not saved.',
                        )
                        continue

                    Screenshot.objects.create(
                        inspiration=inspiration,
                        image=ContentFile(image_data, name=filename),
                        extracted_text=edited_text,
                    )
        except DatabaseError:
            messages.error(
                request,
                'Could not save your inspiration. Please try again.',
            )
            return redirect('core:preview_inspiration')

        request.session.pop('form_data', None)
        request.session.pop('screenshot_data', None)
        return redirect('core:inspirations_list')
    
    form_data = request.session.get('form_data') or {}
    screenshot_data = request.session.get('screenshot_data') or []

    if not _preview_session_valid(form_data, screenshot_data):
        return redirect('core:add_inspiration')
    
    context = {
        'form_data': form_data,
        'screenshot_data': screenshot_data
    }
    
    return render(request, 'core/preview_inspiration.html', context)


def inspirations_list(request):
    """Display all inspirations"""
    inspirations = Inspiration.objects.all().order_by('-date')
    return render(request, 'core/inspirations_list.html', {'inspirations': inspirations})

