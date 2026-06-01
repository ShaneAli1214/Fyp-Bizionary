# Bizionary ERP System

Bizionary is a full-stack ERP and operations platform built to manage sales, purchases, inventory, invoices, accounts, dashboards, and AI-assisted insights in one place. The project combines a Django REST backend with a modern React + Vite frontend so business workflows can be handled through both APIs and a browser-based UI.

## Project Highlights

- Inventory and product management across multiple product categories.
- Sales workflows with analytics and item tracking.
- Purchase management, including ordered slips and supplier handling.
- Invoice and accounts modules for finance-related operations.
- Dashboard endpoints for KPI-style reporting.
- Chatbot and insights services with AI integration.
- API key management for secure provider configuration.
- Frontend PDF generation for order-slip downloads.

## Tech Stack

### Backend
- Python 3
- Django 4.2
- Django REST Framework
- SQLite for local development
- CORS support for frontend integration
- OpenAI and Groq integrations for AI features

### Frontend
- React 19
- Vite
- React Router
- Tailwind CSS
- Axios
- Recharts / ECharts
- jsPDF and html2canvas for document export

## Core Modules

- `products` - product catalog and product-related APIs.
- `sales` - sales workflows and sales records.
- `purchases` - purchasing flows, company mapping, and ordered slips.
- `invoices` - invoice management.
- `accounts` - finance and API configuration utilities.
- `dashboard` - high-level KPI and summary endpoints.
- `chatbot` - AI chatbot service integration.
- `insights` - analytics and AI-powered insights.
- `user_management` - user-facing account and access features.
- `screen_2_sales_items` - sales and item-management screens and APIs.
- `bizionary-frontend` - React frontend application.

## What This Project Demonstrates

This repository shows end-to-end implementation skills across backend architecture, REST API design, frontend application development, business workflow modeling, and AI integration. It is particularly relevant for roles involving full-stack development, enterprise software, internal tools, dashboards, or ERP-style products.

## Repository Structure

```text
Fyp/
├── manage.py
├── requirements.txt
├── README.md
├── erp_system/
├── accounts/
├── chatbot/
├── dashboard/
├── insights/
├── invoices/
├── products/
├── purchases/
├── sales/
├── screen_2_sales_items/
├── user_management/
└── bizionary-frontend/
```

## Getting Started

### Prerequisites
- Python 3.10+ recommended
- Node.js 18+ recommended
- npm

### Backend Setup

1. Create and activate a virtual environment.
2. Install Python dependencies:

```bash
pip install -r requirements.txt
```

3. Run database migrations:

```bash
python manage.py migrate
```

4. Start the Django server:

```bash
python manage.py runserver 127.0.0.1:8000
```

### Frontend Setup

1. Move into the frontend directory:

```bash
cd bizionary-frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

## Environment Variables

The project reads configuration from environment variables when available. Common examples include:

- `GROQ_API_KEY`
- `GROQ_MODEL`
- `EMAIL_BACKEND`
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USE_TLS`
- `EMAIL_HOST_USER`
- `EMAIL_HOST_PASSWORD`
- `DEFAULT_FROM_EMAIL`

## API Overview

The backend exposes REST endpoints under routes such as:

- `/api/dashboard/`
- `/api/screen2/`
- `/api/accounts/`
- `/api/user-management/`
- `/api/chatbot/`
- `/api/insights/`
- `/api/invoices/`
- `/api/products/`
- `/api/purchases/`
- `/api/sales/`

## Utility Scripts

- Import a 30-day sales workbook into SQLite:

```bash
python scripts/import_sales_from_excel.py --workbook output/30day_sales_AlNoor_cleaned.xlsx
```

- Add `--dry-run` to validate the workbook without writing rows.
- Add `--replace-existing-imports` to clear rows created by the same invoice prefix before re-importing.

