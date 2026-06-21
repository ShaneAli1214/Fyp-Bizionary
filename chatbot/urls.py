from django.urls import path

from .views import chatbot_query, download_report

urlpatterns = [
    path('query/', chatbot_query, name='chatbot-query'),
    path('download-report/', download_report, name='download-report'),
]

