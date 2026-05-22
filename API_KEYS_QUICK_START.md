# Groq API Quick Start

## Quick Start

### For Users
1. Get a Groq API key from https://console.groq.com/ (free)
2. Add to `.env` file: `GROQ_API_KEY=gsk_your_key_here`
3. Restart Django backend
4. Open the chatbot in the browser
5. Send a message and confirm the response

### For Administrators

#### Backend Setup
- ✅ Switched chatbot service to Groq API
- ✅ Added Groq API key and model settings
- ✅ Updated Django settings with Groq configuration
- ✅ Installed groq Python library

#### Frontend Setup
- ✅ Chatbot page ready to use
- ✅ No additional frontend configuration needed
- ✅ Works out of the box with Groq API key

## Environment Variable Configuration

The backend requires:
```bash
GROQ_API_KEY=gsk_your_api_key_here
GROQ_MODEL=llama3-70b-8192
```

## Architecture

```
┌─────────────────────────────────────────────┐
│   User Interface (React)                    │
│   - Chatbot page                            │
│   - Ready to use                            │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│   Django Backend                            │
│   - chatbot/views.py                        │
│   - chatbot/services.py                     │
│   - GROQ_API_KEY / GROQ_MODEL settings      │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│   Groq Cloud API                            │
│   - https://api.groq.com                    │
│   - Fast inference                          │
│   - Free tier available                     │
└─────────────────────────────────────────────┘
```
┌─────────────────────────────────────────────┐
│   Ollama Local Service                      │
│   - http://localhost:11434                  │
│   - Local model inference                   │
└──────────────────────────────────────────────┘
```

## Next Steps

### Immediate
1. Install Ollama
2. Pull a model
3. Restart the Django server
4. Test the chatbot

### Optional Enhancements
- [ ] Support more local models
- [ ] Add model switching in the UI
- [ ] Add connection status indicator
- [ ] Add request timeout configuration

## Getting Help

1. **Documentation**: See [API_KEY_MANAGEMENT_README.md](./API_KEY_MANAGEMENT_README.md)
2. **Ollama Docs**: https://ollama.com/docs
3. **Service Status**: Confirm the local Ollama process is running
