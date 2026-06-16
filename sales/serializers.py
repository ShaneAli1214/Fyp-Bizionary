from django.db import transaction
from decimal import Decimal
from collections import defaultdict
from rest_framework import serializers
from .models import Sale
from products.models import Product


class SaleSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_code = serializers.CharField(source='product.sku', read_only=True)
    product_category = serializers.CharField(source='product.category', read_only=True)
    remaining_stock = serializers.IntegerField(source='product.stock_quantity', read_only=True)
    line_items = serializers.JSONField(required=False)

    class Meta:
        model = Sale
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')
        extra_kwargs = {
            'product': {'required': False},
            'quantity_sold': {'required': False},
            'unit_price': {'required': False},
            'total_price': {'required': False},
        }

    def validate(self, attrs):
        line_items = attrs.get('line_items')
        if line_items is None:
            raise serializers.ValidationError({'line_items': 'At least one line item is required.'})

        if not isinstance(line_items, list):
            raise serializers.ValidationError({'line_items': 'Line items must be a list.'})

        if not line_items:
            raise serializers.ValidationError({'line_items': 'At least one line item is required.'})

        existing_counts = defaultdict(int)
        if self.instance and getattr(self.instance, 'line_items', None):
            for existing_item in self.instance.line_items:
                existing_product_id = int(existing_item.get('product') or 0)
                existing_counts[existing_product_id] += int(existing_item.get('quantity_sold') or existing_item.get('quantity') or 0)
        elif self.instance and self.instance.product_id:
            existing_counts[self.instance.product_id] = int(self.instance.quantity_sold or 0)

        normalized_items = []
        total_quantity = 0
        total_price = Decimal('0.00')
        primary_product = None

        for index, raw_item in enumerate(line_items):
            if not isinstance(raw_item, dict):
                raise serializers.ValidationError({f'line_items[{index}]': 'Invalid line item.'})

            product_id = raw_item.get('product') or raw_item.get('product_id')
            if not product_id:
                raise serializers.ValidationError({f'line_items[{index}].product': 'Product is required.'})

            try:
                product = Product.objects.get(pk=product_id)
            except Product.DoesNotExist as exc:
                raise serializers.ValidationError({f'line_items[{index}].product': 'Invalid product selected.'}) from exc

            quantity_value = raw_item.get('quantity_sold', raw_item.get('quantity', 0))
            quantity = int(quantity_value or 0)
            if quantity < 1:
                raise serializers.ValidationError({f'line_items[{index}].quantity_sold': 'Quantity must be at least 1.'})

            unit_price_value = raw_item.get('unit_price', raw_item.get('unitPrice', product.unit_price))
            unit_price = Decimal(str(unit_price_value))
            if unit_price <= 0:
                raise serializers.ValidationError({f'line_items[{index}].unit_price': 'Unit price must be greater than zero.'})

            available = product.stock_quantity + existing_counts.get(product.id, 0)
            if quantity > available:
                raise serializers.ValidationError({f'line_items[{index}].quantity_sold': f'Only {available} units available in stock.'})

            line_total = Decimal(str(raw_item.get('total_price', unit_price * quantity)))
            normalized_items.append({
                'product': product.id,
                'product_name': product.name,
                'product_code': product.sku,
                'product_category': product.category,
                'quantity_sold': quantity,
                'unit_price': str(unit_price),
                'total_price': str(line_total),
                'remaining_stock': product.stock_quantity,
            })

            total_quantity += quantity
            total_price += line_total
            primary_product = primary_product or product

        attrs['line_items'] = normalized_items
        attrs['product'] = primary_product
        attrs['quantity_sold'] = total_quantity
        attrs['unit_price'] = Decimal(normalized_items[0]['unit_price'])
        attrs['total_price'] = total_price
        return attrs

    def create(self, validated_data):
        line_items = validated_data.pop('line_items', [])
        primary_product = Product.objects.get(pk=line_items[0]['product'])

        validated_data['line_items'] = line_items
        validated_data['quantity_sold'] = sum(int(item.get('quantity_sold', 0)) for item in line_items)
        validated_data['unit_price'] = Decimal(str(line_items[0]['unit_price']))
        validated_data['total_price'] = sum(Decimal(str(item.get('total_price', 0))) for item in line_items)
        validated_data['product'] = primary_product

        return super().create(validated_data)

    def update(self, instance, validated_data):
        incoming_line_items = validated_data.pop('line_items', None)
        new_product = validated_data.get('product', instance.product)
        new_qty = validated_data.get('quantity_sold', instance.quantity_sold)
        new_unit_price = validated_data.get('unit_price', instance.unit_price)

        if incoming_line_items is not None:
            validated_data['line_items'] = incoming_line_items
            validated_data['quantity_sold'] = sum(int(item.get('quantity_sold', 0)) for item in incoming_line_items)
            validated_data['unit_price'] = Decimal(str(incoming_line_items[0]['unit_price'])) if incoming_line_items else instance.unit_price
            validated_data['total_price'] = sum(Decimal(str(item.get('total_price', 0))) for item in incoming_line_items)
        elif 'total_price' not in validated_data:
            validated_data['total_price'] = new_qty * new_unit_price

        return super().update(instance, validated_data)
