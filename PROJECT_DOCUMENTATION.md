# PROJECT DOCUMENTATION: BIZIONARY ERP SYSTEM

### Final Year Project (FYP) Complete Technical Documentation & Systems Blueprint

---

## 1. Project Overview

### 1.1 Project Introduction

**Bizionary ERP** is a full-stack, enterprise-grade Enterprise Resource Planning (ERP) and business intelligence platform designed specifically to streamline operational workflows for Small and Medium Enterprises (SMEs). Unifying core corporate operations—including product catalogs, real-time inventory ledgers, multi-channel sales tracking, procurement workflows, client invoicing, double-entry financial accounting, and user-access management—Bizionary provides a centralized, secure repository. Furthermore, Bizionary embeds an agentic AI chatbot and predictive analytics services to assist managers in executing data-driven operations.

### 1.2 Problem Statement

Traditional SMEs rely on fragmented tools such as offline spreadsheets, isolated billing systems, and paper-based ledgers to manage their businesses. This fragmentation creates several operational challenges:

- **Data Silos & Redundancy:** Product catalog updates in inventory sheets are not synchronized with billing or purchases, leading to stock discrepancies.
- **Lack of Audit Trail:** Manual updates to sales logs lack immutability, making it difficult to trace accounting anomalies or unauthorized inventory adjustments.
- **No Real-Time Insights:** Decision-makers lack visibility into real-time key performance indicators (KPIs), cash flow metrics, or product-level demand velocity.
- **Manual Restocking Processes:** Reorder levels are typically checked manually, resulting in either costly overstocking or lost revenue due to stockouts.

### 1.3 Objectives

The primary objective of the Bizionary ERP system is to establish a secure, unified platform that automates core business workflows and supports decision-making through AI. The project aims to:

1.  **Consolidate Data:** Integrate sales, purchases, inventory, invoicing, and double-entry accounting into a single relational schema.
2.  **Automate Ingestion:** Develop a dynamic, month-flexible Excel parser that automatically processes monthly sales files from raw operational workbooks and aggregates them in the database.
3.  **Ensure Transactional Integrity:** Implement an event-driven system using database signals to ensure that any sale, return, purchase, or expense dynamically triggers the appropriate inventory adjustments, cash flow entries, and audit logs.
4.  **Incorporate Conversational AI:** Create an agentic chatbot using Groq and large language models (LLMs) to query the live database through dynamic function calling.
5.  **Expose Analytical Insights:** Build predictive analytical engines that utilize live data to estimate demand velocity, generate pricing optimization suggestions, and highlight smart reordering thresholds.
6.  **Secure API Keys:** Design a secure configuration manager allowing administrators to add, test, cache, and rotate third-party API keys dynamically through the web interface without restarting the application.

### 1.4 Key Features

- **Dynamic Dashboard:** Real-time KPI summaries, live cash flow metrics, period-filtered revenues, and interactive sales charts.
- **Product & Stock Management:** Complete CRUD capabilities, dynamic reorder warnings, automated stock ledger tracing, and bulk stock adjustments.
- **Procurement Workflow:** Supplier company registry, ordered slips management, automated delivery due-date alerts, and line-item receiving tracking.
- **Sales & Returns Ledger:** Invoicing tracking, sales returns handling, automatic cost-of-goods-sold (COGS) snapshots, and payment-method breakdown.
- **Double-Entry Accounting:** Multi-level Chart of Accounts (COA), journal entries, credit/debit balances, automated revenue/expense logging, and expense budget tracking with variance analysis.
- **AI Chatbot Assistant:** RAG-enabled chatbot utilizing Groq tool-use (function calling) to list low-stock items, summarize unpaid invoices, query sales trends, and output visual charts.
- **AI Analytics Engine:** Automated NLP reporting, pricing suggestions based on sales velocity, sentiment evaluation on customer feedback, and smart reordering quantity calculations.

### 1.5 Scope of the Project

The scope of Bizionary covers the operations of a single-tenant enterprise containing multiple administrative departments and staff roles. The system is designed to run locally using an optimized SQLite database for immediate developer bootstrap and is structured to scale to production environments using MySQL or PostgreSQL. Third-party integrations are limited to Groq and OpenAI APIs.

---

## 2. System Architecture

### 2.1 High-Level Architecture

Bizionary ERP follows a classic **3-Tier Client-Server Architecture** augmented with an external **Cognitive/AI Service Layer**.

```mermaid
flowchart TD
    subgraph Client Tier [Frontend Client - React]
        UI[Vite Single Page App]
        State[React Context / Custom Hooks]
        Chart[Recharts Graphics]
        Doc[PDF / Canvas Export]
    end

    subgraph Application Tier [Backend Server - Django REST]
        Router[API Gateway / DRF Routers]
        Controllers[API Viewsets & Views]
        Signals[Django Signals Event Router]
        Services[Business Logic Service Layer]
        Parser[Excel Ingestion Engine]
        Cache[API Key Caching Mechanism]
    end

    subgraph Database Tier [Relational Storage - SQLite]
        DB[(SQLite / MySQL / Postgres)]
        COA[Ledgers & Journal Tables]
        Inv[Product & Txn Tables]
        Aud[Audit Log Tables]
    end

    subgraph Cognitive Tier [External AI Providers]
        Groq[Groq Llama 3.3 API]
        OpenAI[OpenAI GPT Models]
    end

    %% Client and Backend Connection
    UI <-->|HTTPS REST Requests / JWT Auth| Router
    Router <--> Controllers
    Controllers <--> Services
    Services <--> Parser

    %% Event Signals and DB
    Controllers <--> DB
    Services <--> DB
    Signals -->|Atomic Updates| DB
    DB -.->|Signals Trigger| Signals

    %% API Keys and AI Connections
    Services <--> Cache
    Cache <--> DB
    Services <-->|Function Calling / JSON| Groq
    Services <-->|Completion Prompt / Context| OpenAI
```

### 2.2 Component Architecture

The system is divided into isolated components that interact using clear interfaces:

1.  **User Interface Component:** Composed of React functional views. It communicates with the backend exclusively using an asynchronous Axios client.
2.  **API Gateway / Router Component:** Django REST Framework routing engine that matches endpoints, handles CORS preflight requests, and validates token-based authentication headers.
3.  **Controller / Viewset Component:** Handles request deserialization, performs query logic, and serializes responses back to the client.
4.  **Signals Event Broker:** A synchronous event publisher-subscriber module. It captures changes in core business models (Sale, SaleReturn, Purchase, Expense, OrderedSlip) and triggers ledger updates.
5.  **Service Component Layer:** Houses complex algorithms, including database analytics aggregations, Excel processing, and AI function calling.
6.  **Data Access Component:** Managed by Django ORM to safely query data, enforce relational integrity, and perform transactional rollbacks.

### 2.3 Backend Architecture

The backend is built using Python 3 and Django 4.2. Main architecture highlights:

- **Modular Applications:** Features are divided into distinct Django apps (`products`, `sales`, `purchases`, `invoices`, `accounts`, `dashboard`, `chatbot`, `insights`, `user_management`) to isolate domains.
- **Django REST Framework (DRF):** Utilized to construct a stateless REST API, enforcing standard JSON responses.
- **Double-Entry Synchronization:** Financial entries are written using an atomic ledger logic. If any component of a transaction fails, database changes are automatically rolled back.
- **API Key Management:** A service layer resolves third-party provider keys from the database, caching them in memory for 1 hour to prevent redundant DB reads.

### 2.4 Frontend Architecture

The frontend is built as a single-page application (SPA) using React 19 and Vite.

- **Component Modularity:** UI elements are categorized into layouts (Sidebar, Navbar), shared components (Alert, Button, Modal, Spinner), and feature-specific pages.
- **State Hydration & Hooks:** Data is fetched using custom React hooks (e.g., `useSalesInsights`). Hooks encapsulate Axios calls, load states, error capture, and pagination contexts.
- **Responsive Design System:** Rendered using Tailwind CSS with custom CSS theme tokens, supporting dynamic screens from mobile drawers to widescreen monitors.
- **Data Visualization:** Utilizing Recharts to render stacked bar charts, linear trends, and pie chart breakdowns using live JSON responses.

### 2.5 Database Architecture

The schema follows a relational layout designed to minimize data duplication. To enforce consistency, key aggregates—such as product stock quantities, invoice outstanding balances, and cash flow totals—are managed as read-only computed properties or ledger-derived transactions.

### 2.6 Data Flow Diagrams

#### 2.6.1 Dynamic Sales Excel Ingestion & Ledger Updates

The sequence diagram below displays the ingestion of a monthly sales workbook:

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrator
    participant UI as React Dashboard
    participant View as Sales Sync View
    participant Service as Sales Import Service
    participant DB as SQLite DB
    participant Signals as Django Signals

    Admin->>UI: Click "Sync Sales Files"
    UI->>View: POST /api/sales/sync-excel/ {force: true}
    activate View
    View->>Service: sync_monthly_sales_files(force=True)
    activate Service
    Service->>Service: Scan output/ directory for *.xlsx
    Service->>Service: Match sheet & detect header rows
    Service->>Service: Parse SKU, Name, and date-like columns

    loop For each valid row with qty > 0
        Service->>DB: Query Product matching SKU/Name
        DB-->>Service: Return Product instance
        Service->>DB: Sale.objects.create(product, qty, date, total_price...)
        activate DB
        DB->>Signals: Emit post_save signal
        activate Signals

        Note over Signals: Atomically adjust inventories & cash flow
        Signals->>DB: Create InventoryTransaction (Stock Out)
        Signals->>DB: Create CashTransaction (Cash In - PAID)
        Signals->>DB: Create AuditLog (CREATE)

        Signals-->>DB: Signal actions complete
        deactivate Signals
        DB-->>Service: Return created Sale
        deactivate DB
    end

    Service-->>View: Ingestion statistics (created_count, skipped_count)
    deactivate Service
    View-->>UI: HTTP 200 OK {success: true, total_created: X}
    deactivate View
    UI-->>Admin: Show Success Toast "Imported X sales"
```

#### 2.6.2 Agentic Chatbot RAG Workflow

The sequence diagram below displays how the chatbot processes natural language questions:

```mermaid
sequenceDiagram
    autonumber
    actor User as Staff User
    participant UI as Chatbot UI
    participant View as Chatbot View
    participant Service as Chatbot Response Service
    participant Groq as Groq Llama 3.3 API
    participant DB as Database (via ORM)

    User->>UI: Type: "Find products with stock under 10"
    UI->>View: POST /api/chatbot/ask/ {message}
    activate View
    View->>Service: generate_chatbot_response(message)
    activate Service

    Service->>Service: Retrieve & cache active Groq key
    Service->>Service: Build messages list (system instructions + context)
    Service->>Groq: Chat Completion Request (Messages + CHATBOT_TOOLS schema)
    activate Groq

    Note over Groq: LLM reasons: "I need to call get_stock_alerts(threshold=10)"
    Groq-->>Service: Tool Call request: get_stock_alerts(threshold=10)
    deactivate Groq

    Service->>Service: Router maps tool name to execute_tool()
    Service->>DB: Query Product where stock_quantity <= 10
    activate DB
    DB-->>Service: Return raw Django QuerySet
    deactivate DB
    Service->>Service: Serialize QuerySet to JSON string

    Service->>Groq: Second Completion Request (Original query + Tool JSON result)
    activate Groq
    Groq-->>Service: Return synthesized text response
    deactivate Groq

    Service-->>View: Final text output
    deactivate Service
    View-->>UI: HTTP 200 OK {response: "..."}
    deactivate View
    UI-->>User: Render text & navigation links
```

#### 2.6.3 User Authentication & Role-Based Access Control Flow

The sequence diagram below displays the user authentication process and the role validation steps during API routing:

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Staff User
    participant UI as React SPA (Vite)
    participant Auth as Auth Router
    participant DB as SQLite DB
    participant RBAC as Permission Middleware
    participant Page as Admin Portal

    Staff->>UI: Input credentials (username, password)
    UI->>Auth: POST /api/user-management/login/ {username, password}
    activate Auth
    Auth->>DB: Query ERPUser matching username
    DB-->>Auth: Return user record & hashed password
    Auth->>Auth: Verify password match
    Auth-->>UI: Return JWT Token & User Profile (Role: MANAGER)
    deactivate Auth

    UI->>UI: Store Token in Context & sessionStorage
    Staff->>UI: Click "Manage Users" Link
    UI->>RBAC: GET /api/user-management/users/ (Bearer Token)
    activate RBAC
    RBAC->>DB: Verify Token & check permission level
    Note over RBAC, DB: Verify user has active ADMIN or MANAGER permission
    DB-->>RBAC: Return authorized role settings
    RBAC-->>UI: Return list of users (HTTP 200 OK)
    deactivate RBAC
    UI-->>Staff: Render User list dashboard
```

#### 2.6.4 Double-Entry Ledger Posting Flow

The sequence diagram below displays the accounting transaction posting logic when a customer records a payment against a pending invoice:

```mermaid
sequenceDiagram
    autonumber
    actor Accountant as Accountant User
    participant UI as React Accounts Page
    participant View as Invoice View
    participant Service as Accounting Service
    participant DB as SQLite DB
    participant Ledger as Ledger Accounts

    Accountant->>UI: Record payment on invoice (Rs. 50,000)
    UI->>View: POST /api/accounts/invoice-payments/ {invoice_id, amount: 50000}
    activate View
    View->>DB: Query Invoice balance_due & total
    DB-->>View: Return Invoice details
    View->>Service: post_double_entry_payment(invoice, amount)
    activate Service

    Service->>DB: Create JournalEntry ("Payment received against Invoice X")
    activate DB
    DB-->>Service: Return JournalEntry instance
    deactivate DB

    Note over Service, Ledger: Post balancing entries (Debit Cash, Credit Receivables)
    Service->>DB: Create JournalItem (Account: "Cash", Debit: 50000, Credit: 0)
    Service->>DB: Create JournalItem (Account: "Accounts Receivable", Debit: 0, Credit: 50000)

    Service->>DB: Create CashTransaction (txn_type='IN', amount=50000, source='invoice')

    Service->>DB: Update Invoice status and balance_due
    Service-->>View: Confirm posting balanced transaction
    deactivate Service

    View-->>UI: HTTP 201 Created {status: "PAID", balance_due: 0}
    deactivate View
    UI-->>Accountant: Refresh ledger grid & show success toast
```

#### 2.6.5 Procurement Ordered Slip Lifecycle

The sequence diagram below displays the lifecycle of a supplier purchase request slip from initial generation to final inventory receiving:

```mermaid
sequenceDiagram
    autonumber
    actor Buyer as Procurement Manager
    participant UI as React Stock Portal
    participant View as OrderedSlip View
    participant Mail as Email Mailer Service
    participant DB as Database (SQLite)
    participant Supplier as Supplier Company

    Buyer->>UI: Fill order form (Product: Refrigerator, Qty: 20)
    UI->>View: POST /api/purchases/ordered-slips/ {product_id, quantity: 20}
    activate View
    View->>DB: Save OrderedSlip (Status: PENDING, due_date: creation + 2 days)
    activate DB
    DB-->>View: Return OrderedSlip instance
    deactivate DB

    View->>Mail: send_procurement_email(slip_id)
    activate Mail
    Mail->>Supplier: Send Email (Details: product, quantity, unit_cost)
    Supplier-->>Mail: SMTP 250 OK (Received)
    Mail->>DB: Update OrderedSlip (email_status='SENT', email_sent_at=now)
    Mail-->>View: Email sent successfully
    deactivate Mail

    View-->>UI: HTTP 201 Created {slip_id, status: 'PENDING'}
    deactivate View
    UI-->>Buyer: Show "Order slip sent to supplier"

    Note over Buyer, Supplier: Stock arrives at warehouse 2 days later
    Buyer->>UI: Enter stock receipt (Received Qty: 20)
    UI->>View: POST /api/purchases/ordered-slips/{id}/receive/ {received_qty: 20}
    activate View
    View->>DB: Update OrderedSlip (status: COMPLETED, quantity_received: 20)

    Note over View, DB: Signals trigger inventory adjustment automatically
    View->>DB: Create InventoryTransaction (txn_type: 'IN', qty: 20, source: 'ordered_slip')
    View->>DB: Create Purchase record (to track financial payable)

    View-->>UI: HTTP 200 OK {status: 'COMPLETED'}
    deactivate View
    UI-->>Buyer: Display updated stock levels and closed slip
```

### 2.7 Request/Response Lifecycle

1.  **Action Trigger:** User triggers an event (e.g., records an expense).
2.  **API Call:** React component constructs a request payload and sends it via Axios: `POST /api/accounts/expenses/`.
3.  **Routing & Middleware:** Router captures the route. CORS middleware checks headers. Token authentication checks validity.
4.  **View Processing:** View validates parameters via DRF Serializers.
5.  **ORM Execution:** If valid, the serializer performs database insertion: `instance.save()`.
6.  **Signal Fire:** Database hooks catch the insertion, triggering post-save signals. Signals create `CashTransaction` (outflow) and `AuditLog` records in the database.
7.  **Response Return:** The view returns serialised JSON representation of the created expense with status `201 Created`.
8.  **Frontend Update:** React components catch the HTTP 201 response, update the local state array, recalculate totals, and clear loaders.

---

## 3. Complete Backend Documentation

### 3.1 Folder Structure Explanation

The Django project root is situated in `c:\Users\Dell\Desktop\Fyp` and contains the following files and directories:

- `manage.py`: Django command-line execution entry point.
- `requirements.txt`: Python package dependency list.
- `erp_system/`: Configuration root directory. Contains `settings.py` (configuration values, installed apps, middleware, DB connections), `urls.py` (root API routing mapping to apps), and `wsgi.py`/`asgi.py` (application server interfaces).
- `accounts/`: Handles Chart of Accounts (COA), Revenues, Expenses, Invoices (Finance App), budgets, and dynamic API Key configuration.
- `chatbot/`: Handles the AI RAG conversational service, including Groq wrappers, tool-calling maps, and system-prompt context.
- `dashboard/`: Exposes general analytical metrics, KPIs, and the system reset/seeding endpoint.
- `insights/`: Core analytical engine handling pricing suggestions, demand spikes, stock warnings, reviews sentiment, and smart reordering velocity.
- `invoices/`: Main billing application, tracking client data, payment statuses, balances, and invoice records.
- `products/`: Controls the central inventory product catalog, SKU matching, and inventory transaction ledger.
- `purchases/`: Manages procurement operations, supplier records, ordered slips, and receive workflows.
- `sales/`: Stores sales transactions, handles sales returns, and contains the Excel ingestion parser.
- `screen_2_sales_items/`: Exposes legacy views and analytical configurations matching specific screen grids.
- `user_management/`: Handles authentication policies, security limits, activity audit trails, and user role provisioning.

### 3.2 Module-by-Module Breakdown

#### 3.2.1 `accounts` Module

- **Models (`models.py`, `models_api_config.py`):**
  - `Account`: Chart of Accounts hierarchy.
  - `JournalEntry` & `JournalItem`: Double-entry accounting system tracking debits and credits.
  - `Revenue` & `Expense`: Financial registries.
  - `SalaryPayment`: For payroll details, linked to the `ERPUser` model.
  - `UtilityBill`: For tracking utility payments (Electricity, Water, Gas, etc.) including tax breakdown.
  - `RecurringCost`: For software subscriptions, office rent, ads, etc.
  - `ExpenseBudget`: Category-specific budgets comparing planned vs actual spend.
  - `InvoicePayment`: Instalment tracking against invoices to automatically calculate balance dues.
  - `APIConfiguration`: Encrypted database model storing API keys (OpenAI/Groq) for dynamic rotation.
- **Signals (`signals.py`):** Auto-creates cash outflow ledgers when an expense is recorded, and processes reversal records upon expense voiding.
- **Services (`services.py`):** Calculates gross profit, net profit, revenue margins, budget variance analysis, and accounts trends.
- **Views (`views.py`, `views_api_config.py`):** Serializes CRUD views and connection testing routes.

#### 3.2.2 `chatbot` Module

- **Services (`services.py`):**
  - **Groq Wrapper & Schema:** Integrates function mapping definitions and LLM query orchestration.
  - **Fuzzy Matching Engine:** Employs `difflib.get_close_matches` when exact queries fail (cutoff of `0.4` for search queries and `0.5` for sales creation) to map user input typos to active catalog names/SKUs.
  - **Conversational Confirmation Flow:** Implements multi-turn state rules in system prompts to draft orders first and request explicit user confirmation before executing transactional tools.
  - **History Memory Compression:** Implements background summary compilation using the Groq API model; when history exceeds `10` turns, older logs are compressed into a single system recap message while preserving the latest `4` turns.
- **Views (`views.py`):**
  - Exposes chatbot message querying endpoint (`/api/chatbot/query/`).
  - Exposes the NLP generated document streaming view (`download_report`) to generate and export dynamic CSV spreadsheets of sales, expenses, and inventory catalog.

#### 3.2.3 `dashboard` Module

- **Views (`views.py`):** Dynamic calculations of operational metrics (low-stock counts, pending payables, KPI totals) and database seeding scripts (`reset_system`).

#### 3.2.4 `insights` Module

- **Services (`services.py`):** Analytics computation:
  - `get_product_performance()`: Computes product velocity trends (hot vs cold products).
  - `get_pricing_suggestions()`: Calculates demand price optimizations.
  - `get_stock_warnings()`: Generates priority warnings for low items.
  - `get_smart_reorder_recommendations()`: Computes daily demand rates and reorder amounts.
  - `analyze_review_sentiment()`: Lexical evaluation of customer reviews.

#### 3.2.5 `invoices` Module

- **Models (`models.py`):** Outlines client billing invoices, payment statuses, and tax rates.

#### 3.2.6 `products` Module

- **Models (`models.py`):** Includes the primary `Product` table and the `InventoryTransaction` ledger.
- **Signals (`signals.py`):** Updates product stock quantities when inventory transactions are saved or deleted.

#### 3.2.7 `purchases` Module

- **Models (`models.py`):** Procurement registries: `Purchase`, `SupplierCompany`, `OrderedSlip`, `PurchaseLineItem`.
- **Signals (`signals.py`):** Updates stock and cash outflow logs on purchase item saves.

#### 3.2.8 `sales` Module

- **Models (`models.py`):** Outlines `Sale` records, cost margins, and `SaleReturn` transactions.
- **Services (`services.py`):** Houses `SalesImportService` to ingest monthly Excel files.

#### 3.2.9 `user_management` Module

- **Models (`models.py`):** Department layouts, Roles (ADMIN to VIEWER levels), ERP Users, and granular permission tables.

### 3.3 Business Logic Explanation

The business logic enforces the **Relational Ledger Principle**: no monetary or stock balance should be directly mutable. Instead:

1.  **Inventory Stock Balance:** The `Product.stock_quantity` is modified only by writing an `InventoryTransaction` ledger row (either type `IN` or `OUT`). Signals capture transaction savings and adjust the cached product count.
2.  **Cash Flow Balance:** Net cash flow is derived from the sum of inflows and outflows recorded in `CashTransaction`. Sales, returns, purchases, and expenses automatically publish transactions to this ledger via backend signals.
3.  **Accounts Receivable (AR) & Invoice Balances:** An invoice's balance is dynamically computed by subtracting the sum of associated `InvoicePayment` installments from the invoice total. When balance due hits zero, the status changes to `PAID`.

### 3.4 Service Layer Flow

The service layer implements specialized, non-CRUD algorithms:

```
[HTTP Request]
      ↓
[DRF View / Controller] (Validates parameters)
      ↓
[Service Class] (Executes business calculations, spreadsheet parses, or API calls)
      ↓
[Django ORM / Transactions / Third-Party APIs]
```

### 3.5 Database Interaction Flow

To prevent partial execution errors, complex operational sequences (such as importing Excel records) are wrapped inside Django's `transaction.atomic()` context. If any exception is raised, all database modifications in that block are rolled back.

### 3.6 API Architecture

The API is a stateful-authenticated REST API. It uses standard HTTP verbs:

- `GET`: Query and retrieve lists or detailed resources.
- `POST`: Create new resources or trigger actions (like file syncing).
- `PUT`/`PATCH`: Modify existing database rows.
- `DELETE`: Delete records from the system.

### 3.7 Authentication & Authorization Flow

Authentication is managed via HTTP Authorization headers.

1.  **Authentication Middleware:** Verifies the user credentials.
2.  **Permission Authorization:** Controls menu items and API access using role hierarchies:
    - `ADMIN`: Unrestricted system access, including API Key management and user administration.
    - `MANAGER`, `SUPERVISOR`, `STAFF`: Standard data logging access.
    - `VIEWER`: Read-only access across modules.

### 3.8 Error Handling Strategy

Exceptions are caught at the controller level using Python try-except blocks. They translate backend exceptions into clean, user-friendly JSON payloads:

```json
{
  "error": "Failed to compile sales insights: [detailed message]"
}
```

### 3.9 Data Validation Strategy

Validation is handled across three tiers:

1.  **Serializer Validation:** DRF serializers enforce data type structures, string limits, and decimal ranges.
2.  **Custom Format Checks:** For instance, `validate_api_key_format()` in `accounts/api_config_utils.py` ensures that keys start with the correct provider prefix (e.g., `sk-` for OpenAI/Groq).
3.  **Model Database Constraints:** Primary keys, foreign key protection, unique parameters, and field validators (e.g., quantities must be `MinValueValidator(1)`).

---

## 4. Complete Frontend Documentation

### 4.1 Folder Structure Explanation

The frontend resides in `c:\Users\Dell\Desktop\Fyp\bizionary-frontend` and follows a structured tree layout:

- `src/main.jsx`: System bootloader mounting the React application.
- `src/App.jsx`: Global router layout.
- `src/api/`: Placeholder for custom network utilities.
- `src/services/api.js`: Instantiates the Axios client, defines the base backend URL, and injects authentication headers.
- `src/context/`: Stores user session settings and authorization state.
- `src/hooks/`: Contains custom hooks that connect components to backend services.
  - `useSalesInsights.js`: Manages dashboard sales analytics periods and available months filter.
- `src/routes/AppRoutes.jsx`: Controls route mappings, mounting private routes based on roles.
- `src/components/`: Modular widgets.
  - `layout/`: Core UI architecture (Navbar, Sidebar).
  - `dashboard/`: Visual metrics components (KPI cards, SalesPerformanceChart).
- `src/pages/`: Main application portals (Dashboard, Accounts, Products, Stock, Sales, Create Order, Chatbot, Settings, User Management).
- `src/styles/`: Contains global reset files and Tailwind directives (`index.css`).
- `src/utils/`: Common formatting utilities (e.g., `currency.js` mapping Pakistani Rupee symbols `Rs.`).

### 4.2 Component Architecture

The visual system utilizes **Container-Presenter Architecture**. Page containers (e.g., `Dashboard.jsx`) fetch state using hooks and manage modal actions. They pass datasets to pure presentation components (e.g., `SalesPerformanceChart.jsx`) as read-only React properties (`props`), making charts easy to update and test.

### 4.3 State Management Flow

Frontend state is managed locally via React hooks:

- `useState`: Controls modal visibilities, active filters, form inputs, and fetch loadings.
- `useEffect`: Synchronizes backend state. For instance, the Dashboard queries the backend every 10 seconds to keep KPIs fresh.
- `useMemo`: Optimizes rendering of category maps and sorting results to avoid recalculations.

### 4.4 API Integration Flow

The Axios interface executes asynchronous operations:

```javascript
import axios from "axios";
const api = axios.create({
  baseURL: "http://localhost:8000/api/",
});
```

It handles response structures, intercepting failures and bubbling error details up to the React components.

### 4.5 Page-by-Page Explanation

- **Auth Portal:** Handles user login and registration, storing session details in state.
- **Dashboard Page:** Renders KPI summary cards and mounts quick operation forms.
- **Accounts Portal:** Features tab interfaces for Revenues, Expenses, Invoices, and Financial Reports (Income Statement, Cash Flow, Balance Sheets).
- **Products Page:** Displays the product catalog, handles search queries, and controls inventory updates.
- **Stock Ledger:** Tracks stock transactions, low stock items, and triggers reorder slips.
- **Sales Page:** Lists sales logs, handles product returns, and filters transactions by period.
- **Create Order Page:** Manages procurement ordered slips, updates received stock levels, and logs supplier payables.
- **AI Chatbot Portal:** Provides a conversational interface, compiling message histories and rendering tables or charts using structured JSON responses.
- **Settings Portal (API Keys Page):** Allows administrators to add, update, delete, and test OpenAI and Groq API keys dynamically.
- **User Management Portal:** Displays user accounts, provisions staff, assigns security rules, and audits activity logs.

### 4.6 Dashboard Logic

The dashboard consolidates operational KPIs, displaying current numbers for total revenue, product quantities, ordered slips, and inventory values. Clicking KPI action buttons opens edit portals (e.g., `RecordModal`, `ProductForm`) to modify database tables without redirecting.

### 4.7 Charts and Analytics Flow

The Sales Performance Chart is driven by a dropdown period filter (Daily, Weekly, Last 10 Days, Monthly, All Data):

1.  **Filter Change:** The user updates the dropdown selector.
2.  **API Trigger:** The `useSalesInsights` hook detects the filter change and calls the backend: `GET /api/dashboard/sales-by-period/?period=monthly`.
3.  **Dropdown Hydration:** In the Monthly view, the backend returns a list of unique months (`availableMonths`) found in the database. The frontend renders a secondary dropdown to select the specific month (e.g., "April 2026"), triggering a sub-query.
4.  **Chart Render:** Once the dataset loads, the frontend parses the categories and renders Recharts bar or area graphs.

### 4.8 User Interaction Flow

```
[User Action] ──> [State Set: loading=true] ──> [Axios Fetch API]
                                                      │
                                           ┌──────────┴──────────┐
                                           ▼                     ▼
                                    [HTTP 200/201]         [HTTP 400/500]
                                           │                     │
                                   [Update State Data]    [Set Error Message]
                                           │                     │
                                           └──────────┬──────────┘
                                                      ▼
                                         [State Set: loading=false]
```

---

## 5. Database Documentation

### 5.1 Entity Relationship Diagram

```mermaid
erDiagram
    Product ||--o{ Sale : "sells"
    Product ||--o{ SaleReturn : "returns"
    Product ||--o{ InventoryTransaction : "tracks"
    Product ||--o{ Purchase : "purchases"
    Product ||--o{ PurchaseLineItem : "contains"
    Product ||--o{ OrderedSlip : "procures"

    Sale ||--o{ SaleReturn : "reverses"
    Purchase ||--o{ PurchaseLineItem : "lines"
    Invoice ||--o{ InvoicePayment : "receives"

    Account ||--o{ JournalItem : "records"
    JournalEntry ||--o{ JournalItem : "contains"
    JournalEntry ||--o{ Revenue : "general"
    JournalEntry ||--o{ Expense : "general"
    JournalEntry ||--o{ Invoice : "general"

    SupplierCompany ||--o{ Product : "supplies"

    ERPUser ||--o{ ActivityLog : "logs"
    ERPUser ||--o{ UserInvite : "invites"
    ERPUser ||--o{ Permission : "has"
    ERPUser ||--o{ SecuritySetting : "secures"
    Department ||--o{ ERPUser : "employs"
    Role ||--o{ ERPUser : "assigns"
    Module ||--o{ Permission : "modules"
```

### 5.2 Table Descriptions

#### 5.2.1 Core Inventory & Sales Tables

- **`products` Table:**
  - `id` (Integer, Primary Key)
  - `name` (Varchar, Product description name)
  - `sku` (Varchar, Unique item SKU code, Indexed)
  - `cost_price` (Decimal, Procurement unit price)
  - `unit_price` (Decimal, Sale retail unit price)
  - `stock_quantity` (Integer, Current stock level)
  - `min_stock` (Integer, Reorder alert threshold)
  - `supplier_id` (FK to `supplier_companies`, Nullable)
  - `status` (Varchar, ACTIVE or INACTIVE)
- **`sales` Table:**
  - `id` (Integer, Primary Key)
  - `product_id` (FK to `products`)
  - `customer_name` (Varchar)
  - `quantity_sold` (Integer)
  - `unit_price` (Decimal)
  - `unit_cost_price` (Decimal, snapshot of product cost at time of sale)
  - `total_price` (Decimal, total revenue)
  - `sale_date` (Date, Indexed)
  - `invoice_number` (Varchar, unique transaction reference)
  - `payment_status` (Varchar, PAID/PENDING/FAILED)
  - `payment_method` (Varchar, CASH/CARD/etc.)
- **`sales_returns` Table:**
  - `id` (Integer, Primary Key)
  - `sale_id` (FK to `sales`)
  - `product_id` (FK to `products`)
  - `quantity_returned` (Integer)
  - `refund_amount` (Decimal)
  - `return_date` (Date)
- **`inventory_transactions` Table:**
  - `id` (Integer, Primary Key)
  - `product_id` (FK to `products`)
  - `txn_type` (Varchar, IN/OUT/ADJUSTMENT)
  - `quantity` (Integer)
  - `reference_type` (Varchar, e.g., 'sale', 'purchase', 'adjustment')
  - `reference_id` (Integer, ID of reference row)
  - `date` (Date)

#### 5.2.2 Procurement Tables

- **`supplier_companies` Table:** Holds vendor business records (`name`, `category`, `contact_number`, `email`).
- **`purchases` Table:** Records procurement items received from suppliers (`product_id`, `quantity_purchased`, `unit_cost`, `total_cost`, `purchase_date`, `payment_status`).
- **`purchase_line_items` Table:** Maps items inside a multi-product purchase order.
- **`ordered_slips` Table:** Tracks purchase order requests sent to suppliers (`product_id`, `quantity_ordered`, `quantity_received`, `unit_cost`, `total_cost`, `status`, `due_date`).

#### 5.2.3 Finance & Invoicing Tables

- **`invoices` Table (Billing App):** Client billing ledger details (`invoice_number`, `customer_name`, `invoice_date`, `due_date`, `subtotal`, `total_amount`, `amount_paid`, `status`).
- **`accounts_coa_account` Table:** Stores the Chart of Accounts hierarchy.
- **`accounts_journal_entry` & `accounts_journal_item` Tables:** Double-entry journal entries recording credits and debits.
- **`screen4_revenue` & `screen4_expense` Tables:** Income and expense tracking.
- **`cash_transactions` Table:** Immutable cash flow transactions ledger (`txn_type` IN/OUT, `amount`, `source_type`, `source_id`, `date`).
- **`audit_log` Table:** Tracks database operations (CREATE, UPDATE, DELETE, VOID).
- **`expense_budgets` Table:** Departmental expense category budgets (`category`, `period_type`, `year`, `month`, `budgeted_amount`).
- **`invoice_payments` Table:** Logs invoice payment installments.

#### 5.2.4 User Management Tables

- **`user_mgmt_department` & `user_mgmt_role` Tables:** Organizational departments and roles.
- **`user_mgmt_erpuser` Table:** User profiles extending Django's auth model.
- **`user_mgmt_permission` Table:** Module-level access rights.
- **`user_mgmt_activitylog` Table:** Logs system activities (LOGIN, LOGOUT, EXPORT).
- **`user_mgmt_userinvite` Table:** Manages pending user invitations.

#### 5.2.5 Configuration Tables

- **`accounts_apiconfiguration` Table:** Stores API settings (`provider` OpenAI/Groq, `api_key`, `is_active`).

### 5.3 Constraints

- **Uniqueness:** Unique SKU codes in `products`, unique invoice numbers in `invoices`, and unique provider designations in `apiconfiguration`.
- **Foreign Key Actions:** Uses `on_delete=models.PROTECT` on critical operational models (such as products in sales or purchases) to prevent deleting items with transactional history.

### 5.4 Indexing Strategy

To optimize query performance, database indexes are set on columns frequently used in search queries, sorting operations, and join clauses:

- `products`: Index on `sku`, `category`, and `stock_quantity`.
- `sales`: Index on `sale_date` (for chronological filtering) and `product`.
- `cash_transactions`: Compound index on `(txn_type, date)` to accelerate cash flow queries.
- `audit_log`: Index on `(entity_type, entity_id)` to speed up change history searches.

---

## 6. End-to-End Data Flow

The operational data flow follows a structured path from import ingestion to frontend visualization:

```
[Excel File Uploaded]
        │
        ▼
[SalesImportService parses rows] ──(Validates SKU & non-zero Qty)──> [Insert Sale Row]
                                                                          │
                                                                 (Signal Triggers)
                                                                          │
                                           ┌──────────────────────────────┴──────────────────────────────┐
                                           ▼                                                             ▼
                             [InventoryTransaction Created]                                 [CashTransaction Created]
                                           │                                                             │
                                   (Updates Stock)                                               (Logs Cash flow)
                                           │                                                             │
                                           └──────────────────────────────┬──────────────────────────────┘
                                                                          ▼
                                                            [Database Stores Transaction]
                                                                          │
                                                                    (REST Query)
                                                                          │
                                                                          ▼
                                                            [API: sales-by-period/]
                                                                          │
                                                                    (JSON Payload)
                                                                          │
                                                                          ▼
                                                             [Frontend Hook Renders UI]
```

### 6.1 Step 1: File Storage (`output/` folder)

- **Action:** A monthly sales Excel workbook (e.g., `AlNoor_April_2026.xlsx`) is dropped in the `output/` directory.

### 6.2 Step 2: Processing (`SalesImportService`)

- **Detection:** The import view scans the directory and runs the parser service.
- **Target Selection:** The parser identifies columns matching parameters (e.g., `sku`, `qty`, `sale price`).
- **Column Reading:** It scans row values, identifying columns containing date values.

### 6.3 Step 3: Validation & Database Storage

- **Product Matching:** For each row, the parser queries the database by SKU: `Product.objects.get(sku=sku_val)`. If not found, it checks by name, skipping the row if no match exists.
- **Data Validation:** The parser validates the row metrics:
  - Quantity must be an integer > 0.
  - Unit price must be a valid decimal.
  - The date column header is parsed into a `YYYY-MM-DD` date object.
- **Transactional Ingestion:** Verified rows are written to the database using `Sale.objects.create()`.

### 6.4 Step 4: Django Signals Lifecycle

Saving the `Sale` object triggers the post-save signal `sale_post_save`:

- **Inventory Ledgers:** Automatically records a stock deduction transaction: `InventoryTransaction(txn_type='OUT', quantity=quantity_sold)`. This action dynamically updates `Product.stock_quantity`.
- **Cash Ledgers:** If marked `PAID`, a cash receipt is logged: `CashTransaction(txn_type='IN', amount=total_price)`.
- **Audit Trail:** Logs the database operation: `AuditLog(action='CREATE', entity_type='Sale')`.

### 6.5 Step 5: Backend API Aggregations

When the user visits the Dashboard, the frontend queries: `GET /api/dashboard/sales-by-period/?period=monthly&month=2026-04`.

- **Database Query:** The view retrieves the transactions: `Sale.objects.filter(sale_date__range=(start_date, end_date))`.
- **Data Aggregation:** The view aggregates the monthly sales statistics:
  - `total_sales_amount` = `Sum('total_price')`
  - `total_quantity` = `Sum('quantity_sold')`
  - `total_profit` = `Sum('total_price' - ('quantity_sold' * 'product__cost_price'))`
- **Grouping:** Categorizes sales by product category, returning structured JSON containing chart points and summaries.

### 6.6 Step 6: Frontend Consumption & Reports

- **State Update:** The frontend hook catches the JSON payload, updating the React state.
- **Chart Render:** Recharts processes the JSON, rendering interactive graphs.
- **Document Export:** Users can export invoice receipts by clicking "Export PDF", which triggers jsPDF to render print-ready documents.

---

## 7. Dynamic Processing Logic

### 7.1 Auto-Detection of Monthly Sales Files

The Excel parsing system in `SalesImportService.sync_monthly_sales_files()` eliminates the need for manual file uploads:

- **Directory Scan:** The backend uses Pathlib to scan the `output/` directory for Excel workbooks: `output_dir.glob('*.xlsx')`.
- **Temp Filter:** Filter checks exclude temporary or hidden files starting with `~$` to prevent read errors.
- **Incremental Imports:** For each file, the system checks for existing invoice numbers starting with a prefix derived from the filename (e.g., `XLSX-ALNOOR-ALNOOR_JANUARY_2026-`). If a match is found, the file is skipped unless the `force` parameter is set to true.

### 7.2 Automatic Database Updates

The parser parses the sheets, identifies the correct headers, and updates the database:

- **Sheet Autoconfig:** The parser searches for sheets named 'Sales Data', or containing 'sales' or 'data', falling back to the first sheet if none are found.
- **Header Scanning:** The parser scans row rows, looking for index headers containing keywords like SKU or Product Code.
- **Dynamic Data Ingestion:** Sales figures are matched dynamically by scanning column headers for date formats (e.g., `2026-04-01`). The system reads column values, creating corresponding database records for values > 0.

### 7.3 Dynamic Month Handling & Future-Proof Design

The system uses **Time-Aware Column Mapping** rather than relying on static structures:

- **No Hardcoded Months:** The parser reads date values directly from the column headers, adapting dynamically to new workbooks.
- **Auto-Syncing:** Ingested files are assigned a unique prefix derived from their filename. If an import is forced, the system clears old records matching the prefix before re-importing, preventing duplicate entries.

### 7.4 Dynamic Expense Ledger Integration

To support salaries, utilities, and operating overheads dynamically:

- **Domain-Specific Models:** `SalaryPayment`, `UtilityBill`, and `RecurringCost` are modeled independently to track field-specific inputs (e.g., payroll departments, utility tax breaks, recurring intervals).
- **Generic Relations:** These domain tables link back to the core central `Expense` table using Django's Generic Foreign Keys (`content_type`, `object_id`) and a `metadata` JSON field.
- **Status-Driven Synchronization:** Django database signals monitor saving/deletion of domain rows:
  - On transitions to `PAID`, they dynamically compile matching central `Expense` entries, cash flow transactions (`CashTransaction` type `OUT`), and ledger journal entries (balanced debit/credits).
  - On reversion to `PENDING` or `UNPAID` (or deletion), the signal logic dynamically cleans up and reverses all ledger debit/credits and cash outflows.

### 7.5 Procurement Ordered Slip Lifecycle and Purchase Matching

To keep inventory and financial statements in sync without duplicate or premature ledger entries:

- **Decoupled Ordered Slips:** Purchase order request slips are logged as `OrderedSlip` instances. Seeding processes do not contain static purchase records.
- **Dynamic Purchase Creation:** Financial `Purchase` entries are created dynamically in the database _only_ when the warehouse completes receiving the inventory (i.e. the `OrderedSlip` transitions to `COMPLETED` status).
- **Event-Driven Stock Ledger:** The completion event dynamically triggers the stock ledger (`InventoryTransaction` type `IN`) and logs the financial payable record in the central ledger accounts automatically.
- **Normalized Category-Based Supplier Matching:** In the order slip creation UI, supplier companies are dynamically filtered and matched to product categories. Since database category naming structures (e.g., `'Computers'`, `'Electronics'`, `'Pharma'`) might differ from user-facing category options (e.g., `'Tech'`, `'Medicines'`), a robust normalization layer (`companyMatchesCategoryId` using `normalizeProductCategory`) maps related categories to their respective suppliers seamlessly, supporting both seeded and custom user-created categories.

---

## 8. API Documentation

### 8.1 List/Create API Keys Configuration

- **Endpoint:** `GET /api/accounts/api-configuration/`
- **Purpose:** Retrieves a list of active API keys.
- **Parameters:** None (requires Admin status).
- **Response Structure (200 OK):**
  ```json
  [
    {
      "id": 1,
      "provider": "groq",
      "api_key": "******************tile",
      "is_active": true,
      "created_at": "2026-06-19T18:56:00Z",
      "updated_at": "2026-06-19T18:56:00Z"
    }
  ]
  ```

### 8.2 Add API Key Configuration

- **Endpoint:** `POST /api/accounts/api-configuration/`
- **Purpose:** Adds a new API key to the database.
- **Request Parameters:**
  ```json
  {
    "provider": "groq",
    "api_key": "sk-proj-...",
    "is_active": true
  }
  ```
- **Validation Rules:** The key is checked using `validate_api_key_format()`, ensuring it starts with the correct provider prefix.
- **Response Structure (201 Created):**
  ```json
  {
    "id": 2,
    "provider": "groq",
    "api_key": "*****************proj",
    "is_active": true,
    "created_at": "2026-06-20T00:44:00Z",
    "updated_at": "2026-06-20T00:44:00Z"
  }
  ```
- **Error Response (400 Bad Request):**
  ```json
  {
    "api_key": ["API key must start with 'sk-'"]
  }
  ```

### 8.3 Test API Key Connection

- **Endpoint:** `POST /api/accounts/api-configuration/test_connection/`
- **Purpose:** Tests the validity of an API key configuration.
- **Request Parameters:** None.
- **Response Structure (200 OK):**
  ```json
  {
    "status": "success",
    "message": "API connection successful",
    "models_available": ["llama-3.3-70b-versatile"]
  }
  ```

### 8.4 Sync Monthly Sales Files

- **Endpoint:** `POST /api/sales/sync-excel/`
- **Purpose:** Triggers a scan of the `output/` folder and imports monthly sales data.
- **Request Parameters:**
  ```json
  {
    "force": true
  }
  ```
- **Response Structure (200 OK):**
  ```json
  {
    "success": true,
    "total_created": 150,
    "total_skipped": 450,
    "details": [
      {
        "filename": "AlNoor_April_2026.xlsx",
        "status": "SUCCESS",
        "created_records": 150,
        "skipped_zero_quantity": 450,
        "missing_products": [],
        "deleted_previous": 150
      }
    ]
  }
  ```

### 8.5 Ask Chatbot

- **Endpoint:** `POST /api/chatbot/query/`
- **Purpose:** Sends a question to the chatbot.
- **Request Parameters:**
  ```json
  {
    "message": "What is the total value of products in stock?",
    "history": []
  }
  ```
- **Response Structure (200 OK):**
  ```json
  {
    "response": "The total value of products in stock is Rs 1,450,000 across 31 registered items."
  }
  ```

### 8.7 Download Chatbot Report

- **Endpoint:** `GET /api/chatbot/download-report/`
- **Purpose:** Streams a dynamically generated CSV spreadsheet of requested business data.
- **Request Parameters (Query Params):**
  - `type` (string, required, e.g., `sales`, `expenses`, or `inventory`)
- **Response Structure (200 OK):**
  - Returns a direct CSV file stream:
  ```text
  Sale ID,Customer Name,Product Name,SKU,Quantity Sold,Unit Price,Total Price,Discount,Payment Status,Payment Method,Sale Date
  97706,AlNoor Trading,Calculator Scientific,CALCSC,4,2700.0,10800.0,0.0,PAID,CASH,2026-06-30
  ```

### 8.6 Sales by Period

- **Endpoint:** `GET /api/dashboard/sales-by-period/`
- **Purpose:** Retrieves sales data aggregated by period (daily, weekly, monthly, last10Days).
- **Request Parameters:**
  - `period` (string, optional, e.g., "monthly")
  - `month` (string, optional, YYYY-MM format, e.g., "2026-04")
- **Response Structure (200 OK):**
  ```json
  {
    "period": "monthly",
    "periodLabel": "Monthly (April 2026)",
    "dateContext": "April 01 - April 30, 2026",
    "xAxisType": "week",
    "xAxisLabel": "Weeks of the month",
    "totalSalesAmount": 1250000.0,
    "totalProfit": 350000.0,
    "totalQuantity": 450,
    "categories": [
      {
        "name": "Electronics & Applications",
        "key": "electronics_appliances",
        "color": "#0A6ED1",
        "quantitySold": 200,
        "revenue": 800000.0,
        "profit": 224000.0,
        "subcategories": []
      }
    ],
    "chartData": [
      {
        "period": "Week 1",
        "electronics_appliances": 50,
        "electronics_appliances_revenue": 200000.0,
        "revenue": 200000.0,
        "profit": 56000.0
      }
    ],
    "availableMonths": [
      {
        "key": "2026-04",
        "label": "April 2026"
      }
    ]
  }
  ```

---

## 9. Project Workflow

The following steps outline the complete operational workflow from startup to user interaction:

```
[1. Backend Bootstrapped] ──> [2. Database Migrated] ──> [3. Real Data Populated]
                                                                 │
                                                       (Start Web Servers)
                                                                 │
                                                                 ▼
[4. Frontend Mounted] ──(Axios Queries KPIs)──> [5. Dashboard Renders UI]
                                                         │
                                                  (User Input)
                                                         │
                                                         ▼
[6. Add Product / Sync Excel] ──(Triggers Signals)──> [7. Ledgers Updated]
                                                         │
                                                 (Chatbot Request)
                                                         │
                                                         ▼
[8. Ask Assistant] ──(Dynamic Tool Call)──> [9. Synthesised Answer Returned]
```

### 9.1 Step 1: Backend Bootstrap

- The developer starts the virtual environment and installs dependencies: `pip install -r requirements.txt`.
- The database is initialized by running migrations: `python manage.py migrate`.
- API tables, accounts, products, and procurement modules are initialized.

### 9.2 Step 2: Database Population & Sales File Syncing

- The developer runs the database populator script: `python populate_real_data.py`.
- This script seeds supplier records, registers products, adds sample invoices, and calls the Excel parser service to process workbooks in the `output/` directory.

### 9.3 Step 3: Frontend Mounting

- The developer starts the development server: `npm run dev`.
- Vite compiles assets, mounts routes, and serves the UI on port 5173.

### 9.4 Step 4: User Authentication

- The user accesses the portal and logs in. Successful login returns an authentication token and role information (e.g., `ADMIN`).

### 9.5 Step 5: Dashboard Loading

- React loads the page container, calling hooks to query the APIs:
  - `GET /api/dashboard/kpis/`: Fetches KPI values.
  - `GET /api/dashboard/sales-by-period/?period=last10Days`: Fetches analytical metrics.
- The screen updates, rendering KPI cards and graphs.

### 9.6 Step 6: Operating the System

- **Adding a Product:** An administrator clicks "+ Add Product". The backend checks role permissions, validates parameters, inserts the row, and updates dashboard metrics.
- **Syncing Excel:** A manager drops a new workbook in the `output/` folder and clicks "Sync Sales Files". The backend processes the file, updating inventory levels and accounting ledgers dynamically.

### 9.7 Step 7: Chatbot Querying

- The user opens the chatbot and asks: _"Which products are low on stock?"_
- The chatbot service routes the request to Groq, triggers the `get_stock_alerts` tool, queries the database, and returns the list of low-stock items.

---

## 10. Deployment Guide

### 10.1 Environment Setup

Deployment requires the following minimum system specifications:

- **Operating System:** Windows Server 2019+ or Linux (Ubuntu 22.04 LTS recommended).
- **Python:** Version 3.10 or 3.11.
- **NodeJS:** Version 18 or 20 (with npm package manager).
- **Database:** SQLite (default for development/testing), MySQL 8.0+ or PostgreSQL 15+ (recommended for production).

### 10.2 Dependencies Installation

1.  Clone the repository to the production server.
2.  Install backend dependencies:
    ```bash
    python -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    ```
3.  Install frontend dependencies:
    ```bash
    cd bizionary-frontend
    npm install
    ```

### 10.3 Configuration (`.env` file)

Create a `.env` configuration file in the project root:

```ini
DEBUG=False
SECRET_KEY=production-secret-hash-value
ALLOWED_HOSTS=erp.bizionary.com,127.0.0.1
DATABASE_URL=mysql://db_user:password@localhost:3306/bizionary_db
GROQ_MODEL=llama-3.3-70b-versatile
```

### 10.4 Build Process

Build the frontend distribution files:

```bash
cd bizionary-frontend
npm run build
```

This command compiles the source code into static assets inside `bizionary-frontend/dist/`.

### 10.5 Deployment Process

1.  **Run Database Migrations:**
    ```bash
    python manage.py migrate
    ```
2.  **Collect Static Assets:**
    ```bash
    python manage.py collectstatic --noinput
    ```
3.  **Configure Application Server:**
    Configure a WSGI application server (such as Gunicorn) to serve the backend.
4.  **Configure Reverse Proxy (Nginx):**
    Configure Nginx to route traffic, serving frontend assets directly and proxying API calls to Gunicorn.
5.  **Enable SSL (HTTPS):**
    Install Certbot to secure API endpoints and user sessions:
    ```bash
    sudo certbot --nginx -d erp.bizionary.com
    ```

---

## 11. Future Enhancements

### 11.1 Scalability Opportunities

- **Database Migration:** Swap the local SQLite instance to a clustered PostgreSQL database to support high-concurrency writes.
- **Asynchronous Tasks (Celery + Redis):** Move Excel file parsing and AI processing to background worker queues to prevent HTTP timeouts.
- **Microservices Routing:** Isolate analytical reporting modules and AI chatbot microservices into separate containers to balance server loads.

### 11.2 Performance Improvements

- **Caching Layer (Redis):** Cache expensive analytics queries (such as sales by period and category breakdowns) in Redis, invalidating cache keys only when new sales records are created.
- **Database Index Tuning:** Optimize search indexes on historical transaction tables to prevent slowdowns as row counts scale.
- **Paginated APIs:** Implement server-side pagination across list views (Sales, Invoices, Expenses) to reduce network payload sizes.

### 11.3 Additional Features

- **Multi-Currency Support:** Support multi-currency transactions, logging conversion rates in purchase orders and invoices.
- **Automated Email Reports:** Add scheduler cron jobs to email PDF invoice copies and weekly financial reports to clients and managers automatically.
- **Granular Row-Level Access:** Implement row-level security rules, restricting staff access to department-specific transaction logs.
- **Machine Learning Forecasting:** Train localized linear regression models using sales trends to forecast stock demand and suggest purchase quantities automatically.

---

## 12. Recent Implementations & Cloud Migration

### 12.1 Cloud Deployment Architecture (Railway + Vercel)

The system was migrated from a local SQLite setup to a fully cloud-hosted environment:
- **Backend Deployment (Railway):** Django application hosted on Railway, utilizing a managed PostgreSQL database. Environment configuration includes `DATABASE_URL` for PostgreSQL connectivity, `CORS_ALLOWED_ORIGINS` pointing to the Vercel app, and production flags (`DEBUG=False`).
- **Frontend Deployment (Vercel):** The Vite SPA is compiled and served statically on Vercel. Communication is routed to the Railway endpoints via the `VITE_API_URL` environment variable.

### 12.2 Production Stability & Database Seeding Optimizations

To handle production limits and database engine constraints, the following backend refactors were completed:
- **Asynchronous Database Seeding via Threads:** The database seeding/restore endpoint (`seed_view`) was refactored to run the data restoration routine in a background thread. This returns an immediate `200 OK` response to the client, preventing Railway proxy request timeout aborts (30s limit) during heavy dataset imports.
- **PostgreSQL IDENTITY Sequence Synchronization:** Integrated Django's native `connection.ops.sequence_reset_sql` to dynamically reset PostgreSQL database sequence counters. This resolves primary key integrity constraint conflicts (e.g., in `user_mgmt_activitylog`) when users attempt to log in after fresh database loads.
- **HTTPX Dependency Pinning for Chatbot Engine:** Pinned `httpx==0.27.2` in `requirements.txt` to maintain compatibility with the older `groq==0.4.1` client version, resolving a `TypeError` in the chatbot's LLM connection constructor.

### 12.3 Dynamic Custom Columns Feature

To allow flexible data structures without complex schema migrations, we implemented a custom columns engine:
- **Section/Category Isolation:** Enabled custom columns to be scoped by category section key (e.g., `clothing`, `electronics`). Columns added or removed inside one category table section do not affect others.
- **Dynamic Sales Category Filtering:** Integrated category-specific custom columns into the sales page. The columns displayed and modified update reactively according to the selected dropdown category filter.
- **Bulk CSV Upload Auto-Detection:** The bulk product upload parses extra non-standard CSV columns on the client-side, maps them to the appropriate category, and persists their cell values by SKU in `localStorage`.
- **Relaxed Backend Validation Constraints:** Removed strict phone/email regex constraints from the `supplier_contact` upload validation. This permits flexible contact string values (such as names, custom notes, websites) without failing rows during bulk uploads.
