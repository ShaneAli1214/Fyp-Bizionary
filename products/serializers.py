from rest_framework import serializers
from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    product_code = serializers.CharField(source='sku')
    sale_price = serializers.DecimalField(source='unit_price', max_digits=10, decimal_places=2)
    is_low_stock = serializers.ReadOnlyField()
    stock_status = serializers.ReadOnlyField()
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
            'cost_price',
            'unit_price',
            'sale_price',
            'stock_quantity',
            'reorder_level',
            'is_low_stock',
            'stock_status',
            'inventory_value',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
