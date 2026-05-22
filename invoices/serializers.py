from rest_framework import serializers
from .models import Invoice


class InvoiceSerializer(serializers.ModelSerializer):
    balance_due = serializers.ReadOnlyField()
    is_overdue = serializers.ReadOnlyField()

    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')

    def create(self, validated_data):
        if not validated_data.get('total_amount'):
            subtotal = validated_data.get('subtotal', 0)
            tax_amount = validated_data.get('tax_amount', 0)
            discount_amount = validated_data.get('discount_amount', 0)
            validated_data['total_amount'] = subtotal + tax_amount - discount_amount
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'total_amount' not in validated_data:
            subtotal = validated_data.get('subtotal', instance.subtotal)
            tax_amount = validated_data.get('tax_amount', instance.tax_amount)
            discount_amount = validated_data.get('discount_amount', instance.discount_amount)
            validated_data['total_amount'] = subtotal + tax_amount - discount_amount
        return super().update(instance, validated_data)
