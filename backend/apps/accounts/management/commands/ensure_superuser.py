"""
Management command to ensure a default superuser exists.
Used for initial deployment when no shell access is available.
"""
from django.core.management.base import BaseCommand
from django.conf import settings
from decouple import config


class Command(BaseCommand):
    help = 'Creates a default superuser if none exists (for initial deployment)'

    def handle(self, *args, **options):
        from apps.accounts.models import User
        
        # Check if any superuser exists
        if User.objects.filter(is_superuser=True).exists():
            self.stdout.write(self.style.WARNING('Superuser already exists. Skipping.'))
            return
        
        # Get credentials from environment or use defaults
        username = config('SUPERUSER_USERNAME', default='admin')
        password = config('SUPERUSER_PASSWORD', default='admin123')
        email = config('SUPERUSER_EMAIL', default='admin@rezinserp.com')
        
        # Create superuser
        User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            role='admin'
        )
        
        self.stdout.write(self.style.SUCCESS(
            f'✅ Superuser "{username}" created successfully!'
        ))
        self.stdout.write(self.style.WARNING(
            '⚠️  IMPORTANT: Change the default password after first login!'
        ))
