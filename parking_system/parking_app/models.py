from django.db import models
from django.utils import timezone

class Owner(models.Model):
    name = models.CharField(max_length=100)
    contact_number = models.CharField(max_length=15, blank=True, null=True)
    email = models.EmailField(unique=True, blank=True, null=True)

    def __str__(self):
        return self.name

class Vehicle(models.Model):
    VEHICLE_TYPES = [
        ('car', 'Car'),
        ('bike', 'Bike'),
        ('truck', 'Truck'),
        ('other', 'Other'),
    ]
    owner = models.ForeignKey(Owner, on_delete=models.CASCADE, related_name='vehicles')
    vehicle_number = models.CharField(max_length=20, unique=True)
    vehicle_type = models.CharField(max_length=10, choices=VEHICLE_TYPES, default='car')
    make = models.CharField(max_length=50, blank=True, null=True)
    model = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return f"{self.vehicle_number} ({self.owner.name})"

class ParkingPass(models.Model):
    PASS_TYPES = [
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('yearly', 'Yearly'),
        ('daily', 'Daily'), 
    ]
    vehicle = models.OneToOneField(Vehicle, on_delete=models.CASCADE, related_name='parking_pass')
    pass_type = models.CharField(max_length=10, choices=PASS_TYPES, default='Daily')
    issue_date = models.DateTimeField(default=timezone.now)
    expiry_date = models.DateTimeField(default=timezone.now)
    is_active = models.BooleanField(default=True) 

    def __str__(self):
        return f"Pass for {self.vehicle.vehicle_number} ({self.pass_type})"

    def is_expired(self):
        return self.expiry_date < timezone.now()

class Transaction(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    entry_time = models.DateTimeField(default=timezone.now)
    exit_time = models.DateTimeField(null=True, blank=True)
    fees_paid = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)

    def __str__(self):
        status = "Exited" if self.exit_time else "Parked"
        vehicle_info = self.vehicle.vehicle_number if self.vehicle else "N/A"
        return f"Transaction for {vehicle_info} - {status} at {self.entry_time.strftime('%Y-%m-%d %H:%M')}"
    

class Notification(models.Model):

    NOTIFICATION_TYPES = [
        ('pass_expiry', 'Pass Expiry'),
        ('low_balance', 'Low Balance'),
        ('system_alert', 'System Alert'), 
    ]
    recipient = models.ForeignKey(Owner, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    pass_notified = models.ForeignKey(ParkingPass, on_delete=models.CASCADE, null=True, blank=True)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, default='pass_expiry')
    created_at = models.DateTimeField(default=timezone.now)
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f"[{self.notification_type}] {self.message[:50]}..."
