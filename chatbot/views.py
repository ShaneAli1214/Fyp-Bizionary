from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

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
