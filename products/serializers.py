from rest_framework import serializers
from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    product_code = serializers.CharField(source='sku')
    is_low_stock = serializers.ReadOnlyField()
    inventory_value = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = (
            'id',
            'name',
            'product_code',
            'description',
            'category',
            'subcategory',
            'unit_price',
            'stock_quantity',
            'reorder_level',
            'is_low_stock',
            'inventory_value',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
