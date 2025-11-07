from django.urls import path
from . import views

app_name = 'core'

urlpatterns = [
    path('', views.home, name='home'),
    path('add-note/', views.add_note, name='add_note'),
    path('notes/', views.notes_list, name='notes_list'),
]

