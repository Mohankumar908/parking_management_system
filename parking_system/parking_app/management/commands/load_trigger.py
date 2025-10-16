from django.core.management.base import BaseCommand
from django.db import connection
import os

class Command(BaseCommand):
    help = 'Loads SQL triggers from parking_app/sql/triggers.sql into the database.'

    def handle(self, *args, **options):
        sql_file_path = os.path.join(
            os.path.dirname(__file__),
            '..', '..', 'sql', 'triggers.sql'
        )

        if not os.path.exists(sql_file_path):
            self.stderr.write(self.style.ERROR(f"SQL file not found: {sql_file_path}"))
            return

        with open(sql_file_path, 'r') as f:
            sql_statements = f.read()

        with connection.cursor() as cursor:
            try:
                cursor.executescript(sql_statements)
                self.stdout.write(self.style.SUCCESS('Successfully loaded SQL triggers.'))
            except Exception as e:
                self.stderr.write(self.style.ERROR(f'Error loading SQL triggers: {e}'))