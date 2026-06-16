from rest_framework import serializers
from django.db import transaction
from decimal import Decimal
from products.models import Product
from .models import Purchase, OrderedSlip, SupplierCompany, PurchaseLineItem
from .company_mapping import company_for_category


class SupplierCompanySerializer(serializers.ModelSerializer):
    categoryId = serializers.CharField(source='category', required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = SupplierCompany
        fields = (
            'id',
            'name',
            'category',
            'categoryId',
            'contact_number',
            'email',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class PurchaseLineItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_code = serializers.CharField(source='product.sku', read_only=True)

    class Meta:
        model = PurchaseLineItem
        fields = (
            'id',
            'product',
            'product_name',
            'product_code',
            'quantity',
            'unit_cost',
            'total_cost',
        )
        read_only_fields = ('id', 'total_cost')


class PurchaseSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_code = serializers.CharField(source='product.sku', read_only=True)
    product_category = serializers.CharField(source='product.category', read_only=True)
    current_unit_price = serializers.DecimalField(source='product.unit_price', read_only=True, max_digits=10, decimal_places=2)
    line_items = PurchaseLineItemSerializer(many=True, required=False)

    class Meta:
        model = Purchase
        fields = (
            'id',
            'product',
            'product_name',
            'product_code',
            'product_category',
            'company_name',
            'quantity_purchased',
            'unit_cost',
            'total_cost',
            'current_unit_price',
            'purchase_date',
            'payment_status',
            'notes',
            'line_items',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
        extra_kwargs = {
            'product': {'required': False, 'allow_null': True},
            'quantity_purchased': {'required': False},
            'unit_cost': {'required': False},
            'total_cost': {'required': False},
        }

    def _assign_company(self, validated_data, instance=None):
        product = validated_data.get('product', getattr(instance, 'product', None))
        if product:
            validated_data['company_name'] = company_for_category(product.category)
        return validated_data

    def create(self, validated_data):
        line_items_data = validated_data.pop('line_items', [])
        validated_data = self._assign_company(validated_data)

        if line_items_data:
            # Multi-line purchase order
            primary_product = Product.objects.get(pk=line_items_data[0]['product'].id)
            total_qty = sum(int(item.get('quantity', 0)) for item in line_items_data)
            total_cost = sum(Decimal(str(item.get('quantity', 0))) * Decimal(str(item.get('unit_cost', 0))) for item in line_items_data)
            
            validated_data['product'] = primary_product
            validated_data['quantity_purchased'] = total_qty
            validated_data['unit_cost'] = Decimal(str(line_items_data[0]['unit_cost']))
            validated_data['total_cost'] = total_cost

            with transaction.atomic():
                purchase = Purchase(**validated_data)
                purchase._is_multiline = True
                purchase.save()

                for item_data in line_items_data:
                    PurchaseLineItem.objects.create(purchase=purchase, **item_data)
            return purchase
        else:
            if not validated_data.get('total_cost'):
                quantity = validated_data.get('quantity_purchased', 0)
                unit_cost = validated_data.get('unit_cost', 0)
                validated_data['total_cost'] = quantity * unit_cost
            return super().create(validated_data)

    def update(self, instance, validated_data):
        line_items_data = validated_data.pop('line_items', None)
        validated_data = self._assign_company(validated_data, instance=instance)

        if line_items_data is not None:
            primary_product = Product.objects.get(pk=line_items_data[0]['product'].id)
            total_qty = sum(int(item.get('quantity', 0)) for item in line_items_data)
            total_cost = sum(Decimal(str(item.get('quantity', 0))) * Decimal(str(item.get('unit_cost', 0))) for item in line_items_data)
            
            validated_data['product'] = primary_product
            validated_data['quantity_purchased'] = total_qty
            validated_data['unit_cost'] = Decimal(str(line_items_data[0]['unit_cost']))
            validated_data['total_cost'] = total_cost

            with transaction.atomic():
                instance._is_multiline = True
                for attr, value in validated_data.items():
                    setattr(instance, attr, value)
                instance.save()

                instance.line_items.all().delete()
                for item_data in line_items_data:
                    PurchaseLineItem.objects.create(purchase=instance, **item_data)
            return instance
        else:
            if 'total_cost' not in validated_data:
                quantity = validated_data.get('quantity_purchased', instance.quantity_purchased)
                unit_cost = validated_data.get('unit_cost', instance.unit_cost)
                validated_data['total_cost'] = quantity * unit_cost
            return super().update(instance, validated_data)


class OrderedSlipSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_code = serializers.CharField(source='product.sku', read_only=True)
    product_category = serializers.CharField(source='product.category', read_only=True)
    current_unit_price = serializers.DecimalField(source='product.unit_price', read_only=True, max_digits=10, decimal_places=2)
    company_email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = OrderedSlip
        fields = (
            'id',
            'product',
            'product_name',
            'product_code',
            'product_category',
            'company_name',
            'company_email',
            'due_date',
            'quantity_ordered',
            'quantity_received',
            'unit_cost',
            'total_cost',
            'current_unit_price',
            'status',
            'email_status',
            'email_error_message',
            'email_sent_at',
            'received_at',
            'notes',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'id',
            'due_date',
            'total_cost',
            'email_status',
            'email_sent_at',
            'received_at',
            'created_at',
            'updated_at',
        )

    def validate(self, attrs):
        quantity_ordered = attrs.get('quantity_ordered', getattr(self.instance, 'quantity_ordered', None))
        quantity_received = attrs.get('quantity_received', getattr(self.instance, 'quantity_received', 0))

        if quantity_ordered is not None and quantity_received is not None and quantity_received > quantity_ordered:
            raise serializers.ValidationError({'quantity_received': 'Received quantity cannot exceed ordered quantity.'})

        return attrs

    def create(self, validated_data):
        validated_data.setdefault('status', OrderedSlip.STATUS_PENDING)
        validated_data.setdefault('email_status', OrderedSlip.EMAIL_PENDING)
        validated_data.setdefault('company_email', '')
        if not validated_data.get('total_cost'):
            quantity = validated_data.get('quantity_ordered', 0)
            unit_cost = validated_data.get('unit_cost', 0)
            validated_data['total_cost'] = quantity * unit_cost
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'total_cost' not in validated_data:
            quantity = validated_data.get('quantity_ordered', instance.quantity_ordered)
            unit_cost = validated_data.get('unit_cost', instance.unit_cost)
            validated_data['total_cost'] = quantity * unit_cost
        return super().update(instance, validated_data)
