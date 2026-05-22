"""
Screen 4: Accounts & Finance - Serializers
DRF Serializers for API responses
"""

from rest_framework import serializers
from .models import Revenue, Expense, Invoice


class RevenueSerializer(serializers.ModelSerializer):
    """
    Serializer for Revenue model
    """
    class Meta:
        model = Revenue
        fields = [
            'id',
            'source',
            'amount',
            'date',
            'description',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_amount(self, value):
        """Ensure amount is positive"""
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero")
        return value


class ExpenseSerializer(serializers.ModelSerializer):
    """
    Serializer for Expense model
    """
    category_display = serializers.CharField(
        source='get_category_display',
        read_only=True
    )

    class Meta:
        model = Expense
        fields = [
            'id',
            'category',
            'category_display',
            'amount',
            'date',
            'description',
            'vendor',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_amount(self, value):
        """Ensure amount is positive"""
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero")
        return value


class InvoiceSerializer(serializers.ModelSerializer):
    """
    Serializer for Invoice model
    """
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )

    class Meta:
        model = Invoice
        fields = [
            'id',
            'invoice_number',
            'client_name',
            'amount',
            'status',
            'status_display',
            'due_date',
            'description',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_amount(self, value):
        """Ensure amount is positive"""
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero")
        return value

    def validate_invoice_number(self, value):
        """Ensure invoice number is unique when creating"""
        if self.instance is None:  # Creating new invoice
            if Invoice.objects.filter(invoice_number=value).exists():
                raise serializers.ValidationError(
                    "Invoice with this number already exists"
                )
        return value
