from django.urls import path
from .views import (
    LoginView,
    DashboardStatsView,
    SlotsDataView,
    CreatePassView,
    VehicleEntryExitView,
    AllTransactionsView,
    ExpiryNotificationsView,
    AllPassesView,
)

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='api_login'),
    path('dashboard-stats/', DashboardStatsView.as_view(), name='dashboard_stats'),
    path('available-slots/', SlotsDataView.as_view(), name='slots_data'),
    path('create-pass/', CreatePassView.as_view(), name='create_pass'),
    path('entry-exit/', VehicleEntryExitView.as_view(), name='entry_exit'),
    path('transactions/', AllTransactionsView.as_view(), name='transactions'),
    path('passes/', AllPassesView.as_view(), name='passes'),
    path('passes/expiring/', ExpiryNotificationsView.as_view(), name='passes_expiring'),
]
