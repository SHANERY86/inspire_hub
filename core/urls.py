from django.urls import path

from . import views

app_name = 'core'

urlpatterns = [
    path('request-account/', views.spa_index, name='request-account'),
    path('', views.spa_index, name='home'),
]
