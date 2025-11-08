from django.urls import path
from . import views

app_name = 'core'

urlpatterns = [
    path('', views.home, name='home'),
    path('add-inspiration/', views.add_inspiration, name='add_inspiration'),
    path('preview-inspiration/', views.preview_inspiration, name='preview_inspiration'),
    path('inspirations/', views.inspirations_list, name='inspirations_list'),
]

