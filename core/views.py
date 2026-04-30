from django.shortcuts import render, redirect
from django.conf import settings
from django.core.files.base import ContentFile
from django.contrib import messages
from .models import Inspiration, Screenshot
from PIL import Image
import requests
import io
import base64


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


def preview_inspiration(request):
    """Step 2: Preview and edit extracted text"""
    if request.method == 'POST':
        # Final save with edited text
        form_data = request.session.get('form_data', {})
        screenshot_data = request.session.get('screenshot_data', [])
        
        # Get user's manual thoughts (NOT including OCR text)
        user_thoughts = form_data.get('user_thoughts', '').strip()
        
        # Collect all edited OCR text for inspiration_quote
        all_extracted_texts = []
        for idx, screenshot_info in enumerate(screenshot_data):
            edited_text = request.POST.get(f'extracted_text_{idx}', screenshot_info['extracted_text'])
            if edited_text.strip():
                all_extracted_texts.append(edited_text)
        
        # Combine all OCR text into quote
        quote = "\n\n".join(all_extracted_texts) if all_extracted_texts else None
        
        # Create inspiration with separate quote and thoughts
        inspiration = Inspiration.objects.create(
            source_title=form_data['source_title'],
            essence=form_data['essence'],
            quote=quote,
            user_thoughts=user_thoughts if user_thoughts else None,
            source_type=form_data['source_type'],
            reference=form_data['reference'] if form_data['reference'] else None
        )
        
        # Save screenshot IMAGES only if checkbox is checked
        for idx, screenshot_info in enumerate(screenshot_data):
            keep_screenshot = request.POST.get(f'keep_screenshot_{idx}')
            
            if keep_screenshot:  # Only save screenshot image if checkbox was checked
                edited_text = request.POST.get(f'extracted_text_{idx}', screenshot_info['extracted_text'])
                
                # Decode base64 image
                image_data = base64.b64decode(screenshot_info['image_base64'])
                
                # Save screenshot
                Screenshot.objects.create(
                    inspiration=inspiration,
                    image=ContentFile(image_data, name=screenshot_info['filename']),
                    extracted_text=edited_text
                )
        
        # Clear session
        del request.session['form_data']
        del request.session['screenshot_data']
        
        # Redirect to inspirations list
        return redirect('core:inspirations_list')
    
    # Get data from session
    form_data = request.session.get('form_data', {})
    screenshot_data = request.session.get('screenshot_data', [])
    
    if not form_data:
        # No data in session, redirect back to form
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

