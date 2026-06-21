import csv
from django.http import HttpResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from sales.models import Sale
from accounts.models import Expense
from products.models import Product
from .serializers import ChatbotRequestSerializer
from .services import generate_chatbot_response


@api_view(['POST'])
def chatbot_query(request):
    serializer = ChatbotRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'success': False, 'errors': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    message = serializer.validated_data['message']
    history = serializer.validated_data.get('history', [])

    try:
        response_text = generate_chatbot_response(message, history)
        return Response(
            {
                'success': True,
                'data': {
                    'message': message,
                    'response': response_text,
                    'history': history,
                },
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        return Response(
            {'success': False, 'error': str(exc)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(['GET'])
def download_report(request):
    report_type = request.GET.get('type', 'sales').lower()
    
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="bizionary_{report_type}_report.csv"'
    
    writer = csv.writer(response)
    
    if report_type == 'sales':
        writer.writerow([
            'Sale ID', 'Customer Name', 'Product Name', 'SKU', 
            'Quantity Sold', 'Unit Price', 'Total Price', 'Discount', 
            'Payment Status', 'Payment Method', 'Sale Date'
        ])
        sales = Sale.objects.select_related('product').all().order_by('-sale_date')
        for sale in sales:
            writer.writerow([
                sale.id,
                sale.customer_name,
                sale.product.name if sale.product else 'Unknown',
                sale.product.sku if sale.product else '',
                sale.quantity_sold,
                float(sale.unit_price),
                float(sale.total_price),
                float(sale.discount),
                sale.payment_status,
                sale.payment_method,
                str(sale.sale_date)
            ])
            
    elif report_type == 'expenses':
        writer.writerow([
            'Expense ID', 'Category', 'Amount', 'Vendor', 'Description', 'Date'
        ])
        expenses = Expense.objects.all().order_by('-date')
        for exp in expenses:
            writer.writerow([
                exp.id,
                exp.category,
                float(exp.amount),
                exp.vendor,
                exp.description,
                str(exp.date)
            ])
            
    elif report_type == 'inventory' or report_type == 'stock':
        writer.writerow([
            'Product ID', 'Name', 'SKU', 'Category', 'Stock Quantity', 
            'Min Stock', 'Cost Price', 'Unit Price', 'Status'
        ])
        products = Product.objects.all().order_by('name')
        for p in products:
            writer.writerow([
                p.id,
                p.name,
                p.sku,
                p.category,
                p.stock_quantity,
                p.min_stock,
                float(p.cost_price),
                float(p.unit_price),
                p.status
            ])
    else:
        return HttpResponse("Invalid report type. Allowed: sales, expenses, inventory.", status=400)
        
    return response

