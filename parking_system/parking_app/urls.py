from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('section/<str:view_name>/', views.section, name='section'),

    # Public API
    path('api/create-pass/', views.create_pass, name='create_pass'),
    path('api/entry-exit/', views.record_entry_exit, name='record_entry_exit'),
    path('api/stats/', views.get_dashboard_stats, name='get_dashboard_stats'),
    path('api/slots/', views.get_available_slots, name='get_available_slots'),

    # Auth API
    path('api/auth/login/', views.LoginView.as_view(), name='api_login'),
    path('api/auth/logout/', views.LogoutView.as_view(), name='api_logout'),

    # Dashboard APIs
    path('api/dashboard/stats/', views.DashboardStatsView.as_view(), name='dashboard_stats'),
    path('api/passes/', views.AllPassesView.as_view(), name='all_passes'),
    path('api/transactions/recent/', views.RecentTransactionsView.as_view(), name='recent_transactions'),
    path('api/transactions/', views.AllTransactionsView.as_view(), name='transactions'),

    path('api/expiry/notifications/', views.ExpiryNotificationsView.as_view(), name='expiry_notifications'),
]
