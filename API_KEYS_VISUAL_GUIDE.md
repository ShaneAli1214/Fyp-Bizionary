# API Keys System - Visual Guide

## Navigation in Your App

### Where to Find API Keys Management

```
Dashboard
├── Sidebar (Left)
│   ├── Dashboard
│   ├── Products
│   ├── Sales
│   ├── Inventory Management
│   ├── Accounts
│   ├── AI Insights
│   ├── API Keys        ← 🔐 NEW! (Admin only)
│   └── User Management
│
└── Settings Menu
    └── API Keys        ← 🔐 Also accessible here
```

## Step-by-Step Guide

### How to Add Your API Key

#### Step 1: Navigate to API Keys
```
Open: http://localhost:5173/
↓
Click: Sidebar → API Keys (with Lock icon)
↓
You'll see: API Key Management page
```

#### Step 2: Add New Key
```
Click: "+ Add API Key" button
↓
Form appears:
┌─────────────────────────────────┐
│ Provider: OpenAI    (read-only) │
│                                 │
│ API Key: [_______________]      │
│          (copy from OpenAI)      │
│                                 │
│ ☑ Set as active configuration   │
│                                 │
│ [Add API Configuration]         │
└─────────────────────────────────┘
```

#### Step 3: Get Your OpenAI Key
```
1. Visit: https://platform.openai.com/api-keys
2. Sign in to your OpenAI account
3. Click: "Create new secret key"
4. Copy: The key (starts with sk-)
5. Paste: Into the form above
```

#### Step 4: Test Connection
```
Click: "Test Connection" button
↓
Wait: 2-3 seconds...
↓
Success! Message appears:
✓ API connection successful - Models available
```

#### Step 5: Start Using
```
Now you can:
1. Use the Chatbot (ask questions)
2. View AI Insights (analytics)
3. Get recommendations (AI-powered)
```

## Visual Workflow

### Adding a Key (Visual Flow)

```
                    ┌─────────────┐
                    │   YOU       │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Login       │ openai.com
                    │ ↓Get Key    │ Get "sk-..."
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
              ┌────▶│ Paste Key   │
              │     │ in Form     │
              │     └─────────────┘
              │
         Browser
         (localhost:5173)
              │
              ├─────────────────────────┐
              │                         │
         Click Button              Server
         "Add API Key"              (Django)
              │                         │
              ▼                         ▼
         ┌─────────────┐    ┌─────────────────┐
         │ Send Form   │───▶│ Validate Format │
         │ (POST)      │    │ + Save to DB    │
         └─────────────┘    └────────┬────────┘
                                     │
                            ┌────────▼────────┐
                            │ Success! ✓      │
                            │ Key Stored      │
                            │ + Cached        │
                            └─────────────────┘
```

### Using the Key (Visual Flow)

```
┌─────────────┐
│ You type    │
│ in chatbot  │
└──────┬──────┘
       │
       ▼
   ┌─────────────────────────────┐
   │ Frontend (React)            │
   │ Sends message to backend    │
   └──────┬──────────────────────┘
          │
          ▼ (POST /api/chatbot/query/)
   ┌─────────────────────────────┐
   │ Django Backend              │
   │ "Need to call OpenAI"       │
   └──────┬──────────────────────┘
          │
          ▼
   ┌─────────────────────────────┐
   │ get_active_api_key()        │
   │ Check cache? ← 1 hour cache │
   │ Check DB?                   │
   │ Check env vars?             │
   │ Found: "sk-..."             │
   └──────┬──────────────────────┘
          │
          ▼
   ┌─────────────────────────────┐
   │ Call OpenAI API             │
   │ model: gpt-3.5-turbo        │
   │ message: "Your message"     │
   │ key: "sk-..."               │
   └──────┬──────────────────────┘
          │
          ▼
   ┌─────────────────────────────┐
   │ Get AI Response             │
   │ "AI generated answer..."    │
   └──────┬──────────────────────┘
          │
          ▼
   ┌─────────────────────────────┐
   │ Return to Frontend          │
   │ Display in Chat             │
   └──────┬──────────────────────┘
          │
          ▼
   ┌─────────────────────────────┐
   │ You see:                    │
   │ 🤖 "AI response..."         │
   └─────────────────────────────┘
```

## UI Components

### API Key Management Page

```
╔══════════════════════════════════════════╗
║ 🔐 API Key Management                    ║
║ Manage your OpenAI API keys              ║
╠══════════════════════════════════════════╣
║                                          ║
║ ✓ API configuration updated successfully ║
║                                          ║
║ [+ Add API Key]  [Cancel]               ║
║                                          ║
║ ─────────────────────────────────────── ║
║ Form (if clicked):                       ║
║                                          ║
║ Provider:  [OpenAI (read-only)]         ║
║                                          ║
║ API Key:   [                          ] ║
║            Your API key is securely...  ║
║                                          ║
║ ☑ Set as active configuration            ║
║                                          ║
║ [  Add API Configuration  ]             ║
║ ─────────────────────────────────────── ║
║                                          ║
║ Active Configurations:                  ║
║                                          ║
║ ┌─ OpenAI ─────────────────────────┐   ║
║ │ ✓ Active                          │   ║
║ │ Key: ****XyZ1                     │   ║
║ │ Updated: 1/15/2024                │   ║
║ │                                   │   ║
║ │ [Test Connection] [Update] [Delete]   ║
║ └──────────────────────────────────┘   ║
║                                          ║
╚══════════════════════════════════════════╝
```

### Sidebar Navigation

```
╔════════════════════════════════╗
║ Bizionary                      ║
║ CRM Enterprise                 ║
╠════════════════════════════════╣
║                                ║
║ 📊 Dashboard                   ║
║ 📦 Products                    ║
║ 🛒 Sales                       ║
║ 📋 Inventory Management        ║
║ 💰 Accounts                    ║
║ 🧠 AI Insights                 ║
║ 🔐 API Keys         ← NEW!     ║
║ 👥 User Management             ║
║                                ║
╚════════════════════════════════╝
```

## Status Indicators

### Active Configuration
```
✓ Active
Green text + checkmark = Currently being used
```

### Inactive Configuration
```
Inactive
Gray text = Not being used
```

### Connection Status
```
✓ API connection successful - Models available
  = Connection working, ready to use

✗ Connection test failed
  = Connection broken, check key
```

## Data Flow Diagram

### System Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Internet                          │
│                (Your Connection)                     │
└───────┬────────────────────────────────────┬─────────┘
        │                                    │
        ▼                                    ▼
┌──────────────────────────┐      ┌────────────────────────┐
│  Your Browser            │      │  OpenAI API            │
│  (React App)             │      │  (gpt-3.5-turbo)       │
│  ┌──────────────────┐   │      │                        │
│  │ API Keys Page    │   │      │  Uses API key to       │
│  │ Chatbot Modal    │   │      │  process requests      │
│  │ Analytics Dash   │   │      │                        │
│  └────────┬─────────┘   │      │                        │
└───────────┼──────────────┘      └────────┬─────────────┘
            │ (HTTP/JSON)                 │ (API Call)
            ▼                             ▲
      ┌─────────────────────────────────┐
      │  Django Backend                 │
      │  (Port 8000)                    │
      │                                 │
      │  ┌──────────────────────────┐  │
      │  │ API Configuration Views  │  │
      │  │ - Add/Update/Delete Keys │  │
      │  │ - Test Connections       │  │
      │  └─────────┬────────────────┘  │
      │            │                    │
      │            ▼                    │
      │  ┌──────────────────────────┐  │
      │  │ Cache Layer (1 hour TTL) │  │
      │  │ - Stores active key      │  │
      │  │ - Fast lookup            │  │
      │  └─────────┬────────────────┘  │
      │            │                    │
      │            ▼                    │
      │  ┌──────────────────────────┐  │
      │  │ Database (SQLite)        │  │
      │  │ - APIConfiguration table │  │
      │  │ - Stores all keys        │  │
      │  │ - Audit timestamps       │  │
      │  └──────────────────────────┘  │
      │                                 │
      └─────────────────────────────────┘
```

## Error Scenarios

### Scenario 1: Wrong API Key Format

```
User Input:      "my-api-key-123"  (doesn't start with sk-)
                        ↓
         Validation fails!
                        ↓
         Error: "Invalid OpenAI API key format.
                 Should start with 'sk-'"
                        ↓
         User corrects and tries again
                        ↓
         Success! ✓
```

### Scenario 2: Connection Test Fails

```
User clicks:     "Test Connection"
                        ↓
         Tries to reach OpenAI...
                        ↓
         Failed (maybe network issue)
                        ↓
         Error: "Connection test failed: 
                 Network timeout"
                        ↓
         Check internet, retry
```

### Scenario 3: Key Expires

```
Old Key works initially
                        ↓
         User regenerates on openai.com
                        ↓
         Old key no longer works
                        ↓
         Chatbot shows:
         "OpenAI API key is not configured"
                        ↓
         User updates key via API Keys page
                        ↓
         Works again! ✓
```

## Key Storage Security

```
┌─────────────────────────────────────────┐
│      NOT SHOWN                          │
│  (Keys stored securely in DB)           │
└─────────────────────────────────────────┘

                    ▼

┌─────────────────────────────────────────┐
│      SHOWN (Masked)                     │
│  sk-...xyz  (only last 4 characters)    │
│  ****tGTl   (in update/list views)      │
└─────────────────────────────────────────┘

                    ▼

┌─────────────────────────────────────────┐
│      CACHED (Full, in memory)           │
│  sk-proj-... (1 hour cache only)        │
│  Never stored to file or disk           │
└─────────────────────────────────────────┘
```

---

## Quick Reference

| Action | Go To | Click | Result |
|--------|-------|-------|--------|
| Add key | API Keys page | + Add API Key | Form appears |
| Test key | API Keys page | Test Connection | ✓ Success or error |
| Update key | API Keys page | Update | Can change key |
| Delete key | API Keys page | Delete | Confirm removal |
| View all | API Keys page | (auto) | List of configs |
| Admin panel | /admin | Accounts → API Configs | Direct DB access |

---

**That's how the system works! 🎉**
