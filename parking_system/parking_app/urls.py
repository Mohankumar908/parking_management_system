from django.urls import path
from . import views

app_name = 'parking_app' 

urlpatterns = [
    path('', views.dashboard_view, name='dashboard'), 
    path('create_pass/', views.create_parking_pass, name='create_parking_pass'),
    path('entry/', views.vehicle_entry, name='vehicle_entry'),
    path('exit/', views.vehicle_exit, name='vehicle_exit'),
]