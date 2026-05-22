from django.shortcuts import render
from django.db.models import Sum, F, Q, OuterRef, Subquery
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from products.models import Product
from sales.models import Sale
from .models import Category, StockHistory, ProductImage
from .serializers import (
    ProductListSerializer, ProductDetailSerializer, 
    ProductCreateUpdateSerializer, CategorySerializer,
    StockHistorySerializer, ProductImageSerializer
)


@api_view(['GET', 'POST'])
def product_list_create(request):
    """
    GET: List all products with filters and search
    POST: Create new product
    """
    if request.method == 'GET':
        products = Product.objects.all()
        
        # Search by name, product code, or category
        search = request.query_params.get('search', None)
        if search:
            products = products.filter(
                Q(name__icontains=search) | 
                Q(sku__icontains=search) | 
                Q(category__icontains=search)
            )
        
        # Filter by category
        category = request.query_params.get('category', None)
        if category and category.lower() != 'all':
            products = products.filter(category__iexact=category)
        
        # Filter by stock status
        stock_status = request.query_params.get('stock', None)
        if stock_status:
            if stock_status.lower() == 'low':
                products = products.filter(stock_quantity__lte=F('reorder_level'))
            elif stock_status.lower() == 'out':
                products = products.filter(stock_quantity=0)
            elif stock_status.lower() == 'in_stock':
                products = products.filter(stock_quantity__gt=F('reorder_level'))
        
        # Annotate with total sales
        products = products.annotate(
            total_sales=Sum('sale__total_price')
        )
        
        # Ordering
        order_by = request.query_params.get('order_by', '-created_at')
        products = products.order_by(order_by)
        
        serializer = ProductListSerializer(products, many=True)
        return Response({
            'count': products.count(),
            'results': serializer.data
        })
    
    elif request.method == 'POST':
        serializer = ProductCreateUpdateSerializer(
            data=request.data,
            context={'user': request.user.username if request.user.is_authenticated else 'admin'}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
def product_detail(request, pk):
    """
    GET: Retrieve single product with all details
    PUT: Update product
    DELETE: Delete product
    """
    try:
        product = Product.objects.get(pk=pk)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = ProductDetailSerializer(product)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = ProductCreateUpdateSerializer(
            product, 
            data=request.data,
            context={'user': request.user.username if request.user.is_authenticated else 'admin'}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        product.delete()
        return Response({'message': 'Product deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
def product_stock_history(request, pk):
    """Get stock history for a specific product"""
    try:
        product = Product.objects.get(pk=pk)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
    
    history = StockHistory.objects.filter(product=product)
    serializer = StockHistorySerializer(history, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def categories_list(request):
    """List all product categories"""
    categories = Category.objects.all()
    serializer = CategorySerializer(categories, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def bulk_update_stock(request):
    """
    Bulk update stock quantities
    Expected format: [{"product_id": 1, "quantity": 100}, ...]
    """
    updates = request.data.get('updates', [])
    
    if not updates:
        return Response({'error': 'No updates provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    updated_products = []
    errors = []
    
    for update in updates:
        product_id = update.get('product_id')
        new_quantity = update.get('quantity')
        
        try:
            product = Product.objects.get(pk=product_id)
            old_quantity = product.stock_quantity
            
            product.stock_quantity = new_quantity
            product.save()
            
            # Create stock history
            StockHistory.objects.create(
                product=product,
                transaction_type='ADJUSTMENT',
                quantity_change=new_quantity - old_quantity,
                quantity_after=new_quantity,
                notes='Bulk update',
                created_by=request.user.username if request.user.is_authenticated else 'admin'
            )
            
            updated_products.append({
                'product_id': product_id,
                'name': product.name,
                'old_quantity': old_quantity,
                'new_quantity': new_quantity
            })
            
        except Product.DoesNotExist:
            errors.append(f"Product {product_id} not found")
        except Exception as e:
            errors.append(f"Error updating product {product_id}: {str(e)}")
    
    return Response({
        'updated': updated_products,
        'errors': errors,
        'total_updated': len(updated_products)
    })


@api_view(['GET'])
def product_search_suggestions(request):
    """Get search suggestions for autocomplete"""
    query = request.query_params.get('q', '')
    
    if len(query) < 2:
        return Response([])
    
    products = Product.objects.filter(
        Q(name__icontains=query) | Q(sku__icontains=query)
    )[:10]
    
    suggestions = [
        {'id': p.id, 'name': p.name, 'product_code': p.sku}
        for p in products
    ]
    
    return Response(suggestions)
