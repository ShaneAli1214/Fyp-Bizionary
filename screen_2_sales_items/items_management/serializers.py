from rest_framework import serializers
from products.models import Product
from .models import Category, ProductImage, StockHistory


class CategorySerializer(serializers.ModelSerializer):
    """Serializer for Category model"""
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'parent_category', 'created_at', 'updated_at']


class ProductImageSerializer(serializers.ModelSerializer):
    """Serializer for Product images"""
    class Meta:
        model = ProductImage
        fields = ['id', 'product', 'image', 'is_primary', 'uploaded_at']


class StockHistorySerializer(serializers.ModelSerializer):
    """Serializer for Stock history"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    
    class Meta:
        model = StockHistory
        fields = ['id', 'product', 'product_name', 'transaction_type', 'quantity_change', 
                  'quantity_after', 'reference_id', 'notes', 'created_by', 'created_at']


class ProductListSerializer(serializers.ModelSerializer):
    """Serializer for product listing with extended fields"""
    category_name = serializers.CharField(source='category', read_only=True)
    product_code = serializers.CharField(source='sku')
    total_sales = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    stock_status = serializers.SerializerMethodField()
    primary_image = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = ['id', 'name', 'product_code', 'category', 'category_name', 'unit_price', 
                  'stock_quantity', 'reorder_level', 'total_sales', 'stock_status', 
                  'primary_image', 'created_at', 'updated_at']
    
    def get_stock_status(self, obj):
        """Determine stock status"""
        if obj.stock_quantity == 0:
            return 'OUT_OF_STOCK'
        elif obj.stock_quantity <= obj.reorder_level:
            return 'LOW_STOCK'
        else:
            return 'IN_STOCK'
    
    def get_primary_image(self, obj):
        """Get primary product image URL"""
        primary_img = obj.images.filter(is_primary=True).first()
        if primary_img:
            return primary_img.image.url if primary_img.image else None
        return None


class ProductDetailSerializer(serializers.ModelSerializer):
    """Detailed product serializer with all related data"""
    product_code = serializers.CharField(source='sku')
    images = ProductImageSerializer(many=True, read_only=True)
    stock_history = StockHistorySerializer(many=True, read_only=True)
    stock_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = ['id', 'name', 'product_code', 'category', 'unit_price', 'stock_quantity', 
                  'reorder_level', 'description', 'stock_status', 'images', 
                  'stock_history', 'created_at', 'updated_at']
    
    def get_stock_status(self, obj):
        """Determine stock status"""
        if obj.stock_quantity == 0:
            return 'OUT_OF_STOCK'
        elif obj.stock_quantity <= obj.reorder_level:
            return 'LOW_STOCK'
        else:
            return 'IN_STOCK'


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating products"""
    product_code = serializers.CharField(source='sku')

    class Meta:
        model = Product
        fields = ['name', 'product_code', 'category', 'unit_price', 'stock_quantity', 
                  'reorder_level', 'description']
    
    def create(self, validated_data):
        product = Product.objects.create(**validated_data)
        
        # Create initial stock history
        StockHistory.objects.create(
            product=product,
            transaction_type='ADJUSTMENT',
            quantity_change=product.stock_quantity,
            quantity_after=product.stock_quantity,
            notes='Initial stock',
            created_by=self.context.get('user', 'admin')
        )
        
        return product
    
    def update(self, instance, validated_data):
        # Track stock changes
        old_stock = instance.stock_quantity
        new_stock = validated_data.get('stock_quantity', old_stock)
        
        if old_stock != new_stock:
            StockHistory.objects.create(
                product=instance,
                transaction_type='ADJUSTMENT',
                quantity_change=new_stock - old_stock,
                quantity_after=new_stock,
                notes='Manual adjustment',
                created_by=self.context.get('user', 'admin')
            )
        
        # Update product
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        return instance
