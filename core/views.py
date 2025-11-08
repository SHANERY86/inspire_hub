from django.shortcuts import render, redirect
from .models import Inspiration


def home(request):
    """Home page view"""
    return render(request, 'core/index.html')


def add_inspiration(request):
    """Add inspiration page view"""
    if request.method == 'POST':
        # Get form data
        title = request.POST.get('title')
        content = request.POST.get('content')
        source_type = request.POST.get('source_type')
        
        # Save to database
        Inspiration.objects.create(
            title=title,
            content=content,
            source_type=source_type
        )
        
        # Redirect to inspirations list
        return redirect('core:inspirations_list')
    
    return render(request, 'core/add_inspiration.html')


def inspirations_list(request):
    """Display all inspirations"""
    inspirations = Inspiration.objects.all().order_by('-date')
    return render(request, 'core/inspirations_list.html', {'inspirations': inspirations})

