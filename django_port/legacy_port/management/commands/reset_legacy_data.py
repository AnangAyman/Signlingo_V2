from django.core.management import call_command
from django.core.management.base import BaseCommand

from legacy_port.services import seed_initial_data


class Command(BaseCommand):
    help = "Reset Django data and reseed the legacy SignLingo starter content."

    def handle(self, *args, **options):
        # This is the closest Django equivalent to the old Flask init-app command:
        # clear existing rows, keep the schema, then seed the starter course/admin/shop data again.
        call_command("flush", "--no-input")
        seed_initial_data()
        self.stdout.write(self.style.SUCCESS("Reset and reseeded Django legacy data."))
