from django.shortcuts import render
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Sum, Q
from datetime import timedelta
import json

from rest_framework import generics, views, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken

from .models import Owner, Vehicle, ParkingPass, ParkingTransaction
from .serializers import (
    OwnerSerializer,
    VehicleSerializer,
    ParkingPassSerializer,
    ParkingTransactionSerializer,
    CreatePassRequestSerializer,
    VehicleEntryRequestSerializer,
    VehicleExitRequestSerializer
)

# ======================================================
# ========== PAGE RENDERING (Frontend) =================
# ======================================================
def login_view(request):
    return render(request, "parking_app/login.html")

def dashboard(request):
    return render(request, "parking_app/dashboard.html")

def section(request, view_name):
    """Serve section fragments dynamically"""
    try:
        return render(request, f"parking_app/sections/{view_name}.html")
    except Exception:
        return JsonResponse({"error": "Section not found"}, status=404)


# ======================================================
# ========== BASIC JSON API ENDPOINTS =================
# ======================================================
@csrf_exempt
def create_pass(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)

    data = json.loads(request.body)
    owner_name = data.get("owner_name")
    vehicle_no = data.get("vehicle_no")
    vehicle_type = data.get("vehicle_type")
    pass_type = data.get("pass_type")

    if not owner_name or not vehicle_no:
        return JsonResponse({"error": "Missing required fields"}, status=400)

    owner, _ = Owner.objects.get_or_create(name=owner_name)
    vehicle, _ = Vehicle.objects.get_or_create(
        vehicle_number=vehicle_no.upper(),
        defaults={"vehicle_type": vehicle_type, "owner": owner}
    )

    # Prevent duplicate active pass
    if ParkingPass.objects.filter(vehicle=vehicle, expiry_date__gt=timezone.now()).exists():
        return JsonResponse({"error": "Vehicle already has an active pass"}, status=400)

    ParkingPass.objects.create(vehicle=vehicle, pass_type=pass_type)
    return JsonResponse({"success": True, "message": f"Pass created for {vehicle_no}"})


@csrf_exempt
def record_entry_exit(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)

    data = json.loads(request.body)
    vehicle_no = data.get("vehicle_no")
    action = data.get("action")
    vehicle_type = data.get("vehicle_type", "car")

    if not vehicle_no or not action:
        return JsonResponse({"error": "Missing fields"}, status=400)

    vehicle, _ = Vehicle.objects.get_or_create(
        vehicle_number=vehicle_no.upper(),
        defaults={"vehicle_type": vehicle_type}
    )

    # ENTRY
    if action == "entry":
        if ParkingTransaction.objects.filter(vehicle=vehicle, exit_time__isnull=True).exists():
            return JsonResponse({"error": "Vehicle already parked"}, status=400)

        ParkingTransaction.objects.create(vehicle=vehicle, status="Parked")
        return JsonResponse({"success": True, "message": f"{vehicle_no} entered successfully"})

    # EXIT
    elif action == "exit":
        transaction = ParkingTransaction.objects.filter(vehicle=vehicle, exit_time__isnull=True).last()
        if not transaction:
            return JsonResponse({"error": "Vehicle not currently parked"}, status=400)

        transaction.exit_time = timezone.now()
        transaction.status = "Exited"

        # If no valid pass, charge fee
        has_pass = ParkingPass.objects.filter(vehicle=vehicle, expiry_date__gt=timezone.now()).exists()
        if not has_pass:
            transaction.fees_paid = transaction.calculate_fees()
        else:
            transaction.fees_paid = 0.0

        transaction.save()

        msg = f"{vehicle_no} exited successfully"
        if transaction.fees_paid:
            msg += f" | Fee: ₹{transaction.fees_paid}"

        # ✅ Trigger auto-dashboard refresh data
        return JsonResponse({
            "success": True,
            "message": msg,
            "updated": {
                "slots_filled": ParkingTransaction.objects.filter(exit_time__isnull=True).count(),
                "earnings_today": float(ParkingTransaction.objects.aggregate(Sum('fees_paid'))['fees_paid__sum'] or 0.0)
            }
        })

    return JsonResponse({"error": "Invalid action"}, status=400)




def get_dashboard_stats(request):
    now = timezone.now()
    active_passes = ParkingPass.objects.filter(expiry_date__gt=now).count()
    vehicles_today = ParkingTransaction.objects.filter(entry_time__date=now.date()).count()
    earnings_today = ParkingTransaction.objects.aggregate(total=Sum("fees_paid"))["total"] or 0.0
    slots_filled = ParkingTransaction.objects.filter(exit_time__isnull=True).count()

    return JsonResponse({
        "active_passes": active_passes,
        "vehicles_today": vehicles_today,
        "earnings_today": earnings_today,
        "slots_filled": slots_filled
    })


def get_available_slots(request):
    TOTAL_CAR_SLOTS = 50
    TOTAL_BIKE_SLOTS = 50

    cars_occupied = ParkingTransaction.objects.filter(vehicle__vehicle_type="car", exit_time__isnull=True).count()
    bikes_occupied = ParkingTransaction.objects.filter(vehicle__vehicle_type="bike", exit_time__isnull=True).count()

    return JsonResponse({
        "cars": {"total": TOTAL_CAR_SLOTS, "occupied": cars_occupied, "available": TOTAL_CAR_SLOTS - cars_occupied},
        "bikes": {"total": TOTAL_BIKE_SLOTS, "occupied": bikes_occupied, "available": TOTAL_BIKE_SLOTS - bikes_occupied},
    })


# ======================================================
# ========== AUTHENTICATION ============================
# ======================================================
class LoginView(ObtainAuthToken):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "username": user.username, "message": "Login successful"})


class LogoutView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)


# ======================================================
# ========== DASHBOARD / TRANSACTIONS ==================
# ======================================================
class DashboardStatsView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()

        # Active passes that are not expired
        active_passes = ParkingPass.objects.filter(expiry_date__gt=now).count()

        # Today's transactions
        today_txns = ParkingTransaction.objects.filter(entry_time__date=now.date())

        # Distinct vehicles today
        vehicles_today = today_txns.values("vehicle__vehicle_number").distinct().count()

        # Total earnings today
        earnings = today_txns.aggregate(total=Sum("fees_paid"))["total"] or 0

        # Vehicles still parked (exit_time is null)
        occupied_count = ParkingTransaction.objects.filter(exit_time__isnull=True).count()

        # Format the data for frontend
        data = {
            "active_passes_count": active_passes,
            "vehicles_today": vehicles_today,
            "earnings_today": round(float(earnings), 2),
            "slots_filled": occupied_count,  # send only number, not "x / 100"
        }

        return Response(data)


class TransactionsView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ParkingTransactionSerializer

    def get_queryset(self):
        return ParkingTransaction.objects.select_related("vehicle__owner").order_by("-entry_time")



class AllTransactionsView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ParkingTransactionSerializer

    def get_queryset(self):
        return ParkingTransaction.objects.select_related("vehicle__owner").order_by("-entry_time")


# ======================================================
# ========== PASS MANAGEMENT ===========================
# ======================================================
class CreatePassView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreatePassRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        owner_name = serializer.validated_data['owner_name']
        vehicle_number = serializer.validated_data['vehicle_number'].upper()
        vehicle_type = serializer.validated_data['vehicle_type']
        pass_type = serializer.validated_data['pass_type']

        owner, _ = Owner.objects.get_or_create(name=owner_name)
        vehicle, created_vehicle = Vehicle.objects.get_or_create(
            vehicle_number=vehicle_number,
            defaults={'owner': owner, 'vehicle_type': vehicle_type}
        )

        if ParkingPass.objects.filter(vehicle=vehicle, expiry_date__gt=timezone.now()).exists():
            return Response({'status': 'error', 'message': 'Vehicle already has an active pass.'},
                            status=status.HTTP_400_BAD_REQUEST)

        ParkingPass.objects.create(vehicle=vehicle, pass_type=pass_type)
        return Response({'status': 'success', 'message': f'Pass for {vehicle_number} created successfully!'},
                        status=status.HTTP_201_CREATED)


class AllPassesView(generics.ListAPIView):
    """Returns all parking passes with owner/vehicle details."""
    permission_classes = [IsAuthenticated]
    serializer_class = ParkingPassSerializer

    def get_queryset(self):
        return ParkingPass.objects.select_related('vehicle__owner').order_by('-issue_date')


class ExpiryNotificationsView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ParkingPassSerializer

    def get_queryset(self):
        now = timezone.now()
        soon = now + timedelta(days=7)
        return ParkingPass.objects.filter(expiry_date__gt=now, expiry_date__lte=soon).select_related("vehicle__owner")

    def list(self, request, *args, **kwargs):
        now = timezone.now()
        data = [
            {
                "id": p.id,
                "vehicle_number": p.vehicle.vehicle_number,
                "owner_name": p.vehicle.owner.name,
                "pass_type": p.pass_type,
                "expiry_date": p.expiry_date,
                "days_left": (p.expiry_date.date() - now.date()).days,
            }
            for p in self.get_queryset()
        ]
        return Response(data)


class VehicleEntryExitView(views.APIView):
    """Handles both vehicle entry and exit logic."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        entry_serializer = VehicleEntryRequestSerializer(data=request.data)
        if entry_serializer.is_valid():
            vehicle_number = entry_serializer.validated_data['vehicle_number'].upper()
            vehicle_type = entry_serializer.validated_data['vehicle_type']
            guest_owner, _ = Owner.objects.get_or_create(name='Guest')

            vehicle, _ = Vehicle.objects.get_or_create(
                vehicle_number=vehicle_number,
                defaults={'owner': guest_owner, 'vehicle_type': vehicle_type}
            )

            if ParkingTransaction.objects.filter(vehicle=vehicle, exit_time__isnull=True).exists():
                return Response({'status': 'error', 'message': 'Vehicle is already parked inside.'},
                                status=status.HTTP_400_BAD_REQUEST)

            ParkingTransaction.objects.create(vehicle=vehicle)
            return Response({'status': 'success', 'message': f'Vehicle {vehicle_number} entered.'},
                            status=status.HTTP_201_CREATED)

        # Try exit
        exit_serializer = VehicleExitRequestSerializer(data=request.data)
        if exit_serializer.is_valid():
            vehicle_number = exit_serializer.validated_data['vehicle_number'].upper()
            transaction = ParkingTransaction.objects.filter(
                vehicle__vehicle_number=vehicle_number, exit_time__isnull=True
            ).first()

            if not transaction:
                return Response({'status': 'error', 'message': 'No active entry for this vehicle.'},
                                status=status.HTTP_404_NOT_FOUND)

            transaction.exit_time = timezone.now()

            if not ParkingPass.objects.filter(vehicle=transaction.vehicle, expiry_date__gt=timezone.now()).exists():
                transaction.fees_paid = transaction.calculate_fees()

            transaction.status = "Exited"
            transaction.save()

            msg = f'Vehicle {vehicle_number} exited.'
            if transaction.fees_paid:
                msg += f' Fees: ₹{transaction.fees_paid:.2f}'
            return Response({'status': 'success', 'message': msg}, status=status.HTTP_200_OK)

        return Response({'status': 'error', 'message': 'Invalid entry or exit data.'},
                        status=status.HTTP_400_BAD_REQUEST)

# ======================================================
# ========== SLOT STATUS (for dashboard) ===============
# ======================================================
class SlotsDataView(views.APIView):
    """
    Returns available and occupied slots for cars and bikes.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        TOTAL_CAR_SLOTS = 50
        TOTAL_BIKE_SLOTS = 50

        parked = ParkingTransaction.objects.filter(exit_time__isnull=True).select_related('vehicle')
        cars_occupied = parked.filter(Q(vehicle__vehicle_type='car') | Q(vehicle__vehicle_type='other')).count()
        bikes_occupied = parked.filter(vehicle__vehicle_type='bike').count()

        return Response({
            'cars_occupied': cars_occupied,
            'bikes_occupied': bikes_occupied,
            'total_car_slots': TOTAL_CAR_SLOTS,
            'total_bike_slots': TOTAL_BIKE_SLOTS,
            'car_available': TOTAL_CAR_SLOTS - cars_occupied,
            'bike_available': TOTAL_BIKE_SLOTS - bikes_occupied,
        })

# ======================================================
# ========== OWNERS, VEHICLES & TRANSACTIONS ===========
# ======================================================

class OwnersListView(generics.ListAPIView):
    """
    Returns a list of all vehicle owners.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = OwnerSerializer

    def get_queryset(self):
        return Owner.objects.all().order_by('name')


class VehiclesListView(generics.ListAPIView):
    """
    Returns all registered vehicles with owner info.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = VehicleSerializer

    def get_queryset(self):
        return Vehicle.objects.select_related('owner').order_by('vehicle_number')


class AllTransactionsView(generics.ListAPIView):
    """
    Returns full transaction history (entry & exit).
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ParkingTransactionSerializer

    def get_queryset(self):
        return ParkingTransaction.objects.select_related('vehicle__owner').order_by('-entry_time')

class RecentTransactionsView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ParkingTransactionSerializer

    def get_queryset(self):
        return ParkingTransaction.objects.select_related("vehicle__owner").order_by("-entry_time")[:5]
