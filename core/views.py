from django.shortcuts import render, redirect
from .models import Inspiration, Screenshot


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
        for uploaded_file in request.FILES.getlist('screenshots'):
            Screenshot.objects.create(
                inspiration=inspiration,
                image=uploaded_file
            )
        
        # Redirect to inspirations list
        return redirect('core:inspirations_list')
    
    return render(request, 'core/add_inspiration.html')


def inspirations_list(request):
    """Display all inspirations"""
    inspirations = Inspiration.objects.all().order_by('-date')
    return render(request, 'core/inspirations_list.html', {'inspirations': inspirations})

