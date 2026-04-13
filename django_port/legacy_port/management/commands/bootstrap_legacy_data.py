from django.core.management.base import BaseCommand

from legacy_port.services import seed_initial_data


class Command(BaseCommand):
    help = "Seed Django with the legacy SignLingo starter data."

    def handle(self, *args, **options):
        # This is the Django-side equivalent of the old Flask init/seed flow during setup.
        seed_initial_data()
        self.stdout.write(self.style.SUCCESS("Seeded Django legacy data."))
