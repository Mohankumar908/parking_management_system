from django.core.management.base import BaseCommand
from django.utils import timezone
from parking_app.models import ParkingPass, Notification, Owner, Vehicle

class Command(BaseCommand):
    help = 'Checks for expired parking passes and creates notifications.'

    def handle(self, *args, **options):
        now = timezone.now()

        expired_passes = ParkingPass.objects.filter(
            is_active=True,
            expiry_date__lt=now
        )

        notification_count = 0
        for parking_pass in expired_passes:

            parking_pass.is_active = False
            parking_pass.save()

            vehicle = parking_pass.vehicle
            owner = vehicle.owner

            if not Notification.objects.filter(pass_notified=parking_pass, notification_type='pass_expiry').exists():
                Notification.objects.create(
                    recipient=owner,
                    pass_notified=parking_pass,
                    message=f"Your parking pass for vehicle {vehicle.vehicle_number} expired on {parking_pass.expiry_date.strftime('%Y-%m-%d %H:%M')}.",
                    notification_type='pass_expiry'
                )
                notification_count += 1
                self.stdout.write(self.style.SUCCESS(f"Generated expiry notification for {vehicle.vehicle_number}."))

            else:
                self.stdout.write(self.style.WARNING(f"Notification already exists for expired pass {vehicle.vehicle_number}."))

        upcoming_expiries = ParkingPass.objects.filter(
            is_active=True,
            expiry_date__gt=now,
            expiry_date__lt=now + timezone.timedelta(days=3) 
        )

        for parking_pass in upcoming_expiries:
            vehicle = parking_pass.vehicle
            owner = vehicle.owner
            message = f"Reminder: Your parking pass for vehicle {vehicle.vehicle_number} will expire on {parking_pass.expiry_date.strftime('%Y-%m-%d %H:%M')}."

            if not Notification.objects.filter(
                pass_notified=parking_pass,
                notification_type='pass_expiry',
                message__icontains="Reminder"
            ).exists():
                Notification.objects.create(
                    recipient=owner,
                    pass_notified=parking_pass,
                    message=message,
                    notification_type='pass_expiry'
                )
                notification_count += 1
                self.stdout.write(self.style.SUCCESS(f"Generated reminder notification for {vehicle.vehicle_number}."))

        self.stdout.write(self.style.SUCCESS(f'Finished checking for expired passes. {notification_count} new notifications created.'))