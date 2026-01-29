import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiFileText,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiEye,
  FiEdit,
  FiCheck,
  FiX,
  FiMoreVertical,
  FiPlus,
  FiDollarSign,
  FiCalendar,
  FiUsers,
} from 'react-icons/fi';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { procurementAPI } from '../../services/api';
import { Card, Badge, Spinner, Button, Modal } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { formatDate, formatBudgetRange, getStatusColor, countWords } from '../../utils/helpers';
import { CONTRACT_STATUS_LABELS, CONTRACT_TYPES, VALIDATION } from '../../utils/constants';
import toast from 'react-hot-toast';
import './Dashboard.css';

const initialContractForm = {
  clientId: '',
  title: '',
  contractType: '',
  description: '',
  targetConditions: '',
  targetPersons: 1,
  budgetMin: 0,
  budgetMax: 0,
  startDate: new Date(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
};

const ProcurementDashboard = () => {
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

  // Create Contract Modal state
  const [createModal, setCreateModal] = useState(false);
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [contractForm, setContractForm] = useState(initialContractForm);
  const [formErrors, setFormErrors] = useState({});
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    fetchProcurementData();
  }, []);

  const fetchProcurementData = async () => {
    try {
      setLoading(true);
      const [contractsRes, statsRes] = await Promise.all([
        procurementAPI.getContracts(),
        procurementAPI.getStats().catch(() => ({ data: { data: {} } })),
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
      toast.error('Failed to load procurement data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (contractId) => {
    try {
      setActionLoading(contractId);
      await procurementAPI.approve(contractId);
      toast.success('Contract approved and sent to Legal Review');
      fetchProcurementData();
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
      await procurementAPI.reject(rejectModal.contract._id, { reason: rejectReason });
      toast.success('Contract rejected');
      setRejectModal({ open: false, contract: null });
      setRejectReason('');
      fetchProcurementData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject contract');
    } finally {
      setActionLoading(null);
    }
  };

  // Fetch clients for contract creation
  const fetchClients = async () => {
    try {
      setClientsLoading(true);
      const response = await procurementAPI.getClients();
      setClients(response.data.data.clients || []);
    } catch (error) {
      toast.error('Failed to load clients');
    } finally {
      setClientsLoading(false);
    }
  };

  // Open create contract modal
  const handleOpenCreateModal = () => {
    setContractForm(initialContractForm);
    setFormErrors({});
    setCreateModal(true);
    fetchClients();
  };

  // Handle form input changes
  const handleFormChange = (field, value) => {
    setContractForm((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    // Client is optional - Procurement Manager can create contracts without a client
    if (!contractForm.title.trim()) {
      errors.title = 'Contract title is required';
    } else if (contractForm.title.length > 200) {
      errors.title = 'Title cannot exceed 200 characters';
    }
    if (!contractForm.contractType) {
      errors.contractType = 'Contract type is required';
    }
    if (!contractForm.description.trim()) {
      errors.description = 'Description is required';
    } else if (countWords(contractForm.description) > VALIDATION.DESCRIPTION_MAX_WORDS) {
      errors.description = `Description cannot exceed ${VALIDATION.DESCRIPTION_MAX_WORDS} words`;
    }
    if (contractForm.targetConditions && countWords(contractForm.targetConditions) > VALIDATION.TARGET_CONDITIONS_MAX_WORDS) {
      errors.targetConditions = `Target conditions cannot exceed ${VALIDATION.TARGET_CONDITIONS_MAX_WORDS} words`;
    }
    if (contractForm.targetPersons < VALIDATION.MIN_TARGET_PERSONS || contractForm.targetPersons > VALIDATION.MAX_TARGET_PERSONS) {
      errors.targetPersons = `Must be between ${VALIDATION.MIN_TARGET_PERSONS} and ${VALIDATION.MAX_TARGET_PERSONS}`;
    }
    if (contractForm.budgetMin < 0) {
      errors.budgetMin = 'Budget cannot be negative';
    }
    if (contractForm.budgetMax < 0) {
      errors.budgetMax = 'Budget cannot be negative';
    }
    if (contractForm.budgetMax < contractForm.budgetMin) {
      errors.budgetMax = 'Maximum must be greater than or equal to minimum';
    }
    if (!contractForm.startDate) {
      errors.startDate = 'Start date is required';
    }
    if (!contractForm.endDate) {
      errors.endDate = 'End date is required';
    } else if (contractForm.endDate <= contractForm.startDate) {
      errors.endDate = 'End date must be after start date';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Create contract
  const handleCreateContract = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setCreateLoading(true);
      const contractData = {
        title: contractForm.title,
        contractType: contractForm.contractType,
        description: contractForm.description,
        targetConditions: contractForm.targetConditions,
        targetPersons: parseInt(contractForm.targetPersons),
        budget: {
          minimum: parseFloat(contractForm.budgetMin),
          maximum: parseFloat(contractForm.budgetMax),
          currency: 'EUR',
        },
        startDate: contractForm.startDate.toISOString(),
        endDate: contractForm.endDate.toISOString(),
      };

      // Only include clientId if a client is selected
      if (contractForm.clientId) {
        contractData.clientId = contractForm.clientId;
      }

      await procurementAPI.createContract(contractData);
      toast.success('Contract created successfully');
      setCreateModal(false);
      setContractForm(initialContractForm);
      fetchProcurementData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create contract');
    } finally {
      setCreateLoading(false);
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
        <div className="dashboard-header-content">
          <h1>Procurement Dashboard</h1>
          <p>Welcome back, {user?.firstName}! Review and manage procurement requests.</p>
        </div>
        <Button
          icon={<FiPlus />}
          onClick={handleOpenCreateModal}
        >
          Create Contract
        </Button>
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

      {/* Pending Procurement Requests */}
      <Card className="contracts-table-card">
        <div className="card-header-row">
          <h2>
            <FiFileText /> Requests Under Procurement Review
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
            <p>No pending procurement requests</p>
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
              placeholder="Please provide a reason for rejection..."
              rows={4}
              className="reject-reason-input"
            />
          </div>
        </div>
      </Modal>

      {/* Create Contract Modal */}
      <Modal
        isOpen={createModal}
        onClose={() => {
          setCreateModal(false);
          setContractForm(initialContractForm);
          setFormErrors({});
        }}
        title="Create Contract"
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setCreateModal(false);
                setContractForm(initialContractForm);
                setFormErrors({});
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateContract}
              loading={createLoading}
            >
              Create Contract
            </Button>
          </>
        }
      >
        <div className="create-contract-modal">
          {clientsLoading ? (
            <div className="modal-loading">
              <Spinner size="md" />
              <p>Loading clients...</p>
            </div>
          ) : (
            <div className="create-contract-form">
              {/* Client Selection */}
              <div className="form-section">
                <h4><FiUsers /> Select Client</h4>
                <div className="form-group">
                  <label className="form-label">
                    Client <span className="optional-label">(Optional)</span>
                  </label>
                  <select
                    className="form-select"
                    value={contractForm.clientId}
                    onChange={(e) => handleFormChange('clientId', e.target.value)}
                  >
                    <option value="">No client assigned</option>
                    {clients.map((client) => (
                      <option key={client._id} value={client._id}>
                        {client.firstName} {client.lastName} ({client.email})
                      </option>
                    ))}
                  </select>
                  <span className="input-hint">Leave empty to create contract without a client</span>
                </div>
              </div>

              {/* Basic Information */}
              <div className="form-section">
                <h4><FiFileText /> Basic Information</h4>
                <div className="form-group">
                  <label className="form-label">
                    Contract Title <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-input ${formErrors.title ? 'error' : ''}`}
                    placeholder="Enter contract title"
                    value={contractForm.title}
                    onChange={(e) => handleFormChange('title', e.target.value)}
                    maxLength={200}
                  />
                  {formErrors.title && (
                    <span className="form-error">{formErrors.title}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Contract Type <span className="required">*</span>
                  </label>
                  <select
                    className={`form-select ${formErrors.contractType ? 'error' : ''}`}
                    value={contractForm.contractType}
                    onChange={(e) => handleFormChange('contractType', e.target.value)}
                  >
                    <option value="">Select contract type...</option>
                    {CONTRACT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  {formErrors.contractType && (
                    <span className="form-error">{formErrors.contractType}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Description <span className="required">*</span>
                  </label>
                  <textarea
                    className={`form-textarea ${formErrors.description ? 'error' : ''}`}
                    placeholder="Describe the contract requirements..."
                    rows={4}
                    value={contractForm.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                  />
                  <div className="textarea-footer">
                    {formErrors.description && (
                      <span className="form-error">{formErrors.description}</span>
                    )}
                    <span className="word-count">
                      {countWords(contractForm.description)}/{VALIDATION.DESCRIPTION_MAX_WORDS} words
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Target Conditions</label>
                  <textarea
                    className={`form-textarea ${formErrors.targetConditions ? 'error' : ''}`}
                    placeholder="Specify target conditions (optional)..."
                    rows={3}
                    value={contractForm.targetConditions}
                    onChange={(e) => handleFormChange('targetConditions', e.target.value)}
                  />
                  <div className="textarea-footer">
                    {formErrors.targetConditions && (
                      <span className="form-error">{formErrors.targetConditions}</span>
                    )}
                    <span className="word-count">
                      {countWords(contractForm.targetConditions)}/{VALIDATION.TARGET_CONDITIONS_MAX_WORDS} words
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Target Persons <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    className={`form-input ${formErrors.targetPersons ? 'error' : ''}`}
                    min={VALIDATION.MIN_TARGET_PERSONS}
                    max={VALIDATION.MAX_TARGET_PERSONS}
                    value={contractForm.targetPersons}
                    onChange={(e) => handleFormChange('targetPersons', e.target.value)}
                  />
                  <span className="input-hint">
                    {VALIDATION.MIN_TARGET_PERSONS}-{VALIDATION.MAX_TARGET_PERSONS} persons
                  </span>
                  {formErrors.targetPersons && (
                    <span className="form-error">{formErrors.targetPersons}</span>
                  )}
                </div>
              </div>

              {/* Budget */}
              <div className="form-section">
                <h4><FiDollarSign /> Budget (EUR)</h4>
                <div className="budget-row">
                  <div className="form-group">
                    <label className="form-label">
                      Minimum <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      className={`form-input ${formErrors.budgetMin ? 'error' : ''}`}
                      min={0}
                      step={100}
                      value={contractForm.budgetMin}
                      onChange={(e) => handleFormChange('budgetMin', e.target.value)}
                      placeholder="0"
                    />
                    {formErrors.budgetMin && (
                      <span className="form-error">{formErrors.budgetMin}</span>
                    )}
                  </div>
                  <span className="budget-separator">-</span>
                  <div className="form-group">
                    <label className="form-label">
                      Maximum <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      className={`form-input ${formErrors.budgetMax ? 'error' : ''}`}
                      min={0}
                      step={100}
                      value={contractForm.budgetMax}
                      onChange={(e) => handleFormChange('budgetMax', e.target.value)}
                      placeholder="0"
                    />
                    {formErrors.budgetMax && (
                      <span className="form-error">{formErrors.budgetMax}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="form-section">
                <h4><FiCalendar /> Timeline</h4>
                <div className="date-row">
                  <div className="form-group">
                    <label className="form-label">
                      Start Date <span className="required">*</span>
                    </label>
                    <DatePicker
                      selected={contractForm.startDate}
                      onChange={(date) => handleFormChange('startDate', date)}
                      minDate={new Date()}
                      dateFormat="MMM dd, yyyy"
                      className={`form-input date-picker ${formErrors.startDate ? 'error' : ''}`}
                      placeholderText="Select start date"
                    />
                    {formErrors.startDate && (
                      <span className="form-error">{formErrors.startDate}</span>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      End Date <span className="required">*</span>
                    </label>
                    <DatePicker
                      selected={contractForm.endDate}
                      onChange={(date) => handleFormChange('endDate', date)}
                      minDate={contractForm.startDate || new Date()}
                      dateFormat="MMM dd, yyyy"
                      className={`form-input date-picker ${formErrors.endDate ? 'error' : ''}`}
                      placeholderText="Select end date"
                    />
                    {formErrors.endDate && (
                      <span className="form-error">{formErrors.endDate}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ProcurementDashboard;
