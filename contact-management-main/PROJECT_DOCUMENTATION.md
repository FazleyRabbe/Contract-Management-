# Contract Management Platform - Complete Documentation

A production-ready, enterprise-grade contract management system with multi-role approval workflow, built with modern web technologies.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Project Structure](#project-structure)
5. [User Roles & Permissions](#user-roles--permissions)
6. [Contract Workflow](#contract-workflow)
7. [Features](#features)
8. [Security Implementation](#security-implementation)
9. [API Documentation](#api-documentation)
10. [Database Models](#database-models)
11. [Frontend Components](#frontend-components)
12. [Installation & Setup](#installation--setup)
13. [Environment Variables](#environment-variables)
14. [Default Credentials](#default-credentials)

---

## Project Overview

The Contract Management Platform is a full-stack web application designed to streamline the contract lifecycle from creation to final approval. It implements a multi-stage approval workflow involving different stakeholders including Clients, Procurement Managers, Legal Counsel, Contract Coordinators, and Administrators.

### Key Highlights

- **Multi-Role System**: 6 distinct user roles with specific permissions
- **Approval Workflow**: 6-stage contract approval process
- **Service Provider Integration**: External providers can submit offers
- **Audit Trail**: Complete history tracking of all contract changes
- **PDF Export**: Download all contracts as PDF reports
- **Real-time Status Tracking**: Visual workflow progress indicators

---

## Technology Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | >=18.0.0 | Runtime environment |
| **Express.js** | 4.18.2 | Web framework |
| **MongoDB** | Latest | NoSQL database |
| **Mongoose** | 8.0.3 | MongoDB ODM |
| **JWT** | 9.0.2 | Authentication tokens |
| **bcryptjs** | 2.4.3 | Password hashing |
| **express-validator** | 7.0.1 | Request validation |
| **helmet** | 7.1.0 | Security headers |
| **winston** | 3.11.0 | Logging |
| **nodemailer** | 6.9.7 | Email services |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.2.0 | UI library |
| **React Router** | 6.21.1 | Client-side routing |
| **Zustand** | 4.4.7 | State management |
| **React Hook Form** | 7.49.2 | Form handling |
| **Yup** | 1.3.2 | Schema validation |
| **Axios** | 1.6.2 | HTTP client |
| **jsPDF** | 2.5.2 | PDF generation |
| **date-fns** | 2.30.0 | Date utilities |
| **react-icons** | 4.12.0 | Icon library |
| **react-hot-toast** | 2.4.1 | Notifications |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                          │
│                    (React SPA - Port 3000)                      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP/HTTPS (REST API)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXPRESS.JS SERVER                          │
│                         (Port 5000)                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   MIDDLEWARE LAYER                       │   │
│  │  • Helmet (Security Headers)                            │   │
│  │  • CORS (Cross-Origin)                                  │   │
│  │  • Rate Limiter (100 req/15min)                         │   │
│  │  • Body Parser (10kb limit)                             │   │
│  │  • Mongo Sanitize (NoSQL Injection Prevention)          │   │
│  │  • Compression (Response Compression)                   │   │
│  │  • Morgan (HTTP Logging)                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   ROUTE HANDLERS                         │   │
│  │  • /api/auth         - Authentication                   │   │
│  │  • /api/contracts    - Contract CRUD                    │   │
│  │  • /api/procurement  - Procurement Manager              │   │
│  │  • /api/legal        - Legal Counsel                    │   │
│  │  • /api/coordinator  - Contract Coordinator             │   │
│  │  • /api/admin        - Admin Operations                 │   │
│  │  • /api/public       - Public Contract & Offers         │   │
│  │  • /api/service-providers - Provider Management         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ Mongoose ODM
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        MONGODB DATABASE                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │    Users     │ │   Contracts  │ │    Offers    │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │  Providers   │ │  AuditLogs   │ │   Reviews    │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
Contract Management/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── constants.js      # App constants, roles, statuses
│   │   │   └── database.js       # MongoDB connection
│   │   │
│   │   ├── controllers/
│   │   │   ├── admin.controller.js       # Admin operations
│   │   │   ├── auth.controller.js        # Authentication
│   │   │   ├── contract.controller.js    # Contract CRUD
│   │   │   ├── coordinator.controller.js # Coordinator actions
│   │   │   ├── legal.controller.js       # Legal review
│   │   │   ├── procurement.controller.js # Procurement review
│   │   │   ├── public.controller.js      # Public endpoints
│   │   │   └── serviceProvider.controller.js
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.js           # JWT & role verification
│   │   │   ├── errorHandler.js   # Global error handling
│   │   │   └── validate.js       # Request validation
│   │   │
│   │   ├── models/
│   │   │   ├── User.js           # User schema
│   │   │   ├── Contract.js       # Contract schema
│   │   │   ├── Offer.js          # Provider offers
│   │   │   ├── Provider.js       # Service providers
│   │   │   ├── AuditLog.js       # Audit trail
│   │   │   └── Review.js         # Provider reviews
│   │   │
│   │   ├── routes/
│   │   │   ├── index.js          # Route aggregator
│   │   │   ├── admin.routes.js
│   │   │   ├── auth.routes.js
│   │   │   ├── contract.routes.js
│   │   │   ├── coordinator.routes.js
│   │   │   ├── legal.routes.js
│   │   │   ├── procurement.routes.js
│   │   │   ├── public.routes.js
│   │   │   └── serviceProvider.routes.js
│   │   │
│   │   ├── utils/
│   │   │   ├── ApiError.js       # Custom error class
│   │   │   ├── ApiResponse.js    # Response formatter
│   │   │   ├── helpers.js        # Utility functions
│   │   │   ├── logger.js         # Winston logger
│   │   │   └── seeder.js         # Database seeder
│   │   │
│   │   ├── validators/
│   │   │   ├── auth.validator.js
│   │   │   ├── contract.validator.js
│   │   │   └── serviceProvider.validator.js
│   │   │
│   │   └── server.js             # Application entry point
│   │
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/           # Reusable UI components
│   │   │   │   ├── Badge.js
│   │   │   │   ├── Button.js
│   │   │   │   ├── Card.js
│   │   │   │   ├── Input.js
│   │   │   │   ├── Modal.js
│   │   │   │   ├── Select.js
│   │   │   │   └── Spinner.js
│   │   │   │
│   │   │   └── layout/           # Layout components
│   │   │       ├── Layout.js
│   │   │       ├── Navbar.js
│   │   │       └── ProtectedRoute.js
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.js    # Authentication state
│   │   │
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   │   └── AdminUsers.js
│   │   │   │
│   │   │   ├── auth/
│   │   │   │   ├── Login.js
│   │   │   │   └── Register.js
│   │   │   │
│   │   │   ├── contracts/
│   │   │   │   ├── ContractDetail.js
│   │   │   │   ├── ContractForm.js
│   │   │   │   └── ContractList.js
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   │   ├── AdminDashboard.js
│   │   │   │   ├── ClientDashboard.js
│   │   │   │   ├── ContractCoordinatorDashboard.js
│   │   │   │   ├── Dashboard.js
│   │   │   │   ├── LegalDashboard.js
│   │   │   │   └── ProcurementDashboard.js
│   │   │   │
│   │   │   ├── profile/
│   │   │   │   └── Profile.js
│   │   │   │
│   │   │   └── providers/
│   │   │       └── ServiceProviderList.js
│   │   │
│   │   ├── services/
│   │   │   └── api.js            # API service layer
│   │   │
│   │   ├── styles/
│   │   │   └── global.css        # Global styles
│   │   │
│   │   ├── utils/
│   │   │   ├── constants.js      # Frontend constants
│   │   │   └── helpers.js        # Utility functions
│   │   │
│   │   ├── App.js                # Main application
│   │   └── index.js              # Entry point
│   │
│   └── package.json
│
├── README.md
└── PROJECT_DOCUMENTATION.md
```

---

## User Roles & Permissions

### Role Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                           ADMIN                                  │
│  • Full system access                                           │
│  • Final contract approval/rejection                            │
│  • User management                                              │
│  • View all contracts and audit logs                            │
│  • Download contracts as PDF                                    │
└─────────────────────────────────────────────────────────────────┘
        │
        ├── PROCUREMENT MANAGER
        │   • Review contracts after client submission
        │   • Approve/reject for legal review
        │   • Create contracts on behalf of clients
        │
        ├── LEGAL COUNSEL
        │   • Review contracts after procurement approval
        │   • Approve/reject for provider offers
        │   • Ensure legal compliance
        │
        ├── CONTRACT COORDINATOR
        │   • View contracts open for offers
        │   • Review provider offers
        │   • Select winning offer
        │
        ├── CLIENT
        │   • Create and submit contracts
        │   • View own contracts
        │   • Track contract status
        │
        └── SERVICE PROVIDER
            • View available contracts
            • Submit offers
            • Track offer status
```

### Permission Matrix

| Action | Admin | Procurement | Legal | Coordinator | Client | Provider |
|--------|-------|-------------|-------|-------------|--------|----------|
| Create Contract | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ |
| Edit Contract | ✓ | ✓ | ✓ | ✗ | ✓* | ✗ |
| Delete Contract | ✓ | ✗ | ✗ | ✗ | ✓* | ✗ |
| Submit for Approval | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| Procurement Review | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Legal Review | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| Select Offer | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| Final Approval | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Submit Offer | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| View All Contracts | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Download PDF | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |

*Only for own contracts in draft status

---

## Contract Workflow

### Visual Workflow Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          CONTRACT LIFECYCLE                               │
└──────────────────────────────────────────────────────────────────────────┘

    ┌─────────┐
    │  DRAFT  │ ◄─── Client creates contract
    └────┬────┘
         │
         │ Client submits
         ▼
    ┌─────────────────────────┐
    │  PENDING_PROCUREMENT    │ ◄─── Procurement Manager reviews
    └────────────┬────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
    ┌────────┐      ┌──────────────────┐
    │REJECTED│      │  PENDING_LEGAL   │ ◄─── Legal Counsel reviews
    └────────┘      └────────┬─────────┘
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
               ┌────────┐      ┌─────────────────┐
               │REJECTED│      │ OPEN_FOR_OFFERS │ ◄─── Providers submit offers
               └────────┘      └────────┬────────┘
                                        │
                                        │ Coordinator selects offer
                                        ▼
                               ┌─────────────────┐
                               │ OFFER_SELECTED  │
                               └────────┬────────┘
                                        │
                                        ▼
                            ┌───────────────────────────┐
                            │ PENDING_FINAL_APPROVAL    │ ◄─── Admin reviews
                            └────────────┬──────────────┘
                                         │
                                ┌────────┴────────┐
                                ▼                 ▼
                           ┌────────┐      ┌────────────────┐
                           │REJECTED│      │ FINAL_APPROVED │ ◄─── Contract Active!
                           └────────┘      └────────────────┘
```

### Status Descriptions

| Status | Description | Next Action |
|--------|-------------|-------------|
| `draft` | Contract created, not submitted | Client submits for approval |
| `pending_procurement` | Awaiting procurement review | Procurement Manager approves/rejects |
| `pending_legal` | Awaiting legal review | Legal Counsel approves/rejects |
| `open_for_offers` | Published for provider offers | Providers submit offers |
| `offer_selected` | Coordinator selected an offer | Auto-moves to final approval |
| `pending_final_approval` | Awaiting admin approval | Admin approves/rejects |
| `final_approved` | Contract finalized | Contract is active |
| `rejected` | Rejected at any stage | Client can edit and resubmit |

---

## Features

### Authentication & User Management
- Email/password authentication with JWT
- Role-based access control (RBAC)
- Secure password hashing (bcrypt, 12 rounds)
- Token refresh mechanism
- Account lockout after failed attempts
- Profile management

### Contract Management
- Create, edit, delete contracts
- Contract types: IT Service, Data Server Management, Office Administrator, Software Handling
- Budget range management (EUR)
- Timeline management with date pickers
- Word count validation for descriptions (150 words max)
- Auto-generated reference numbers

### Multi-Stage Approval Workflow
- 6-stage approval process
- Role-specific dashboards
- Rejection with reason at any stage
- Audit trail for all status changes

### Service Provider Integration
- Provider listing with search and filters
- Rating system (1-5 stars)
- Expertise tags and categories
- Offer submission with amount and timeline
- Offer selection by coordinator

### Reporting & Export
- Admin dashboard with statistics
- PDF export of all contracts
- Audit logs viewing
- Provider performance metrics

### User Interface
- Responsive design
- Folder-style dashboard cards
- Status badges with color coding
- Quick actions menus
- Modal dialogs
- Toast notifications
- Loading spinners

---

## Security Implementation

### Authentication Security

```javascript
// JWT Token Generation
const token = jwt.sign(
  { id: user._id },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// Password Hashing (bcrypt, 12 rounds)
const hashedPassword = await bcrypt.hash(password, 12);
```

### Middleware Security Stack

| Middleware | Purpose | Configuration |
|------------|---------|---------------|
| **Helmet** | Security headers | Default configuration |
| **CORS** | Cross-origin requests | Whitelist frontend URL |
| **Rate Limiter** | Prevent brute force | 100 requests/15 minutes |
| **Body Parser** | Request size limit | 10kb max |
| **Mongo Sanitize** | NoSQL injection prevention | Removes $ and . from input |
| **Compression** | Response compression | gzip compression |

### Security Headers (Helmet)

```
X-DNS-Prefetch-Control: off
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'
```

### Input Validation

```javascript
// Example validation chain
const createContractValidator = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),

  body('budget.minimum')
    .isFloat({ min: 0 }).withMessage('Minimum budget must be positive'),

  body('startDate')
    .isISO8601().withMessage('Invalid start date format'),
];
```

### Authentication Flow

```
1. User submits credentials
        │
        ▼
2. Server validates against database
        │
        ▼
3. Password compared with bcrypt
        │
        ▼
4. JWT token generated (7 days expiry)
        │
        ▼
5. Token sent to client
        │
        ▼
6. Client stores in localStorage/memory
        │
        ▼
7. Subsequent requests include Authorization header
        │
        ▼
8. Server verifies token on each request
```

### Protected Route Example

```javascript
router.get(
  '/contracts',
  protect,                    // Verify JWT token
  restrictTo('admin', 'client'), // Check role
  validate,                   // Validate request
  contractController.getContracts
);
```

---

## API Documentation

### Base URL
```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | User login | No |
| POST | `/auth/logout` | User logout | Yes |
| GET | `/auth/me` | Get current user | Yes |
| PUT | `/auth/profile` | Update profile | Yes |
| PUT | `/auth/change-password` | Change password | Yes |
| POST | `/auth/forgot-password` | Request reset | No |
| PUT | `/auth/reset-password/:token` | Reset password | No |
| POST | `/auth/refresh-token` | Refresh JWT | Yes |

### Contract Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/contracts` | List contracts | All authenticated |
| POST | `/contracts` | Create contract | Client |
| GET | `/contracts/:id` | Get contract | All authenticated |
| PUT | `/contracts/:id` | Update contract | Client, Admin |
| DELETE | `/contracts/:id` | Delete contract | Client, Admin |
| POST | `/contracts/:id/submit` | Submit for approval | Client |
| GET | `/contracts/:id/history` | Get audit history | All authenticated |
| GET | `/contracts/stats` | Get statistics | Admin |

### Procurement Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/procurement/contracts` | List pending contracts | Procurement Manager |
| POST | `/procurement/contracts/:id/approve` | Approve contract | Procurement Manager |
| POST | `/procurement/contracts/:id/reject` | Reject contract | Procurement Manager |
| POST | `/procurement/contracts` | Create for client | Procurement Manager |

### Legal Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/legal/contracts` | List pending contracts | Legal Counsel |
| POST | `/legal/contracts/:id/approve` | Approve contract | Legal Counsel |
| POST | `/legal/contracts/:id/reject` | Reject contract | Legal Counsel |

### Coordinator Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/coordinator/contracts` | List open contracts | Contract Coordinator |
| GET | `/coordinator/contracts/:id` | Get with offers | Contract Coordinator |
| POST | `/coordinator/contracts/:id/select-offer/:offerId` | Select offer | Contract Coordinator |

### Admin Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/admin/dashboard` | Dashboard stats | Admin |
| GET | `/admin/users` | List users | Admin |
| POST | `/admin/users` | Create user | Admin |
| PUT | `/admin/users/:id/status` | Update user status | Admin |
| POST | `/admin/contracts/:id/final-approve` | Final approval | Admin |
| POST | `/admin/contracts/:id/final-reject` | Final rejection | Admin |
| GET | `/admin/audit-logs` | Get audit logs | Admin |

### Public Endpoints (Service Providers)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/public/contracts` | List open contracts | Optional |
| GET | `/public/contracts/:id` | Get contract details | Optional |
| POST | `/public/contracts/:id/offers` | Submit offer | Required |
| GET | `/public/my-offers` | Get own offers | Required |

### Request/Response Examples

#### Login Request
```json
POST /api/auth/login
{
  "email": "admin@contractmanagement.com",
  "password": "Admin@123"
}
```

#### Login Response
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "...",
      "firstName": "Admin",
      "lastName": "User",
      "email": "admin@contractmanagement.com",
      "role": "admin"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Create Contract Request
```json
POST /api/contracts
{
  "title": "IT Infrastructure Upgrade",
  "contractType": "IT Service",
  "description": "Upgrade server infrastructure...",
  "budget": {
    "minimum": 10000,
    "maximum": 50000
  },
  "startDate": "2024-03-01",
  "endDate": "2024-06-30",
  "targetConditions": "Must support 1000+ users..."
}
```

#### Submit Offer Request
```json
POST /api/public/contracts/:id/offers
{
  "offerAmount": {
    "amount": 35000,
    "currency": "EUR"
  },
  "proposedTimeline": {
    "startDate": "2024-03-15",
    "endDate": "2024-06-15"
  },
  "description": "Our team has extensive experience...",
  "deliverables": [
    { "title": "Server Setup", "description": "..." },
    { "title": "Migration", "description": "..." }
  ],
  "providerDetails": {
    "companyName": "Tech Solutions Ltd",
    "role": "Lead Developer"
  }
}
```

---

## Database Models

### User Model
```javascript
{
  firstName: String (required),
  lastName: String (required),
  email: String (required, unique),
  password: String (hashed),
  role: Enum ['admin', 'client', 'service_provider',
              'procurement_manager', 'legal_counsel',
              'contract_coordinator'],
  phone: String,
  isActive: Boolean (default: true),
  lastLogin: Date,
  loginAttempts: Number,
  lockUntil: Date,
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Contract Model
```javascript
{
  referenceNumber: String (auto-generated, unique),
  title: String (required),
  description: String,
  contractType: Enum ['IT Service', 'Data Server Management',
                      'Office Administrator', 'Software Handling'],
  status: Enum ['draft', 'pending_procurement', 'pending_legal',
                'open_for_offers', 'offer_selected',
                'pending_final_approval', 'final_approved',
                'rejected', 'cancelled'],
  client: ObjectId (ref: User),
  budget: {
    minimum: Number,
    maximum: Number,
    currency: String (default: 'EUR')
  },
  startDate: Date,
  endDate: Date,
  targetConditions: String,
  targetPersonsCount: Number,
  workflow: {
    procurement: {
      reviewedBy: ObjectId,
      reviewedAt: Date,
      notes: String,
      approved: Boolean
    },
    legal: {
      reviewedBy: ObjectId,
      reviewedAt: Date,
      notes: String,
      approved: Boolean
    },
    coordinator: {
      selectedOffer: ObjectId,
      selectedAt: Date,
      notes: String
    },
    finalApproval: {
      approvedBy: ObjectId,
      approvedAt: Date,
      notes: String,
      approved: Boolean
    }
  },
  rejectionReason: String,
  isDeleted: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Offer Model
```javascript
{
  contract: ObjectId (ref: Contract),
  provider: ObjectId (ref: Provider),
  offerAmount: {
    amount: Number,
    currency: String
  },
  proposedTimeline: {
    startDate: Date,
    endDate: Date
  },
  description: String,
  deliverables: [{
    title: String,
    description: String
  }],
  providerDetails: {
    companyName: String,
    role: String
  },
  status: Enum ['pending', 'selected', 'rejected', 'withdrawn'],
  selectedAt: Date,
  createdAt: Date
}
```

### AuditLog Model
```javascript
{
  contract: ObjectId (ref: Contract),
  user: ObjectId (ref: User),
  action: String,
  previousStatus: String,
  newStatus: String,
  details: Object,
  ipAddress: String,
  userAgent: String,
  createdAt: Date
}
```

---

## Frontend Components

### Common Components

| Component | Purpose |
|-----------|---------|
| `Button` | Styled button with variants (primary, secondary, danger, success, ghost) |
| `Input` | Form input with label and error handling |
| `Select` | Dropdown select with options |
| `Modal` | Dialog overlay for forms and confirmations |
| `Card` | Content container with header/body/footer |
| `Badge` | Status indicator with color variants |
| `Spinner` | Loading indicator |

### Layout Components

| Component | Purpose |
|-----------|---------|
| `Layout` | Main app layout with navbar and content area |
| `Navbar` | Navigation bar with user menu and role-based links |
| `ProtectedRoute` | Route guard for authenticated routes |

### Page Components

| Page | Description |
|------|-------------|
| `Login` | User authentication form |
| `Register` | User registration form |
| `Dashboard` | Role-based dashboard router |
| `AdminDashboard` | Admin overview with stats and actions |
| `ClientDashboard` | Client contract overview |
| `ProcurementDashboard` | Procurement review interface |
| `LegalDashboard` | Legal review interface |
| `ContractCoordinatorDashboard` | Offer management interface |
| `ContractList` | Contract listing with filters |
| `ContractDetail` | Contract details with workflow status |
| `ContractForm` | Create/edit contract form |
| `ServiceProviderList` | Provider directory |
| `AdminUsers` | User management for admins |
| `Profile` | User profile management |

---

## Installation & Setup

### Prerequisites
- Node.js >= 18.0.0
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your configuration
# (see Environment Variables section)

# Seed the database
npm run seed

# Start development server
npm run dev
```

### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Create environment file
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env

# Start development server
npm start
```

### Production Build

```bash
# Backend
cd backend
npm start

# Frontend
cd frontend
npm run build
# Serve the build folder with a static server
```

---

## Environment Variables

### Backend (.env)

```env
# Server
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/contract_management

# JWT
JWT_SECRET=your-super-secure-jwt-secret-key-min-32-chars
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-key
JWT_REFRESH_EXPIRE=30d

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Email (optional)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
EMAIL_FROM=noreply@contractmanagement.com
```

### Frontend (.env)

```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## Default Credentials

After running `npm run seed`:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@contractmanagement.com | Admin@123 |
| **Client** | john.doe@example.com | Client@123 |
| **Client** | jane.smith@example.com | Client@123 |
| **Procurement Manager** | procurement@example.com | Procurement@123 |
| **Legal Counsel** | legal@example.com | Legal@123 |
| **Contract Coordinator** | coordinator@example.com | Coordinator@123 |
| **Service Provider** | tech.solutions@example.com | Provider@123 |
| **Service Provider** | data.experts@example.com | Provider@123 |

---

## License

MIT License

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**Built with by the Development Team**
