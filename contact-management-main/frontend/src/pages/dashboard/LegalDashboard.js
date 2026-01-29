import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiEye,
  FiEdit,
  FiCheck,
  FiX,
  FiMoreVertical,
  FiShield,
} from 'react-icons/fi';
import { legalAPI } from '../../services/api';
import { Card, Badge, Spinner, Button, Modal } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { formatDate, formatBudgetRange, getStatusColor } from '../../utils/helpers';
import { CONTRACT_STATUS_LABELS } from '../../utils/constants';
import toast from 'react-hot-toast';
import './Dashboard.css';

const LegalDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState([]);
  const [stats, setStats] = useState({
    pendingReview: 0,
    approved: 0,
    rejected: 0,
  });
  const [rejectModal, setRejectModal] = useState({ open: false, contract: null });
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);

  useEffect(() => {
    fetchLegalData();
  }, []);

  const fetchLegalData = async () => {
    try {
      setLoading(true);
      const [contractsRes, statsRes] = await Promise.all([
        legalAPI.getContracts(),
        legalAPI.getStats().catch(() => ({ data: { data: {} } })),
      ]);

      const data = contractsRes.data.data || [];
      setContracts(data);

      // Use API stats if available, otherwise calculate from data
      const apiStats = statsRes.data?.data || {};
      setStats({
        pendingReview: apiStats.pendingCount ?? data.length,
        approved: apiStats.approvedToday ?? 0,
        rejected: apiStats.rejectedToday ?? 0,
      });
    } catch (error) {
      toast.error('Failed to load legal review data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (contractId) => {
    try {
      setActionLoading(contractId);
      await legalAPI.approve(contractId);
      toast.success('Contract approved and opened for provider offers');
      fetchLegalData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve contract');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.contract || !rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      setActionLoading(rejectModal.contract._id);
      await legalAPI.reject(rejectModal.contract._id, { reason: rejectReason });
      toast.success('Contract rejected');
      setRejectModal({ open: false, contract: null });
      setRejectReason('');
      fetchLegalData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject contract');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Legal Review Dashboard</h1>
        <p>Welcome back, {user?.firstName}! Review contracts for legal compliance.</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <Card className="stat-card">
          <div className="stat-icon pending">
            <FiClock />
          </div>
          <div className="stat-content">
            <h3>{stats.pendingReview}</h3>
            <p>Pending Review</p>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="stat-icon success">
            <FiCheckCircle />
          </div>
          <div className="stat-content">
            <h3>{stats.approved}</h3>
            <p>Approved Today</p>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="stat-icon danger">
            <FiXCircle />
          </div>
          <div className="stat-content">
            <h3>{stats.rejected}</h3>
            <p>Rejected Today</p>
          </div>
        </Card>
      </div>

      {/* Pending Legal Review Requests */}
      <Card className="contracts-table-card">
        <div className="card-header-row">
          <h2>
            <FiShield /> Contracts Pending Legal Review
          </h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/contracts')}
          >
            View All
          </Button>
        </div>

        {contracts.length === 0 ? (
          <div className="table-empty">
            <FiCheckCircle className="empty-icon" />
            <p>No contracts pending legal review</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="contracts-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Budget</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract._id}>
                    <td className="ref-cell">
                      <Link to={`/contracts/${contract._id}`}>
                        {contract.referenceNumber}
                      </Link>
                    </td>
                    <td className="title-cell">
                      <Link to={`/contracts/${contract._id}`}>
                        {contract.title}
                      </Link>
                    </td>
                    <td>{contract.contractType}</td>
                    <td>
                      {formatBudgetRange(
                        contract.budget?.minimum,
                        contract.budget?.maximum
                      )}
                    </td>
                    <td>
                      {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
                    </td>
                    <td>
                      <Badge
                        variant={getStatusColor(contract.status).replace('badge-', '')}
                      >
                        {CONTRACT_STATUS_LABELS[contract.status]?.label || contract.status}
                      </Badge>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="action-btn"
                          onClick={() => navigate(`/contracts/${contract._id}`)}
                          title="View"
                        >
                          <FiEye />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="action-btn"
                          onClick={() => navigate(`/contracts/${contract._id}/edit`)}
                          title="Edit"
                        >
                          <FiEdit />
                        </Button>
                        <Button
                          variant="success"
                          size="sm"
                          className="action-btn"
                          onClick={() => handleApprove(contract._id)}
                          disabled={actionLoading === contract._id}
                          title="Approve"
                        >
                          <FiCheck />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          className="action-btn"
                          onClick={() => setRejectModal({ open: true, contract })}
                          disabled={actionLoading === contract._id}
                          title="Reject"
                        >
                          <FiX />
                        </Button>
                        <div className="dropdown-wrapper">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="action-btn"
                            onClick={() =>
                              setActiveMenu(
                                activeMenu === contract._id ? null : contract._id
                              )
                            }
                          >
                            <FiMoreVertical />
                          </Button>
                          {activeMenu === contract._id && (
                            <div className="dropdown-menu">
                              <button
                                className="dropdown-item"
                                onClick={() => {
                                  navigate(`/contracts/${contract._id}`);
                                  setActiveMenu(null);
                                }}
                              >
                                <FiEye /> View Details
                              </button>
                              <button
                                className="dropdown-item"
                                onClick={() => {
                                  navigate(`/contracts/${contract._id}/edit`);
                                  setActiveMenu(null);
                                }}
                              >
                                <FiEdit /> Edit
                              </button>
                              <button
                                className="dropdown-item success"
                                onClick={() => {
                                  handleApprove(contract._id);
                                  setActiveMenu(null);
                                }}
                              >
                                <FiCheck /> Approve
                              </button>
                              <button
                                className="dropdown-item danger"
                                onClick={() => {
                                  setRejectModal({ open: true, contract });
                                  setActiveMenu(null);
                                }}
                              >
                                <FiX /> Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Reject Contract Modal */}
      <Modal
        isOpen={rejectModal.open}
        onClose={() => {
          setRejectModal({ open: false, contract: null });
          setRejectReason('');
        }}
        title="Reject Contract"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setRejectModal({ open: false, contract: null });
                setRejectReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleReject}
              disabled={!rejectReason.trim() || actionLoading}
            >
              {actionLoading ? 'Rejecting...' : 'Reject'}
            </Button>
          </>
        }
      >
        <div className="reject-modal-content">
          <p>
            You are about to reject{' '}
            <strong>{rejectModal.contract?.title}</strong>.
          </p>
          <div className="form-group">
            <label htmlFor="rejectReason">Rejection Reason *</label>
            <textarea
              id="rejectReason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Please provide a legal reason for rejection..."
              rows={4}
              className="reject-reason-input"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LegalDashboard;
