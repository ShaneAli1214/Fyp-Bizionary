"""
Database Population Script - Populates the database with REAL data
Run this with: python populate_real_data.py
"""

import os
import django
import sys
from datetime import datetime, timedelta
from decimal import Decimal

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_system.settings')
django.setup()

from products.models import Product
from sales.models import Sale
from invoices.models import Invoice
from product_catalog import ALL_PRODUCTS
from product_catalog.master_data import (
    CATEGORIES_DATA,
    SUPPLIERS_DATA,
    SALES_DATA,
    INVOICES_DATA
)


def clear_existing_data():
    """Clear all existing data from the database"""
    print("\n🗑️  Clearing existing data...")
    Invoice.objects.all().delete()
    Sale.objects.all().delete()
    Product.objects.all().delete()
    print("✅ Existing data cleared!")


def populate_products():
    """Populate all real products into the database"""
    print("\n📦 Populating Products...")
    
    created_count = 0
    for product_data in ALL_PRODUCTS:
        try:
            product, created = Product.objects.get_or_create(
                sku=product_data['sku'],
                defaults={
                    'name': product_data['name'],
                    'category': product_data['category'],
                    'description': f"{product_data.get('brand', '')} - {product_data.get('supplier', '')}",
                    'unit_price': product_data['unit_price'],
                    'stock_quantity': product_data['stock_quantity'],
                    'min_stock': product_data['reorder_level'],
                }
            )
            if created:
                created_count += 1
                print(f"  ✓ Created: {product.name} (SKU: {product.sku})")
        except Exception as e:
            print(f"  ✗ Error creating {product_data['name']}: {str(e)}")
    
    print(f"\n✅ Products populated! Total: {created_count} products created")
    return created_count


def populate_sales():
    """Populate sample sales data"""
    print("\n💳 Populating Sales Data...")
    
    created_count = 0
    for sale_data in SALES_DATA:
        try:
            # Find product by SKU
            product = Product.objects.get(sku=sale_data['product_sku'])
            
            total_price = (sale_data['quantity_sold'] * sale_data['unit_price']) - sale_data['discount']
            
            sale, created = Sale.objects.get_or_create(
                invoice_number=f"SALE-{datetime.now().timestamp()}",
                defaults={
                    'product': product,
                    'customer_name': sale_data['customer_name'],
                    'quantity_sold': sale_data['quantity_sold'],
                    'unit_price': sale_data['unit_price'],
                    'total_price': total_price,
                    'discount': sale_data['discount'],
                    'payment_method': sale_data['payment_method'],
                    'payment_status': sale_data['payment_status'],
                    'sale_date': datetime.strptime(sale_data['sale_date'], '%Y-%m-%d').date(),
                    'notes': f"Real data sales transaction for {product.name}"
                }
            )
            if created:
                created_count += 1
                print(f"  ✓ Sale: {sale.customer_name} - {sale.quantity_sold}x {product.name}")
        except Product.DoesNotExist:
            print(f"  ✗ Product not found: {sale_data['product_sku']}")
        except Exception as e:
            print(f"  ✗ Error creating sale: {str(e)}")
    
    print(f"\n✅ Sales populated! Total: {created_count} sales created")
    return created_count


def populate_invoices():
    """Populate sample invoice data"""
    print("\n📄 Populating Invoices...")
    
    created_count = 0
    for invoice_data in INVOICES_DATA:
        try:
            invoice, created = Invoice.objects.get_or_create(
                invoice_number=invoice_data['invoice_number'],
                defaults={
                    'customer_name': invoice_data['customer_name'],
                    'customer_email': invoice_data['customer_email'],
                    'customer_phone': invoice_data['customer_phone'],
                    'invoice_date': datetime.strptime(invoice_data['invoice_date'], '%Y-%m-%d').date(),
                    'due_date': datetime.strptime(invoice_data['due_date'], '%Y-%m-%d').date(),
                    'subtotal': invoice_data['subtotal'],
                    'tax_amount': invoice_data['tax_amount'],
                    'discount_amount': invoice_data['discount_amount'],
                    'total_amount': invoice_data['total_amount'],
                    'amount_paid': invoice_data['amount_paid'],
                    'status': invoice_data['status'],
                    'notes': invoice_data['notes']
                }
            )
            if created:
                created_count += 1
                print(f"  ✓ Invoice: {invoice.invoice_number} - {invoice.customer_name}")
        except Exception as e:
            print(f"  ✗ Error creating invoice: {str(e)}")
    
    print(f"\n✅ Invoices populated! Total: {created_count} invoices created")
    return created_count


def print_statistics():
    """Print database statistics"""
    print("\n" + "="*60)
    print("📊 DATABASE STATISTICS")
    print("="*60)
    print(f"Total Products: {Product.objects.count()}")
    print(f"Total Sales: {Sale.objects.count()}")
    print(f"Total Invoices: {Invoice.objects.count()}")
    print("="*60)


def main():
    """Main function to populate database"""
    print("\n" + "="*60)
    print("🚀 REAL DATA POPULATION SCRIPT")
    print("="*60)
    
    try:
        # Clear old data
        clear_existing_data()
        
        # Populate new data
        populate_products()
        populate_sales()
        populate_invoices()
        
        # Print statistics
        print_statistics()
        
        print("\n✅ DATABASE POPULATION COMPLETED SUCCESSFULLY! ✅")
        print("All real data has been imported into the database.")
        
    except Exception as e:
        print(f"\n❌ ERROR during population: {str(e)}")
        sys.exit(1)


if __name__ == '__main__':
    main()
