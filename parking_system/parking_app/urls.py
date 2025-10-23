from django.urls import path
from . import views

urlpatterns = [
    path('', views.dashboard_view, name='dashboard'),
    path('create-pass/', views.create_parking_pass, name='create_pass'),
    path('vehicle-entry/', views.vehicle_entry, name='vehicle_entry'),
    path('vehicle-exit/', views.vehicle_exit, name='vehicle_exit'),
]
