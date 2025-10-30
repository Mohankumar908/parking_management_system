from rest_framework import serializers
from .models import Owner, Vehicle, ParkingPass, ParkingTransaction


# =====================================================
# ========== BASIC SERIALIZERS ========================
# =====================================================

class OwnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Owner
        fields = ['id', 'name', 'contact_number', 'email']


class VehicleSerializer(serializers.ModelSerializer):
    owner = OwnerSerializer(read_only=True)

    class Meta:
        model = Vehicle
        fields = ['id', 'vehicle_number', 'vehicle_type', 'owner']


class ParkingPassSerializer(serializers.ModelSerializer):
    vehicle = VehicleSerializer(read_only=True)

    class Meta:
        model = ParkingPass
        fields = ['id', 'vehicle', 'pass_type', 'issue_date', 'expiry_date']


class ParkingTransactionSerializer(serializers.ModelSerializer):
    vehicle_number = serializers.CharField(source="vehicle.vehicle_number", read_only=True)
    owner_name = serializers.CharField(source="vehicle.owner.name", read_only=True)

    class Meta:
        model = ParkingTransaction
        fields = ["id", "vehicle_number", "owner_name", "entry_time", "exit_time", "fees_paid", "status"]



# =====================================================
# ========== REQUEST SERIALIZERS ======================
# =====================================================

class CreatePassRequestSerializer(serializers.Serializer):
    owner_name = serializers.CharField(max_length=255)
    vehicle_number = serializers.CharField(max_length=20)
    vehicle_type = serializers.ChoiceField(choices=[
        ('car', 'Car'),
        ('bike', 'Bike'),
        ('other', 'Other')
    ])
    pass_type = serializers.ChoiceField(choices=[
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('yearly', 'Yearly')
    ])


class VehicleEntryRequestSerializer(serializers.Serializer):
    vehicle_number = serializers.CharField(max_length=20)
    vehicle_type = serializers.ChoiceField(choices=[
        ('car', 'Car'),
        ('bike', 'Bike'),
        ('other', 'Other')
    ])


class VehicleExitRequestSerializer(serializers.Serializer):
    vehicle_number = serializers.CharField(max_length=20)
