from django.shortcuts import render, redirect
from .models import Note


def home(request):
    """Home page view"""
    return render(request, 'core/index.html')


def add_note(request):
    """Add note page view"""
    if request.method == 'POST':
        # Get form data
        title = request.POST.get('title')
        note_text = request.POST.get('note')
        media_type = request.POST.get('media_type')
        
        # Save to database
        Note.objects.create(
            title=title,
            note=note_text,
            media_type=media_type
        )
        
        # Redirect to notes list
        return redirect('core:notes_list')
    
    return render(request, 'core/add_note.html')


def notes_list(request):
    """Display all notes"""
    notes = Note.objects.all().order_by('-date')
    return render(request, 'core/notes_list.html', {'notes': notes})

