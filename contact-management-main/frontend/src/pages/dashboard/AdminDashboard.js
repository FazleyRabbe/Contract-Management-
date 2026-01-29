import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiFileText,
  FiCheckCircle,
  FiClock,
  FiEdit,
  FiGlobe,
  FiUsers,
  FiStar,
  FiTrendingUp,
  FiChevronRight,
  FiEye,
  FiCheck,
  FiX,
  FiMoreVertical,
  FiShield,
  FiDollarSign,
  FiCalendar,
  FiMail,
  FiPhone,
  FiBriefcase,
  FiUser,
} from 'react-icons/fi';
import { adminAPI, serviceProviderAPI } from '../../services/api';
import { Card, Badge, Spinner, Button, Modal } from '../../components/common';
import { formatCurrency, formatDate, formatBudgetRange } from '../../utils/helpers';
import toast from 'react-hot-toast';
import './Dashboard.css';

const FolderCard = ({ icon: Icon, title, count, color, onClick, isOpen }) => {
  return (
    <div
      className={`folder-card ${color} ${isOpen ? 'open' : ''}`}
      onClick={onClick}
    >
      <div className="folder-tab">
        <span className="folder-label">{title}</span>
      </div>
      <div className="folder-content">
        <div className="folder-icon">
          <Icon />
        </div>
        <div className="folder-info">
          <span className="folder-count">{count}</span>
          <span className="folder-title">{title}</span>
        </div>
        <FiChevronRight className="folder-arrow" />
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [providerStats, setProviderStats] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);

  // Pending final approval state
  const [pendingContracts, setPendingContracts] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [rejectModal, setRejectModal] = useState({ open: false, contract: null });
  const [rejectReason, setRejectReason] = useState('');
  const [detailModal, setDetailModal] = useState({ open: false, contract: null });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [dashboardRes, providerRes, pendingRes] = await Promise.all([
        adminAPI.getDashboard(),
        serviceProviderAPI.getStats(),
        adminAPI.getPendingFinalApproval().catch(() => ({ data: { data: [] } })),
      ]);

      setDashboardData(dashboardRes.data.data);
      setProviderStats(providerRes.data.data);
      setPendingContracts(pendingRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (folder) => {
    setSelectedFolder(selectedFolder === folder ? null : folder);
  };

  // Final approval handlers
  const handleFinalApprove = async (contractId) => {
    try {
      setActionLoading(contractId);
      await adminAPI.finalApprove(contractId);
      toast.success('Contract approved successfully!');
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve contract');
    } finally {
      setActionLoading(null);
    }
  };

  const handleFinalReject = async () => {
    if (!rejectModal.contract || !rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      setActionLoading(rejectModal.contract._id);
      await adminAPI.finalReject(rejectModal.contract._id, { reason: rejectReason });
      toast.success('Contract rejected');
      setRejectModal({ open: false, contract: null });
      setRejectReason('');
      fetchDashboardData();
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
        <p>Loading dashboard...</p>
      </div>
    );
  }

  const contracts = dashboardData?.contracts || {};
  const users = dashboardData?.users || {};
  const providers = providerStats || {};

  const folderItems = [
    {
      id: 'total',
      icon: FiFileText,
      title: 'Total Contracts',
      count: contracts.total || 0,
      color: 'blue',
      link: '/contracts',
    },
    {
      id: 'pending-procurement',
      icon: FiClock,
      title: 'Pending Procurement',
      count: contracts.pendingProcurement || 0,
      color: 'yellow',
      link: '/contracts?status=pending_procurement',
    },
    {
      id: 'pending-legal',
      icon: FiClock,
      title: 'Pending Legal',
      count: contracts.pendingLegal || 0,
      color: 'yellow',
      link: '/contracts?status=pending_legal',
    },
    {
      id: 'open-for-offers',
      icon: FiGlobe,
      title: 'Open for Offers',
      count: contracts.openForOffers || 0,
      color: 'teal',
      link: '/contracts?status=open_for_offers',
    },
    {
      id: 'pending-final',
      icon: FiClock,
      title: 'Pending Final Approval',
      count: contracts.pendingFinalApproval || 0,
      color: 'yellow',
      link: '/contracts?status=pending_final_approval',
    },
    {
      id: 'final-approved',
      icon: FiCheckCircle,
      title: 'Final Approved',
      count: contracts.finalApproved || 0,
      color: 'green',
      link: '/contracts?status=final_approved',
    },
    {
      id: 'draft',
      icon: FiEdit,
      title: 'Draft Contracts',
      count: contracts.draft || 0,
      color: 'gray',
      link: '/contracts?status=draft',
    },

  ];

  return (
    <div className="dashboard admin-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Overview of your contract management system</p>
        </div>
      </div>

      {/* Folder-style Contract Stats */}
      <section className="dashboard-section">
        <h2 className="section-title">
          <FiFileText />
          Contracts Overview
        </h2>
        <div className="folders-grid">
          {folderItems.map((folder) => (
            <Link
              key={folder.id}
              to={folder.link}
              className="folder-link"
            >
              <FolderCard
                icon={folder.icon}
                title={folder.title}
                count={folder.count}
                color={folder.color}
                isOpen={selectedFolder === folder.id}
                onClick={() => handleFolderClick(folder.id)}
              />
            </Link>
          ))}
        </div>
      </section>

      {/* Pending Final Approval Section */}
      {pendingContracts.length > 0 && (
        <section className="dashboard-section">
          <Card className="contracts-table-card">
            <div className="card-header-row">
              <h2>
                <FiShield /> Contracts Pending Final Approval
              </h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/contracts?status=pending_final_approval')}
              >
                View All
              </Button>
            </div>

            <div className="table-responsive">
              <table className="contracts-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Budget</th>
                    <th>Provider Details</th>
                    <th>Offer Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingContracts.slice(0, 5).map((contract) => {
                    const selectedOffer = contract.workflow?.coordinator?.selectedOffer || contract.selectedOffer;
                    const providerName = selectedOffer?.providerDetails?.companyName || selectedOffer?.provider?.name || 'N/A';
                    const providerRole = selectedOffer?.providerDetails?.role || selectedOffer?.provider?.category || '';

                    return (
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
                          <div className="provider-cell">
                            <strong>{providerName}</strong>
                            {providerRole && <span className="provider-role-text">{providerRole}</span>}
                          </div>
                        </td>
                        <td>
                          <Badge variant="info">
                            {formatCurrency(selectedOffer?.offerAmount?.amount, selectedOffer?.offerAmount?.currency)}
                          </Badge>
                        </td>
                        <td>
                          <div className="actions-cell">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="action-btn"
                              onClick={() => setDetailModal({ open: true, contract })}
                              title="View Details"
                            >
                              <FiEye />
                            </Button>
                            <Button
                              variant="success"
                              size="sm"
                              className="action-btn"
                              onClick={() => handleFinalApprove(contract._id)}
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
                                      setDetailModal({ open: true, contract });
                                      setActiveMenu(null);
                                    }}
                                  >
                                    <FiEye /> View Full Details
                                  </button>
                                  <button
                                    className="dropdown-item"
                                    onClick={() => {
                                      navigate(`/contracts/${contract._id}`);
                                      setActiveMenu(null);
                                    }}
                                  >
                                    <FiFileText /> Contract Page
                                  </button>
                                  <button
                                    className="dropdown-item success"
                                    onClick={() => {
                                      handleFinalApprove(contract._id);
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      )}

      {/* Service Providers Section */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">
            <FiUsers />
            Service Providers
          </h2>
          <Link to="/service-providers" className="view-all-link">
            View All
          </Link>
        </div>

        <div className="stats-grid">
          <Card className="stat-card">
            <div className="stat-icon blue">
              <FiUsers />
            </div>
            <div className="stat-info">
              <span className="stat-value">{providers.totalProviders || 0}</span>
              <span className="stat-label">Total Providers</span>
            </div>
          </Card>

          <Card className="stat-card">
            <div className="stat-icon green">
              <FiCheckCircle />
            </div>
            <div className="stat-info">
              <span className="stat-value">{providers.verifiedProviders || 0}</span>
              <span className="stat-label">Verified</span>
            </div>
          </Card>

          <Card className="stat-card">
            <div className="stat-icon yellow">
              <FiStar />
            </div>
            <div className="stat-info">
              <span className="stat-value">
                {providers.avgRating?.toFixed(1) || '0.0'}
              </span>
              <span className="stat-label">Avg Rating</span>
            </div>
          </Card>

          <Card className="stat-card">
            <div className="stat-icon purple">
              <FiTrendingUp />
            </div>
            <div className="stat-info">
              <span className="stat-value">
                {providers.totalCompletedTasks || 0}
              </span>
              <span className="stat-label">Completed Tasks</span>
            </div>
          </Card>
        </div>

        {/* Top Providers List */}
        {providers.topProviders?.length > 0 && (
          <Card className="top-providers-card">
            <Card.Header>
              <h3>Top Service Providers</h3>
            </Card.Header>
            <Card.Body>
              <div className="providers-list">
                {providers.topProviders.slice(0, 5).map((provider, index) => (
                  <Link
                    key={provider._id}
                    to={`/service-providers/${provider._id}`}
                    className="provider-item"
                  >
                    <div className="provider-rank">#{index + 1}</div>
                    <div className="provider-avatar">
                      {provider.user?.firstName?.charAt(0)}
                      {provider.user?.lastName?.charAt(0)}
                    </div>
                    <div className="provider-info">
                      <span className="provider-name">
                        {provider.user?.firstName} {provider.user?.lastName}
                      </span>
                      <span className="provider-role">{provider.coreRole}</span>
                    </div>
                    <div className="provider-stats">
                      <div className="provider-rating">
                        <FiStar />
                        <span>{provider.rating?.average?.toFixed(1) || '0.0'}</span>
                      </div>
                      <div className="provider-tasks">
                        {provider.completedTasks} tasks
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Card.Body>
          </Card>
        )}
      </section>

      {/* User Stats */}
      <section className="dashboard-section">
        <h2 className="section-title">
          <FiUsers />
          User Statistics
        </h2>
        <div className="stats-grid three-cols">
          <Card className="stat-card">
            <div className="stat-icon blue">
              <FiUsers />
            </div>
            <div className="stat-info">
              <span className="stat-value">{users.total || 0}</span>
              <span className="stat-label">Total Users</span>
            </div>
          </Card>

          <Card className="stat-card">
            <div className="stat-icon green">
              <FiUsers />
            </div>
            <div className="stat-info">
              <span className="stat-value">{users.clients || 0}</span>
              <span className="stat-label">Clients</span>
            </div>
          </Card>

          <Card className="stat-card">
            <div className="stat-icon purple">
              <FiUsers />
            </div>
            <div className="stat-info">
              <span className="stat-value">{users.serviceProviders || 0}</span>
              <span className="stat-label">Service Providers</span>
            </div>
          </Card>
        </div>
      </section>

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
              onClick={handleFinalReject}
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
          <p>
            Selected Provider: <strong>
              {rejectModal.contract?.workflow?.coordinator?.selectedOffer?.providerDetails?.companyName ||
                rejectModal.contract?.workflow?.coordinator?.selectedOffer?.provider?.name ||
                rejectModal.contract?.selectedOffer?.provider?.name || 'N/A'}
            </strong>
          </p>
          <p>
            Offer Amount: <strong>
              {formatCurrency(
                rejectModal.contract?.workflow?.coordinator?.selectedOffer?.offerAmount?.amount ||
                rejectModal.contract?.selectedOffer?.offerAmount?.amount
              )}
            </strong>
          </p>
          <div className="form-group">
            <label htmlFor="rejectReason">Rejection Reason *</label>
            <textarea
              id="rejectReason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              rows={4}
              className="reject-reason-input"
            />
          </div>
        </div>
      </Modal>

      {/* Contract Details Modal */}
      <Modal
        isOpen={detailModal.open}
        onClose={() => setDetailModal({ open: false, contract: null })}
        title="Contract & Offer Details"
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDetailModal({ open: false, contract: null })}
            >
              Close
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setDetailModal({ open: false, contract: null });
                setRejectModal({ open: true, contract: detailModal.contract });
              }}
            >
              <FiX /> Reject
            </Button>
            <Button
              variant="success"
              onClick={() => {
                handleFinalApprove(detailModal.contract?._id);
                setDetailModal({ open: false, contract: null });
              }}
              disabled={actionLoading}
            >
              <FiCheck /> Approve
            </Button>
          </>
        }
      >
        {detailModal.contract && (() => {
          const contract = detailModal.contract;
          const selectedOffer = contract.workflow?.coordinator?.selectedOffer || contract.selectedOffer;
          const provider = selectedOffer?.provider;
          const providerDetails = selectedOffer?.providerDetails;

          return (
            <div className="contract-details-modal">
              {/* Contract Information */}
              <div className="detail-section">
                <h4><FiFileText /> Contract Information</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Reference Number</label>
                    <span>{contract.referenceNumber}</span>
                  </div>
                  <div className="detail-item">
                    <label>Title</label>
                    <span>{contract.title}</span>
                  </div>
                  <div className="detail-item">
                    <label>Type</label>
                    <span>{contract.contractType}</span>
                  </div>
                  <div className="detail-item">
                    <label>Budget Range</label>
                    <span>{formatBudgetRange(contract.budget?.minimum, contract.budget?.maximum)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Contract Duration</label>
                    <span>{formatDate(contract.startDate)} - {formatDate(contract.endDate)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Target Persons</label>
                    <span>{contract.targetPersons}</span>
                  </div>
                </div>
                {contract.description && (
                  <div className="detail-item full-width">
                    <label>Description</label>
                    <p className="detail-text">{contract.description}</p>
                  </div>
                )}
              </div>

              {/* Client Information */}
              <div className="detail-section">
                <h4><FiUser /> Client Information</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Name</label>
                    <span>{contract.client?.firstName} {contract.client?.lastName}</span>
                  </div>
                  <div className="detail-item">
                    <label><FiMail /> Email</label>
                    <span>{contract.client?.email}</span>
                  </div>
                  {contract.client?.phone?.number && (
                    <div className="detail-item">
                      <label><FiPhone /> Phone</label>
                      <span>{contract.client?.phone?.countryCode} {contract.client?.phone?.number}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Provider & Offer */}
              <div className="detail-section highlight">
                <h4><FiBriefcase /> Selected Provider & Offer</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Company Name</label>
                    <span className="highlight-value">{providerDetails?.companyName || provider?.name || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Role / Position</label>
                    <span>{providerDetails?.role || provider?.category || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label><FiMail /> Email</label>
                    <span>{providerDetails?.email || provider?.email || 'N/A'}</span>
                  </div>
                  {(providerDetails?.phone?.number || provider?.phone?.number) && (
                    <div className="detail-item">
                      <label><FiPhone /> Phone</label>
                      <span>
                        {providerDetails?.phone?.countryCode || provider?.phone?.countryCode}{' '}
                        {providerDetails?.phone?.number || provider?.phone?.number}
                      </span>
                    </div>
                  )}
                  <div className="detail-item">
                    <label>Category</label>
                    <span>{providerDetails?.category || provider?.category || 'N/A'}</span>
                  </div>
                  {provider?.organization && (
                    <div className="detail-item">
                      <label>Organization</label>
                      <span>{provider.organization}</span>
                    </div>
                  )}
                </div>

                <div className="offer-highlight">
                  <div className="offer-amount-display">
                    <FiDollarSign />
                    <div>
                      <label>Offer Amount</label>
                      <span className="amount-value">
                        {formatCurrency(selectedOffer?.offerAmount?.amount, selectedOffer?.offerAmount?.currency)}
                      </span>
                    </div>
                  </div>
                  <div className="offer-timeline-display">
                    <FiCalendar />
                    <div>
                      <label>Proposed Timeline</label>
                      <span>
                        {formatDate(selectedOffer?.proposedTimeline?.startDate)} - {formatDate(selectedOffer?.proposedTimeline?.endDate)}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedOffer?.description && (
                  <div className="detail-item full-width">
                    <label>Offer Description</label>
                    <p className="detail-text">{selectedOffer.description}</p>
                  </div>
                )}
              </div>

              {/* Workflow History */}
              <div className="detail-section">
                <h4><FiCheckCircle /> Approval Workflow</h4>
                <div className="workflow-timeline">
                  {contract.workflow?.procurement?.reviewedBy && (
                    <div className="workflow-step completed">
                      <div className="step-icon"><FiCheck /></div>
                      <div className="step-content">
                        <strong>Procurement Review</strong>
                        <span>
                          {contract.workflow.procurement.status === 'approved' ? 'Approved' : 'Reviewed'} by{' '}
                          {contract.workflow.procurement.reviewedBy.firstName}{' '}
                          {contract.workflow.procurement.reviewedBy.lastName}
                        </span>
                        {contract.workflow.procurement.reviewedAt && (
                          <small>{formatDate(contract.workflow.procurement.reviewedAt)}</small>
                        )}
                      </div>
                    </div>
                  )}
                  {contract.workflow?.legal?.reviewedBy && (
                    <div className="workflow-step completed">
                      <div className="step-icon"><FiCheck /></div>
                      <div className="step-content">
                        <strong>Legal Review</strong>
                        <span>
                          {contract.workflow.legal.status === 'approved' ? 'Approved' : 'Reviewed'} by{' '}
                          {contract.workflow.legal.reviewedBy.firstName}{' '}
                          {contract.workflow.legal.reviewedBy.lastName}
                        </span>
                        {contract.workflow.legal.reviewedAt && (
                          <small>{formatDate(contract.workflow.legal.reviewedAt)}</small>
                        )}
                      </div>
                    </div>
                  )}
                  {contract.workflow?.coordinator?.selectedBy && (
                    <div className="workflow-step completed">
                      <div className="step-icon"><FiCheck /></div>
                      <div className="step-content">
                        <strong>Offer Selected</strong>
                        <span>
                          Selected by{' '}
                          {contract.workflow.coordinator.selectedBy.firstName}{' '}
                          {contract.workflow.coordinator.selectedBy.lastName}
                        </span>
                        {contract.workflow.coordinator.selectedAt && (
                          <small>{formatDate(contract.workflow.coordinator.selectedAt)}</small>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="workflow-step pending">
                    <div className="step-icon"><FiClock /></div>
                    <div className="step-content">
                      <strong>Final Approval</strong>
                      <span>Awaiting your approval</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

export default AdminDashboard;
