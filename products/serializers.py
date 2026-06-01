from rest_framework import serializers
from .models import Product
from purchases.models import SupplierCompany


class ProductSerializer(serializers.ModelSerializer):
    product_code = serializers.CharField(source='sku')
    categoryId = serializers.CharField(source='category', required=False, allow_blank=True, allow_null=True)
    sale_price = serializers.DecimalField(source='unit_price', max_digits=10, decimal_places=2)
    supplier = serializers.PrimaryKeyRelatedField(queryset=SupplierCompany.objects.all(), required=False, allow_null=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    current_stock = serializers.IntegerField(source='stock_quantity', read_only=True)
    is_low_stock = serializers.ReadOnlyField()
    stock_status = serializers.ReadOnlyField()
    inventory_value = serializers.ReadOnlyField()
    profit_margin = serializers.ReadOnlyField()
    minimum_stock = serializers.IntegerField(source='min_stock', required=False)

    class Meta:
        model = Product
        fields = (
            'id',
            'name',
            'product_code',
            'description',
            'category',
            'categoryId',
            'subcategory',
            'cost_price',
            'unit_price',
            'sale_price',
            'current_stock',
            'stock_quantity',
            'min_stock',
            'minimum_stock',
            'supplier',
            'supplier_name',
            'status',
            'is_low_stock',
            'stock_status',
            'inventory_value',
            'profit_margin',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
