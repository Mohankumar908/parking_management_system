from django.db import models
from django.utils import timezone
from datetime import timedelta


# =========================
#  OWNER MODEL
# =========================
class Owner(models.Model):
    name = models.CharField(max_length=255)
    contact_number = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True, unique=False)

    def __str__(self):
        return self.name


# =========================
#  VEHICLE MODEL
# =========================
class Vehicle(models.Model):
    VEHICLE_TYPE_CHOICES = [
        ('car', 'Car'),
        ('bike', 'Bike'),
        ('other', 'Other'),
    ]

    owner = models.ForeignKey(Owner, on_delete=models.CASCADE, related_name="vehicles", null=True, blank=True)
    vehicle_number = models.CharField(max_length=20, unique=True)
    vehicle_type = models.CharField(max_length=10, choices=VEHICLE_TYPE_CHOICES, default="car")

    def __str__(self):
        return f"{self.vehicle_number} ({self.vehicle_type})"


# =========================
#  PARKING PASS MODEL
# =========================
class ParkingPass(models.Model):
    PASS_TYPE_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('yearly', 'Yearly'),
    ]

    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="passes")
    pass_type = models.CharField(max_length=10, choices=PASS_TYPE_CHOICES)
    issue_date = models.DateTimeField(auto_now_add=True)
    expiry_date = models.DateTimeField(blank=True, null=True)

    def save(self, *args, **kwargs):
        """Automatically calculate expiry_date based on pass_type"""
        if not self.expiry_date:
            base = self.issue_date or timezone.now()
            if self.pass_type == "daily":
                self.expiry_date = base + timedelta(days=1)
            elif self.pass_type == "weekly":
                self.expiry_date = base + timedelta(weeks=1)
            elif self.pass_type == "monthly":
                self.expiry_date = base + timedelta(days=30)
            elif self.pass_type == "yearly":
                self.expiry_date = base + timedelta(days=365)
        super().save(*args, **kwargs)

    def is_active(self):
        return self.expiry_date and self.expiry_date > timezone.now()

    def __str__(self):
        return f"Pass for {self.vehicle.vehicle_number} ({self.pass_type})"


# =========================
#  PARKING TRANSACTION MODEL
# =========================
class ParkingTransaction(models.Model):
    vehicle = models.ForeignKey('Vehicle', on_delete=models.CASCADE)
    entry_time = models.DateTimeField(default=timezone.now)
    exit_time = models.DateTimeField(null=True, blank=True)
    fees_paid = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, default="Parked")

    def calculate_fees(self):
        if not self.exit_time:
            self.exit_time = timezone.now()

        duration = self.exit_time - self.entry_time
        hours = duration.total_seconds() / 3600

        # fee per hour depending on vehicle type
        if self.vehicle.vehicle_type == "car":
            rate = 20
        elif self.vehicle.vehicle_type == "bike":
            rate = 10
        else:
            rate = 15

        # round up minimum 1 hour
        return round(max(1, hours) * rate, 2)

    def __str__(self):
        return f"{self.vehicle.vehicle_number} - {self.status}"
