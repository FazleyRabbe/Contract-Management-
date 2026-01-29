import React from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import ClientDashboard from './ClientDashboard';
import ProcurementDashboard from './ProcurementDashboard';
import LegalDashboard from './LegalDashboard';
import ContractCoordinatorDashboard from './ContractCoordinatorDashboard';

const Dashboard = () => {
  const { isAdmin, isClient, isProcurementManager, isLegalCounsel, isContractCoordinator } = useAuth();

  if (isAdmin) {
    return <AdminDashboard />;
  }

  if (isProcurementManager) {
    return <ProcurementDashboard />;
  }

  if (isLegalCounsel) {
    return <LegalDashboard />;
  }

  if (isContractCoordinator) {
    return <ContractCoordinatorDashboard />;
  }

  if (isClient) {
    return <ClientDashboard />;
  }

  // Service provider dashboard can be added here
  return <ClientDashboard />;
};

export default Dashboard;
