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
            name='Downtown Branch', defaults={'address': '123 Main St, Melbourne VIC 3000', 'phone': '03-9555-0101'}
        )
        shop2, _ = Shop.objects.get_or_create(
            name='Mall Outlet', defaults={'address': '456 Mall Rd, Melbourne VIC 3004', 'phone': '03-9555-0102'}
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

        # Payroll manager
        if not User.objects.filter(username='payrollmgr').exists():
            User.objects.create_user(
                username='payrollmgr', password='payroll123',
                email='payrollmgr@rezinserp.com', role='payroll_manager',
                first_name='Payroll', last_name='Manager',
            )
            self.stdout.write(self.style.SUCCESS('  Created payrollmgr user (payroll123)'))

        # Workers
        for i in range(1, 5):
            uname = f'worker{i}'
            shop = shop1 if i <= 2 else shop2
            if not User.objects.filter(username=uname).exists():
                User.objects.create_user(
                    username=uname, password='worker123',
                    email=f'{uname}@rezinserp.com', role='worker',
                    first_name=f'Worker', last_name=f'{i}', shop=shop,
                    mobile_number=f'04{i}2-345-678',
                    home_address=f'{i}0{i} Worker St, Melbourne VIC 300{i}',
                )
                self.stdout.write(self.style.SUCCESS(f'  Created {uname} (worker123)'))

        # Inventory items with prices
        items = [
            ('Burger Buns', 'pcs', '0.80'), ('Beef Patties', 'pcs', '2.50'), ('Cheese Slices', 'pcs', '0.60'),
            ('Lettuce', 'kg', '5.00'), ('Tomatoes', 'kg', '4.50'), ('Onions', 'kg', '3.00'),
            ('Ketchup', 'litre', '6.00'), ('Mustard', 'litre', '7.00'), ('Cooking Oil', 'litre', '4.00'),
            ('French Fries', 'kg', '8.00'), ('Chicken Strips', 'kg', '12.00'), ('Soft Drink Syrup', 'litre', '15.00'),
        ]
        for name, unit, price in items:
            InventoryItem.objects.update_or_create(
                name=name, defaults={'unit': unit, 'price': price}
            )

        self.stdout.write(self.style.SUCCESS('Database seeded successfully!'))
