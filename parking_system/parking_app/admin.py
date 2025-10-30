# parking_api/admin.py
from django.contrib import admin
from .models import Owner, Vehicle, ParkingPass, ParkingTransaction

admin.site.register(Owner)
admin.site.register(Vehicle)
admin.site.register(ParkingPass)
admin.site.register(ParkingTransaction)