# Contract Management Platform

A production-ready contract management system built with React.js, Node.js (Express), and MongoDB.

## Features

### Authentication & Authorization
- Email/password authentication with JWT
- Role-based access control (Admin, Client, Service Provider)
- Secure password hashing with bcrypt
- Token refresh mechanism
- Account lockout after failed attempts

### Dashboard
- **Admin Dashboard**: Folder-style UI with contract statistics, service provider metrics, and user management
- **Client Dashboard**: Contract overview, status tracking, quick actions

### Contract Management
- Create, edit, and delete contracts
- Contract types: IT Service, Data Server Management, Office Administrator, Software Handling
- Budget range management (EUR)
- Timeline management with date pickers
- Word count validation for descriptions
- Contract status workflow: Draft → Pending Approval → Published → Provider Assigned → In Progress → Completed

### Service Providers
- Provider listing with search and filters
- Rating system (1-5 stars)
- Expertise tags
- Availability status
- Request submission for contracts

### Additional Features
- Audit logs for all contract status changes
- Soft deletion for contracts
- Pagination and sorting
- Responsive design
- Quick actions menu (3-dot menu)

## Technology Stack

- **Frontend**: React.js 18, React Router v6, React Hook Form, Zustand
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + bcrypt
- **Validation**: express-validator, yup
- **Styling**: Custom CSS with CSS Variables

## Project Structure

```
Contract Management/
├── backend/
│   ├── src/
│   │   ├── config/         # Database and constants
│   │   ├── controllers/    # Route handlers
│   │   ├── middleware/     # Auth, validation, error handling
│   │   ├── models/         # MongoDB schemas
│   │   ├── routes/         # API routes
│   │   ├── utils/          # Helpers and utilities
│   │   ├── validators/     # Request validation
│   │   └── server.js       # Entry point
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/     # Reusable UI components
    │   ├── context/        # React Context (Auth)
    │   ├── pages/          # Page components
    │   ├── services/       # API services
    │   ├── styles/         # Global styles
    │   └── utils/          # Helpers and constants
    └── package.json
```

## Getting Started

### Prerequisites
- Node.js >= 18.0.0
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/contract_management
JWT_SECRET=your-super-secure-jwt-secret-key-min-32-chars
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-key
JWT_REFRESH_EXPIRE=30d
FRONTEND_URL=http://localhost:3000
```

5. Seed the database with sample data:
```bash
npm run seed
```

6. Start the development server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
```

4. Start the development server:
```bash
npm start
```

## Default Login Credentials

After running the seed script:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@contractmanagement.com | Admin@123 |
| Client | john.doe@example.com | Client@123 |
| Client | jane.smith@example.com | Client@123 |
| Provider | tech.solutions@example.com | Provider@123 |
| Provider | data.experts@example.com | Provider@123 |
| Provider | office.pro@example.com | Provider@123 |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new client
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/forgot-password` - Request password reset
- `PUT /api/auth/reset-password/:token` - Reset password
- `POST /api/auth/refresh-token` - Refresh access token

### Contracts
- `GET /api/contracts` - List contracts
- `POST /api/contracts` - Create contract
- `GET /api/contracts/:id` - Get contract details
- `PUT /api/contracts/:id` - Update contract
- `DELETE /api/contracts/:id` - Delete contract (soft)
- `POST /api/contracts/:id/submit` - Submit for approval
- `POST /api/contracts/:id/approve` - Approve contract (Admin)
- `POST /api/contracts/:id/reject` - Reject contract (Admin)
- `GET /api/contracts/:id/history` - Get audit history
- `GET /api/contracts/stats` - Get statistics (Admin)

### Service Providers
- `GET /api/service-providers` - List providers
- `GET /api/service-providers/:id` - Get provider details
- `GET /api/service-providers/stats` - Get statistics (Admin)
- `GET /api/service-providers/my-requests` - Get own requests (Provider)

### Provider Requests
- `GET /api/contracts/:contractId/requests` - Get contract requests
- `POST /api/contracts/:contractId/requests` - Submit request
- `POST /api/contracts/requests/:requestId/accept` - Accept request
- `POST /api/contracts/requests/:requestId/reject` - Reject request
- `POST /api/contracts/requests/:requestId/withdraw` - Withdraw request

### Admin
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/users` - List users
- `GET /api/admin/users/:id` - Get user details
- `PUT /api/admin/users/:id/status` - Update user status
- `POST /api/admin/users` - Create admin user
- `GET /api/admin/audit-logs` - Get audit logs
- `GET /api/admin/reports` - Get reports

## Contract Workflow

```
Client creates contract (Draft)
        ↓
Client submits for approval (Pending Approval)
        ↓
Admin reviews → Reject (back to Draft) OR Approve (Published)
        ↓
Service providers submit requests (Searching Provider)
        ↓
Client accepts a request (Provider Assigned)
        ↓
Work begins (In Progress)
        ↓
Contract completed (Completed) → Client submits review
```

## Security Features

- JWT-based authentication with refresh tokens
- Password hashing with bcrypt (12 rounds)
- Rate limiting on API endpoints
- MongoDB injection prevention (express-mongo-sanitize)
- Request validation with express-validator
- CORS configuration
- Helmet security headers
- Account lockout after 5 failed login attempts
- Audit logging for sensitive operations

## License

MIT License
