"""
Quick script to create a superuser programmatically for Render deployment.
Run: python create_superuser.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

# Change these credentials
USERNAME = 'admin'
PASSWORD = 'admin123'  # CHANGE THIS!
EMAIL = 'admin@rezinserp.com'

if not User.objects.filter(username=USERNAME).exists():
    User.objects.create_superuser(
        username=USERNAME,
        email=EMAIL,
        password=PASSWORD,
        role='admin'
    )
    print(f'✅ Superuser "{USERNAME}" created successfully!')
else:
    print(f'⚠️  User "{USERNAME}" already exists.')
