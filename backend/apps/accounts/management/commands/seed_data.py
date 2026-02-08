"""
Management command to seed database with demo data.
Usage: python manage.py seed_data
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.shops.models import Shop
from apps.inventory.models import InventoryItem

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed database with initial demo data'

    def handle(self, *args, **options):
        self.stdout.write('Seeding database...')

        # Create shops
        shop1, _ = Shop.objects.get_or_create(
            name='Downtown Branch', defaults={'address': '123 Main St', 'phone': '555-0101'}
        )
        shop2, _ = Shop.objects.get_or_create(
            name='Mall Outlet', defaults={'address': '456 Mall Rd', 'phone': '555-0102'}
        )

        # Create admin
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser(
                username='admin', password='admin123',
                email='admin@rezinserp.com', role='admin',
                first_name='System', last_name='Admin',
            )
            self.stdout.write(self.style.SUCCESS('  Created admin user (admin/admin123)'))

        # Create managers
        for i, (shop, name) in enumerate([(shop1, 'Downtown'), (shop2, 'Mall')], 1):
            uname = f'manager{i}'
            if not User.objects.filter(username=uname).exists():
                User.objects.create_user(
                    username=uname, password='manager123',
                    email=f'{uname}@rezinserp.com', role='shop_manager',
                    first_name=f'{name}', last_name='Manager', shop=shop,
                )
                self.stdout.write(self.style.SUCCESS(f'  Created {uname} (manager123)'))

        # Warehouse manager
        if not User.objects.filter(username='warehouse').exists():
            User.objects.create_user(
                username='warehouse', password='warehouse123',
                email='warehouse@rezinserp.com', role='warehouse_manager',
                first_name='Warehouse', last_name='Manager',
            )
            self.stdout.write(self.style.SUCCESS('  Created warehouse user (warehouse123)'))

        # Procurement officer
        if not User.objects.filter(username='procurement').exists():
            User.objects.create_user(
                username='procurement', password='procurement123',
                email='procurement@rezinserp.com', role='procurement_officer',
                first_name='Procurement', last_name='Officer',
            )
            self.stdout.write(self.style.SUCCESS('  Created procurement user (procurement123)'))

        # Workers
        for i in range(1, 5):
            uname = f'worker{i}'
            shop = shop1 if i <= 2 else shop2
            if not User.objects.filter(username=uname).exists():
                User.objects.create_user(
                    username=uname, password='worker123',
                    email=f'{uname}@rezinserp.com', role='worker',
                    first_name=f'Worker', last_name=f'{i}', shop=shop,
                )
                self.stdout.write(self.style.SUCCESS(f'  Created {uname} (worker123)'))

        # Inventory items
        items = [
            ('Burger Buns', 'pcs'), ('Beef Patties', 'pcs'), ('Cheese Slices', 'pcs'),
            ('Lettuce', 'kg'), ('Tomatoes', 'kg'), ('Onions', 'kg'),
            ('Ketchup', 'litre'), ('Mustard', 'litre'), ('Cooking Oil', 'litre'),
            ('French Fries', 'kg'), ('Chicken Strips', 'kg'), ('Soft Drink Syrup', 'litre'),
        ]
        for name, unit in items:
            InventoryItem.objects.get_or_create(name=name, defaults={'unit': unit})

        self.stdout.write(self.style.SUCCESS('Database seeded successfully!'))
