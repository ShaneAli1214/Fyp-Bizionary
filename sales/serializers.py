from django.db import transaction
from rest_framework import serializers
from .models import Sale
from products.models import Product


class SaleSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_code = serializers.CharField(source='product.sku', read_only=True)
    product_category = serializers.CharField(source='product.category', read_only=True)
    remaining_stock = serializers.IntegerField(source='product.stock_quantity', read_only=True)

    class Meta:
        model = Sale
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')
        extra_kwargs = {
            'total_price': {'required': False},
            'unit_price': {'required': False},
        }

    def validate(self, attrs):
        product = attrs.get('product', getattr(self.instance, 'product', None))
        quantity = attrs.get('quantity_sold', getattr(self.instance, 'quantity_sold', None))

        if not product or not quantity:
            return attrs

        # Handle updates where product/quantity can change.
        if self.instance:
            old_product = self.instance.product
            old_qty = self.instance.quantity_sold

            if product.id == old_product.id:
                available = old_product.stock_quantity + old_qty
            else:
                available = product.stock_quantity
        else:
            available = product.stock_quantity

        if quantity > available:
            raise serializers.ValidationError({
                'quantity_sold': f'Only {available} units available in stock.'
            })

        return attrs

    def create(self, validated_data):
        product = validated_data['product']
        quantity = validated_data.get('quantity_sold', 0)
        if not validated_data.get('unit_price'):
            validated_data['unit_price'] = product.unit_price
        if not validated_data.get('total_price'):
            validated_data['total_price'] = validated_data['unit_price'] * quantity

        with transaction.atomic():
            product.stock_quantity -= quantity
            product.save(update_fields=['stock_quantity', 'updated_at'])
            sale = super().create(validated_data)
        return sale

    def update(self, instance, validated_data):
        new_product = validated_data.get('product', instance.product)
        new_qty = validated_data.get('quantity_sold', instance.quantity_sold)
        new_unit_price = validated_data.get('unit_price', instance.unit_price)

        if 'total_price' not in validated_data:
            validated_data['total_price'] = new_qty * new_unit_price

        with transaction.atomic():
            old_product = instance.product
            old_qty = instance.quantity_sold

            # Roll back previous stock deduction.
            old_product.stock_quantity += old_qty
            old_product.save(update_fields=['stock_quantity', 'updated_at'])

            # Apply new stock deduction.
            new_product.stock_quantity -= new_qty
            new_product.save(update_fields=['stock_quantity', 'updated_at'])

            sale = super().update(instance, validated_data)

        return sale
