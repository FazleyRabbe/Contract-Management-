import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout, ProtectedRoute } from './components/layout';
import { Login, Register } from './pages/auth';
import { Dashboard } from './pages/dashboard';
import { ContractList, ContractForm, ContractDetail } from './pages/contracts';
import { ServiceProviderList } from './pages/providers';
import { Profile } from './pages/profile';
import { AdminUsers } from './pages/admin';
import { ROLES } from './utils/constants';

// Quick Actions Menu Component (only for client users)
const QuickActionsMenu = () => {
  const { isAdmin, isProcurementManager, isLegalCounsel, isContractCoordinator } = useAuth();
  const [open, setOpen] = React.useState(false);

  // Don't show for admin, procurement, legal, or coordinator users
  if (isAdmin || isProcurementManager || isLegalCounsel || isContractCoordinator) {
    return null;
  }

  return (
    <div className="quick-actions-fab">
      <button
        className="fab-trigger"
        onClick={() => setOpen(!open)}
      >
        <span className="fab-icon">{open ? '×' : '⋮'}</span>
      </button>
      {open && (
        <div className="fab-menu">
          <a href="/contracts/new" className="fab-item">
            <span>📝</span> Create Contract
          </a>
          <a href="/dashboard" className="fab-item">
            <span>🏠</span> Dashboard
          </a>
          <a href="mailto:support@contractmanagement.com" className="fab-item">
            <span>📧</span> Contact Us
          </a>
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <Navigate to="/dashboard" replace />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
                <QuickActionsMenu />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Contract Routes */}
        <Route
          path="/contracts"
          element={
            <ProtectedRoute>
              <Layout>
                <ContractList />
                <QuickActionsMenu />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/contracts/new"
          element={
            <ProtectedRoute allowedRoles={[ROLES.CLIENT]}>
              <Layout>
                <ContractForm />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/contracts/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <ContractDetail />
                <QuickActionsMenu />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/contracts/:id/edit"
          element={
            <ProtectedRoute>
              <Layout>
                <ContractForm isEdit />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Service Provider Routes */}
        <Route
          path="/service-providers"
          element={
            <ProtectedRoute>
              <Layout>
                <ServiceProviderList />
                <QuickActionsMenu />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Profile Route */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
              <Layout>
                <AdminUsers />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
