from django.core.management.base import BaseCommand

from legacy_port.services import seed_initial_data


class Command(BaseCommand):
    help = "Seed Django with the legacy SignLingo starter data."

    def handle(self, *args, **options):
        seed_initial_data()
        self.stdout.write(self.style.SUCCESS("Seeded Django legacy data."))
