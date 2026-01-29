import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiPlus,
  FiFileText,
  FiClock,
  FiCheckCircle,
  FiSearch,
  FiUsers,
  FiStar,
  FiChevronRight,
} from 'react-icons/fi';
import { contractAPI, serviceProviderAPI } from '../../services/api';
import { Card, Button, Badge, Spinner } from '../../components/common';
import { formatDate, formatBudgetRange, getStatusColor } from '../../utils/helpers';
import { CLIENT_STATUS_LABELS } from '../../utils/constants';
import './Dashboard.css';

const StatusCard = ({ icon: Icon, title, count, status, color }) => {
  return (
    <Link to={`/contracts?status=${status}`} className="status-card-link">
      <Card className={`status-card ${color}`} hoverable>
        <div className="status-card-icon">
          <Icon />
        </div>
        <div className="status-card-content">
          <span className="status-card-count">{count}</span>
          <span className="status-card-title">{title}</span>
        </div>
      </Card>
    </Link>
  );
};

const ClientDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState([]);
  const [providers, setProviders] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    accepted: 0,
    searching: 0,
    completed: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [contractsRes, providersRes] = await Promise.all([
        contractAPI.getAll({ limit: 5, sort: '-createdAt' }),
        serviceProviderAPI.getAll({ limit: 4, sort: '-rating.average' }),
      ]);

      const contractList = contractsRes.data.data;
      setContracts(contractList);
      setProviders(providersRes.data.data);

      // Calculate stats
      const statusCounts = {
        pending: 0,
        accepted: 0,
        searching: 0,
        completed: 0,
      };

      contractList.forEach((contract) => {
        // Pending statuses (various workflow stages)
        if (['pending_approval', 'pending_procurement', 'pending_legal', 'pending_final_approval'].includes(contract.status)) {
          statusCounts.pending++;
        }
        // Accepted/selected statuses
        else if (['provider_assigned', 'offer_selected', 'final_approved'].includes(contract.status)) {
          statusCounts.accepted++;
        }
        // Searching/open for offers
        else if (['published', 'searching_provider', 'open_for_offers'].includes(contract.status)) {
          statusCounts.searching++;
        }
        else if (contract.status === 'completed') statusCounts.completed++;
      });

      setStats(statusCounts);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <Spinner size="lg" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard client-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>My Dashboard</h1>
          <p>Manage your contracts and connect with service providers</p>
        </div>
        <div className="dashboard-actions">
          <Button
            icon={<FiPlus />}
            onClick={() => navigate('/contracts/new')}
          >
            Create Contract
          </Button>
        </div>
      </div>

      {/* Quick Status Overview */}
      <section className="dashboard-section">
        <h2 className="section-title">
          <FiFileText />
          Contract Status
        </h2>
        <div className="status-cards-grid">
          <StatusCard
            icon={FiClock}
            title="Request Pending"
            count={stats.pending}
            status="pending_approval"
            color="yellow"
          />
          <StatusCard
            icon={FiCheckCircle}
            title="Request Accepted"
            count={stats.accepted}
            status="provider_assigned"
            color="blue"
          />
          <StatusCard
            icon={FiSearch}
            title="Searching Provider"
            count={stats.searching}
            status="published"
            color="purple"
          />
          <StatusCard
            icon={FiCheckCircle}
            title="Completed"
            count={stats.completed}
            status="completed"
            color="green"
          />
        </div>
      </section>

      {/* Recent Contracts */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">
            <FiFileText />
            Recent Contracts
          </h2>
          <Link to="/contracts" className="view-all-link">
            View All <FiChevronRight />
          </Link>
        </div>

        {contracts.length > 0 ? (
          <div className="contracts-list">
            {contracts.map((contract) => (
              <Link
                key={contract._id}
                to={`/contracts/${contract._id}`}
                className="contract-card-link"
              >
                <Card className="contract-card" hoverable>
                  <div className="contract-card-header">
                    <div>
                      <h3 className="contract-title">{contract.title}</h3>
                      <span className="contract-ref">{contract.referenceNumber}</span>
                    </div>
                    <Badge
                      variant={getStatusColor(contract.status).replace('badge-', '')}
                    >
                      {CLIENT_STATUS_LABELS[contract.status]}
                    </Badge>
                  </div>
                  <div className="contract-card-body">
                    <div className="contract-info-row">
                      <span className="contract-type">{contract.contractType}</span>
                      <span className="contract-budget">
                        {formatBudgetRange(
                          contract.budget?.minimum,
                          contract.budget?.maximum
                        )}
                      </span>
                    </div>
                    <div className="contract-dates">
                      <span>
                        {formatDate(contract.startDate)} -{' '}
                        {formatDate(contract.endDate)}
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="empty-state-card">
            <div className="empty-state">
              <FiFileText className="empty-state-icon" />
              <h3>No contracts yet</h3>
              <p>Create your first contract to get started</p>
              <Button
                icon={<FiPlus />}
                onClick={() => navigate('/contracts/new')}
              >
                Create Contract
              </Button>
            </div>
          </Card>
        )}
      </section>

      {/* Service Providers */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">
            <FiUsers />
            Top Service Providers
          </h2>
          <Link to="/service-providers" className="view-all-link">
            View All <FiChevronRight />
          </Link>
        </div>

        <div className="providers-grid">
          {providers.map((provider) => (
            <Link
              key={provider._id}
              to={`/service-providers/${provider._id}`}
              className="provider-card-link"
            >
              <Card className="provider-card" hoverable>
                <div className="provider-avatar-lg">
                  {provider.user?.firstName?.charAt(0)}
                  {provider.user?.lastName?.charAt(0)}
                </div>
                <div className="provider-card-info">
                  <h3 className="provider-name">
                    {provider.user?.firstName} {provider.user?.lastName}
                  </h3>
                  <span className="provider-role">{provider.coreRole}</span>
                </div>
                <div className="provider-card-stats">
                  <div className="provider-rating">
                    <FiStar className="rating-icon" />
                    <span>{provider.rating?.average?.toFixed(1) || '0.0'}</span>
                  </div>
                  <span className="provider-tasks">
                    {provider.completedTasks} completed
                  </span>
                </div>
                {provider.isVerified && (
                  <Badge variant="success" size="sm">
                    Verified
                  </Badge>
                )}
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="dashboard-section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="quick-actions-grid">
          <Card
            className="quick-action-card"
            hoverable
            onClick={() => navigate('/contracts/new')}
          >
            <FiPlus className="quick-action-icon" />
            <span>Create Contract</span>
          </Card>
          <Card
            className="quick-action-card"
            hoverable
            onClick={() => navigate('/contracts')}
          >
            <FiFileText className="quick-action-icon" />
            <span>View Contracts</span>
          </Card>
          <Card
            className="quick-action-card"
            hoverable
            onClick={() => navigate('/service-providers')}
          >
            <FiUsers className="quick-action-icon" />
            <span>Browse Providers</span>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default ClientDashboard;
