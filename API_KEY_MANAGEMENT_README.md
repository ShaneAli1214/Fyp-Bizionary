# Groq API Setup Guide

## Overview

The chatbot uses Groq API for AI responses. Groq provides fast, accurate AI inference through their free tier API. This guide explains how to set up and configure Groq for the chatbot.

## Features

- Fast AI responses through Groq API (free tier available)
- High-accuracy responses using Mixtral or Llama models
- Cloud-based, no local installation required
- Model selection through environment variables or Django settings
- Simple setup for development and production
- Automatic fallback to environment variables

## How to Use

### 1. Get a Groq API Key

1. Visit https://console.groq.com/
2. Create an account (free)
3. Generate an API key from the dashboard
4. Copy the API key (starts with `gsk_`)

### 2. Configure the App

Add the Groq API key to your `.env` file:

```bash
GROQ_API_KEY=gsk_your_api_key_here
GROQ_MODEL=llama3-70b-8192
```

Or set as environment variables:

```bash
export GROQ_API_KEY=gsk_your_api_key_here
export GROQ_MODEL=llama3-70b-8192
```

### 3. Test the Chatbot

1. Ensure Django server is running
2. Open the chatbot page in the frontend
3. Send a message
4. Verify that the response is returned by Groq

## API Endpoint

```text
POST /api/chatbot/query/
```

## Available Models

- `llama3-70b-8192` (recommended) - Most capable model
- `llama3-8b-8192` - Faster, smaller model
- `mixtral-8x7b-32768` - Multi-expert model

## Troubleshooting

### Unable to connect to Groq
- Ensure GROQ_API_KEY is set correctly in .env or environment
- Verify the API key is valid (starts with `gsk_`)
- Check your internet connection

### Invalid API key error
- Get a new API key from https://console.groq.com/
- Ensure the key is copied completely without extra spaces
- Restart the Django server after updating the key

### No response from the chatbot
- Check that GROQ_API_KEY is configured
- Restart the Django server
- Check the backend logs for connection errors
- Verify your Groq account has API access

## Security Notes

- Never commit your Groq API key to version control
- Use environment variables or .env file (add to .gitignore)
- Groq API keys have usage quotas; monitor your usage at https://console.groq.com/
- Use a model that fits your hardware

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Ollama documentation: https://ollama.com/docs
3. Check system logs
4. Contact the administrator
