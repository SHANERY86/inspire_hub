from django.shortcuts import render, redirect
from django.conf import settings
from .models import Inspiration, Screenshot
from PIL import Image
import requests
import io


def home(request):
    """Home page view"""
    return render(request, 'core/index.html')


def add_inspiration(request):
    """Add inspiration page view"""
    if request.method == 'POST':
        # Get form data
        source_title = request.POST.get('source_title')
        essence = request.POST.get('essence')
        content = request.POST.get('content')
        source_type = request.POST.get('source_type')
        
        # Save inspiration to database
        inspiration = Inspiration.objects.create(
            source_title=source_title,
            essence=essence,
            content=content,
            source_type=source_type
        )
        
        # Handle screenshot uploads
        screenshots = request.FILES.getlist('screenshots')
        
        for uploaded_file in screenshots:
            # Extract text using OCR.space API
            try:
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
                
                # Reset original file pointer for later saving
                uploaded_file.seek(0)
                
                # Call OCR.space API with compressed image
                response = requests.post(
                    'https://api.ocr.space/parse/image',
                    files={'file': ('image.jpg', compressed, 'image/jpeg')},
                    data={
                        'apikey': settings.OCR_SPACE_API_KEY,
                        'language': 'eng',
                        'isOverlayRequired': False,
                        'detectOrientation': True,
                        'scale': True,
                        'OCREngine': 2  # Engine 2 is better for most cases
                    }
                )
                
                # Parse response
                result = response.json()
                if result.get('IsErroredOnProcessing'):
                    extracted_text = f"OCR Error: {result.get('ErrorMessage', 'Unknown error')}"
                else:
                    parsed_text = result.get('ParsedResults', [{}])[0].get('ParsedText', '')
                    extracted_text = parsed_text.strip() if parsed_text.strip() else "No text detected in image"
                    
            except Exception as e:
                extracted_text = f"Error extracting text: {str(e)}"
            
            # Save screenshot with extracted text
            Screenshot.objects.create(
                inspiration=inspiration,
                image=uploaded_file,
                extracted_text=extracted_text
            )
        
        # Redirect to inspirations list
        return redirect('core:inspirations_list')
    
    return render(request, 'core/add_inspiration.html')


def inspirations_list(request):
    """Display all inspirations"""
    inspirations = Inspiration.objects.all().order_by('-date')
    return render(request, 'core/inspirations_list.html', {'inspirations': inspirations})

