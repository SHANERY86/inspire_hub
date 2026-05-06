from django.contrib import messages
from django.db import DatabaseError
from django.shortcuts import redirect, render

from .inspiration_commit import commit_inspiration_with_screenshots
from .models import Inspiration
from .ocr_service import extract_text_from_upload, uploaded_file_to_base64


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
            extracted_text = extract_text_from_upload(uploaded_file)
            image_base64 = uploaded_file_to_base64(uploaded_file)

            screenshot_data.append(
                {
                    'image_base64': image_base64,
                    'filename': uploaded_file.name,
                    'extracted_text': extracted_text,
                }
            )
        
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

        screenshot_rows = []
        for idx, screenshot_info in enumerate(screenshot_data):
            if not isinstance(screenshot_info, dict):
                messages.warning(
                    request,
                    f'Screenshot {idx + 1} had invalid data and was skipped.',
                )
                continue
            screenshot_rows.append(
                {
                    'keep': bool(request.POST.get(f'keep_screenshot_{idx}')),
                    'extracted_text': request.POST.get(f'extracted_text_{idx}', ''),
                    'image_base64': screenshot_info.get('image_base64'),
                    'filename': screenshot_info.get('filename'),
                }
            )

        def _on_warning(idx, suffix):
            messages.warning(request, f'Screenshot {idx + 1} {suffix}')

        try:
            commit_inspiration_with_screenshots(
                form_data, screenshot_rows, on_warning=_on_warning
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

