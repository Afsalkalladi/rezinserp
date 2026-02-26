# Seed data migration for inventory items, procurement items, and 5 Ways supplier
from django.db import migrations


def seed_data(apps, schema_editor):
    InventoryItem = apps.get_model('inventory', 'InventoryItem')
    Supplier = apps.get_model('procurement', 'Supplier')

    # Warehouse items (from the unit price list)
    warehouse_items = [
        ('Beef (Kg)', 'kg', 16.00),
        ('Fried chicken patties (kg)', 'kg', 16.00),
        ('Grilled chicken Patties (Kg)', 'kg', 13.00),
        ('Nuggets (kg)', 'kg', 9.00),
        ('Lettuce (box)', 'box', 20.00),
        ('Tomato (box)', 'box', 30.00),
        ('Onions (kg)', 'kg', 5.00),
        ('Cheese sauce (tubs)', 'tub', 2.00),
        ('Classic sauce (kg)', 'kg', 10.00),
        ('Spicy sauce (kg)', 'kg', 10.00),
        ('Sweet sauce (kg)', 'kg', 10.00),
        ('Flour (packet)', 'packet', 17.00),
        ('Salt (bag)', 'bag', 15.00),
        ('Garlic powder (tub)', 'tub', 9.00),
        ('Bacon (kg)', 'kg', 27.50),
        ('Spicy seasoning (kg)', 'kg', 12.50),
        ('Burger seasoning (kg)', 'kg', 12.50),
        ('Mango pulp (cans)', 'can', 4.99),
        ('Milk (bottle)', 'bottle', 3.20),
        ('Mushroom (patties)', 'pcs', 3.00),
        ('Paper bags', 'pack', 50.00),
        ('Burger box', 'pack', 50.00),
        ('Combo cups', 'pack', 51.00),
        ('Fries box', 'pack', 31.00),
        ('Tray sheets', 'pack', 0.00),
        ('Napkins', 'pack', 27.00),
        ('Dipping sauce containers', 'pack', 35.00),
        ('Brown GPL Bags', 'pack', 17.00),
        ('Printer till rolls', 'pack', 30.00),
        ('Sharpies', 'pcs', 0.00),
        ('Staplers', 'pcs', 0.00),
        ('Stapler pins', 'pack', 0.00),
        ('Thickshake cups', 'pack', 82.00),
        ('Thickshake straws', 'pack', 45.00),
        ('Thickshake lids', 'pack', 49.00),
        ('Paper straws', 'pack', 20.00),
        ('Toilet paper roll', 'pack', 0.00),
        ('Hand towel', 'pack', 0.00),
        ('Bin liners', 'pack', 60.00),
        ('Oil Cans', 'can', 54.00),
        ('Gloves (medium)', 'box', 25.00),
        ('Gloves (large)', 'box', 30.00),
        ('Gloves (small)', 'box', 0.00),
        ('Chux Roll', 'roll', 30.00),
        ('White SOS Bags', 'pack', 27.00),
        ('Cling wrap', 'roll', 25.00),
        ('Oil Filter Paper', 'pack', 60.00),
        ('Bleach', 'bottle', 26.00),
        ('Degreaser', 'bottle', 44.00),
        ('Apple Juice', 'bottle', 18.00),
        ('Orange Juice', 'bottle', 18.00),
    ]

    for name, unit, price in warehouse_items:
        InventoryItem.objects.get_or_create(
            name=name,
            defaults={
                'unit': unit,
                'price': price,
                'category': 'warehouse',
                'is_active': True,
            }
        )

    # Procurement items (from 5 Ways order form)
    procurement_items = [
        ('Chips', 'carton', 0.00),
        ('Ice Cream', 'tub', 0.00),
        ('Jalapeños', 'packet', 0.00),
        ('Pineapple', 'can', 0.00),
        ('Pickles', 'can', 0.00),
        ('American Mustard', 'tub', 0.00),
        ('Ketchup', 'bottle', 0.00),
        ('Chocolate Topping', 'bottle', 0.00),
        ('Strawberry Topping', 'bottle', 0.00),
        ('Vanilla Topping', 'bottle', 0.00),
        ('Caramel Topping', 'bottle', 0.00),
        ('Chicken Salt', 'bucket', 0.00),
        ('Burger Cheese Slices', 'carton', 0.00),
    ]

    for name, unit, price in procurement_items:
        InventoryItem.objects.get_or_create(
            name=name,
            defaults={
                'unit': unit,
                'price': price,
                'category': 'procurement',
                'is_active': True,
            }
        )

    # Seed "5 Ways" supplier
    Supplier.objects.get_or_create(
        name='5 Ways',
        defaults={
            'phone': '0407 906 570',
            'is_active': True,
        }
    )


def reverse_seed(apps, schema_editor):
    # Don't delete data on reverse - items may have been used
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0002_inventoryitem_category_alter_inventoryitem_price'),
        ('procurement', '0002_supplier_procurementorder_procurementorderitem'),
    ]

    operations = [
        migrations.RunPython(seed_data, reverse_seed),
    ]
