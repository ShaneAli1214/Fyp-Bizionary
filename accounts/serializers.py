"""
Screen 4: Accounts & Finance - Serializers
DRF Serializers for API responses
"""

from rest_framework import serializers
from .models import Revenue, Expense, Invoice, SalaryPayment, UtilityBill, RecurringCost
from user_management.serializers import RoleSerializer # We can import ERPUserSerializer but let's check user_management serializers first. Wait, let's just import ERPUserSerializer since it is defined in user_management/serializers.py.


class RevenueSerializer(serializers.ModelSerializer):
    """
    Serializer for Revenue model
    """
    class Meta:
        model = Revenue
        fields = [
            'id',
            'customer',
            'invoice_number',
            'payment_status',
            'category',
            'amount',
            'date',
            'description',
            'voided',
            'void_reason',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ('id', 'voided', 'void_reason', 'created_at', 'updated_at')

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
    payment_method_display = serializers.CharField(
        source='get_payment_method_display',
        read_only=True
    )

    class Meta:
        model = Expense
        fields = [
            'id',
            'category',
            'category_display',
            'amount',
            'tax_amount',
            'payment_method',
            'payment_method_display',
            'receipt',
            'date',
            'description',
            'vendor',
            'voided',
            'void_reason',
            'content_type',
            'object_id',
            'metadata',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ('id', 'voided', 'void_reason', 'content_type', 'object_id', 'metadata', 'created_at', 'updated_at')

    def validate_amount(self, value):
        """Ensure amount is positive"""
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero")
        return value

    def validate(self, data):
        """Validate tax amount is not greater than total amount"""
        amount = data.get('amount', 0)
        tax_amount = data.get('tax_amount', 0)
        if tax_amount > amount:
            raise serializers.ValidationError({"tax_amount": "Tax amount cannot be greater than the total amount"})
        return data


class InvoiceSerializer(serializers.ModelSerializer):
    """
    Serializer for Invoice model
    """
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    aging = serializers.IntegerField(read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id',
            'invoice_number',
            'client_name',
            'amount',
            'balance_due',
            'status',
            'status_display',
            'date',
            'due_date',
            'description',
            'voided',
            'void_reason',
            'aging',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ('id', 'voided', 'void_reason', 'aging', 'created_at', 'updated_at')

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


class SalaryPaymentSerializer(serializers.ModelSerializer):
    """
    Serializer for SalaryPayment model
    """
    employee_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = SalaryPayment
        fields = [
            'id',
            'employee',
            'employee_name',
            'amount',
            'pay_period_start',
            'pay_period_end',
            'payment_date',
            'payment_method',
            'status',
            'notes',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ('id', 'created_at', 'updated_at')

    def get_employee_name(self, obj):
        return obj.employee.get_full_name() or obj.employee.username

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero")
        return value


class UtilityBillSerializer(serializers.ModelSerializer):
    """
    Serializer for UtilityBill model
    """
    utility_type_display = serializers.CharField(
        source='get_utility_type_display',
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    payment_method_display = serializers.CharField(
        source='get_payment_method_display',
        read_only=True
    )

    class Meta:
        model = UtilityBill
        fields = [
            'id',
            'utility_type',
            'utility_type_display',
            'bill_number',
            'billing_period_start',
            'billing_period_end',
            'due_date',
            'amount',
            'tax_amount',
            'payment_date',
            'payment_method',
            'payment_method_display',
            'status',
            'status_display',
            'notes',
            'receipt',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero")
        return value

    def validate(self, data):
        amount = data.get('amount', 0)
        tax_amount = data.get('tax_amount', 0)
        if tax_amount > amount:
            raise serializers.ValidationError({"tax_amount": "Tax amount cannot be greater than the total amount"})
        return data


class RecurringCostSerializer(serializers.ModelSerializer):
    """
    Serializer for RecurringCost model
    """
    cost_type_display = serializers.CharField(
        source='get_cost_type_display',
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )

    class Meta:
        model = RecurringCost
        fields = [
            'id',
            'cost_type',
            'cost_type_display',
            'name',
            'amount',
            'due_date',
            'payment_date',
            'payment_method',
            'status',
            'status_display',
            'notes',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero")
        return value

