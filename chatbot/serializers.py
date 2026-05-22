from rest_framework import serializers


class ChatbotMessageSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=['system', 'user', 'assistant'])
    content = serializers.CharField()


class ChatbotRequestSerializer(serializers.Serializer):
    message = serializers.CharField()
    history = serializers.ListSerializer(
        child=ChatbotMessageSerializer(),
        required=False,
        allow_empty=True,
    )
