from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse, JsonResponse
from django.views.decorators.http import require_POST, require_GET
from django.utils import timezone
from datetime import timedelta

from .models import Owner, Vehicle, ParkingPass, Transaction

def calculate_expiry_date(pass_type):
    if pass_type == 'daily':
        return timezone.now() + timedelta(days=1)
    elif pass_type == 'weekly':
        return timezone.now() + timedelta(weeks=1)
    elif pass_type == 'monthly':
        return timezone.now() + timedelta(days=30) 
    elif pass_type == 'yearly':
        return timezone.now() + timedelta(days=365) 
    return timezone.now() 

def dashboard_view(request):
    
    active_passes_count = ParkingPass.objects.filter(is_active=True, expiry_date__gt=timezone.now()).count()
    recent_transactions = Transaction.objects.order_by('-entry_time')[:10] 

    context = {
        'active_passes_count': active_passes_count,
        'recent_transactions': recent_transactions,
        'pass_types': ParkingPass.PASS_TYPES, 
        'vehicle_types': Vehicle.VEHICLE_TYPES, 
    }
    return render(request, 'parking_app/dashboard.html', context)

@require_POST
def create_parking_pass(request):
 
    vehicle_number = request.POST.get('vehicle_number')
    owner_name = request.POST.get('owner_name')
    vehicle_type = request.POST.get('vehicle_type')
    pass_type = request.POST.get('pass_type')

    if not all([vehicle_number, owner_name, vehicle_type, pass_type]):
        return JsonResponse({'status': 'error', 'message': 'Missing required fields'}, status=400)

    try:
        owner, created = Owner.objects.get_or_create(name=owner_name)

        vehicle, created = Vehicle.objects.get_or_create(
            vehicle_number=vehicle_number,
            defaults={'owner': owner, 'vehicle_type': vehicle_type}
        )

        existing_pass = ParkingPass.objects.filter(vehicle=vehicle, is_active=True, expiry_date__gt=timezone.now()).first()
        if existing_pass:
            return JsonResponse({'status': 'error', 'message': 'Vehicle already has an active pass.'}, status=400)

        expiry_date = calculate_expiry_date(pass_type)

        parking_pass = ParkingPass.objects.create(
            vehicle=vehicle,
            pass_type=pass_type,
            expiry_date=expiry_date,
            is_active=True
        )
        return JsonResponse({'status': 'success', 'message': f'Pass for {vehicle_number} created successfully!', 'pass_id': parking_pass.id})

    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

@require_POST
def vehicle_entry(request):

    vehicle_number = request.POST.get('vehicle_number')
    if not vehicle_number:
        return JsonResponse({'status': 'error', 'message': 'Vehicle number is required.'}, status=400)

    try:
        vehicle = get_object_or_404(Vehicle, vehicle_number=vehicle_number)

        active_pass = ParkingPass.objects.filter(vehicle=vehicle, is_active=True, expiry_date__gt=timezone.now()).first()
        if active_pass:
            message = f"Vehicle {vehicle_number} entered with an active {active_pass.get_pass_type_display()} pass."
        else:
            message = f"Vehicle {vehicle_number} entered. No active pass found."

        transaction = Transaction.objects.create(vehicle=vehicle, entry_time=timezone.now())
        return JsonResponse({'status': 'success', 'message': message, 'transaction_id': transaction.id})

    except Vehicle.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Vehicle not found. Please create a pass first.'}, status=404)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

@require_POST
def vehicle_exit(request):

    vehicle_number = request.POST.get('vehicle_number')
    if not vehicle_number:
        return JsonResponse({'status': 'error', 'message': 'Vehicle number is required.'}, status=400)

    try:
        vehicle = get_object_or_404(Vehicle, vehicle_number=vehicle_number)

        transaction = Transaction.objects.filter(vehicle=vehicle, exit_time__isnull=True).order_by('-entry_time').first()

        if not transaction:
            return JsonResponse({'status': 'error', 'message': 'No active entry found for this vehicle.'}, status=404)

        transaction.exit_time = timezone.now()

        fees = 0
        active_pass = ParkingPass.objects.filter(vehicle=vehicle, is_active=True, expiry_date__gt=timezone.now()).first()
        if not active_pass:

            duration = (transaction.exit_time - transaction.entry_time).total_seconds() / 3600 # in hours
            hourly_rate = 5.00 
            fees = round(duration * hourly_rate, 2)
            transaction.fees_paid = fees
            message = f"Vehicle {vehicle_number} exited. Fees: ${fees:.2f}"
        else:
            message = f"Vehicle {vehicle_number} exited with active pass. No fees charged."

        transaction.save()
        return JsonResponse({'status': 'success', 'message': message, 'transaction_id': transaction.id, 'fees': fees})

    except Vehicle.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Vehicle not found.'}, status=404)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
