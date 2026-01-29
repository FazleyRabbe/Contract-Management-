import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiEdit,
  FiSend,
  FiCheck,
  FiX,
  FiCalendar,
  FiDollarSign,
  FiUsers,
  FiFileText,
  FiStar,
} from 'react-icons/fi';
import { contractAPI } from '../../services/api';
import { Button, Card, Badge, Spinner, Modal } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import {
  formatDate,
  formatCurrency,
  getStatusColor,
  timeAgo,
} from '../../utils/helpers';
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS } from '../../utils/constants';
import toast from 'react-hot-toast';
import './Contracts.css';

const ContractDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isClient, user } = useAuth();

  const [contract, setContract] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const fetchContract = async () => {
    try {
      const [contractRes, requestsRes] = await Promise.all([
        contractAPI.getById(id),
        contractAPI.getRequests(id).catch(() => ({ data: { data: { requests: [] } } })),
      ]);

      setContract(contractRes.data.data.contract);
      setRequests(requestsRes.data.data.requests || []);
    } catch (error) {
      toast.error('Failed to load contract');
      navigate('/contracts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContract();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSubmitForApproval = async () => {
    setActionLoading(true);
    try {
      await contractAPI.submit(id);
      toast.success('Contract submitted for approval');
      fetchContract();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await contractAPI.approve(id);
      toast.success('Contract approved and published');
      fetchContract();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      await contractAPI.reject(id, { reason: rejectReason });
      toast.success('Contract rejected');
      setRejectModal(false);
      setRejectReason('');
      fetchContract();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    setActionLoading(true);
    try {
      await contractAPI.acceptRequest(requestId, {});
      toast.success('Request accepted');
      fetchContract();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to accept request');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="contract-detail-loading">
        <Spinner size="lg" />
        <p>Loading contract...</p>
      </div>
    );
  }

  if (!contract) {
    return null;
  }

  const canEdit =
    (isClient && contract.client?._id === user?.id) ||
    isAdmin;
  const canApprove =
    isAdmin && contract.status === CONTRACT_STATUS.PENDING_APPROVAL;
  const canSubmit =
    isClient &&
    contract.status === CONTRACT_STATUS.DRAFT &&
    contract.client?._id === user?.id;

  return (
    <div className="contract-detail-page">
      <div className="page-header">
        <div className="page-header-content">
          <Button
            variant="ghost"
            size="sm"
            icon={<FiArrowLeft />}
            onClick={() => navigate('/contracts')}
          >
            Back to Contracts
          </Button>
          <div className="contract-header">
            <div>
              <Badge
                variant={getStatusColor(contract.status).replace('badge-', '')}
                size="lg"
              >
                {CONTRACT_STATUS_LABELS[contract.status]?.label || contract.status}
              </Badge>
              <h1>{contract.title}</h1>
              <p className="contract-ref">{contract.referenceNumber}</p>
            </div>
          </div>
        </div>
        <div className="page-header-actions">
          {canSubmit && (
            <Button
              icon={<FiSend />}
              onClick={handleSubmitForApproval}
              loading={actionLoading}
            >
              Submit for Approval
            </Button>
          )}
          {canEdit && ['draft', 'pending_approval'].includes(contract.status) && (
            <Button
              variant="secondary"
              icon={<FiEdit />}
              onClick={() => navigate(`/contracts/${id}/edit`)}
            >
              Edit
            </Button>
          )}
          {canApprove && (
            <>
              <Button
                variant="success"
                icon={<FiCheck />}
                onClick={handleApprove}
                loading={actionLoading}
              >
                Approve
              </Button>
              <Button
                variant="danger"
                icon={<FiX />}
                onClick={() => setRejectModal(true)}
              >
                Reject
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="contract-detail-grid">
        {/* Main Content */}
        <div className="contract-main">
          <Card>
            <Card.Header>
              <h3>
                <FiFileText /> Contract Details
              </h3>
            </Card.Header>
            <Card.Body>
              <div className="detail-section">
                <h4>Description</h4>
                <p>{contract.description}</p>
              </div>

              {contract.targetConditions && (
                <div className="detail-section">
                  <h4>Target Conditions</h4>
                  <p>{contract.targetConditions}</p>
                </div>
              )}

              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Contract Type</span>
                  <span className="detail-value">{contract.contractType}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Target Persons</span>
                  <span className="detail-value">{contract.targetPersons}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Created</span>
                  <span className="detail-value">{timeAgo(contract.createdAt)}</span>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Selected Offer & Provider (from new workflow) */}
          {contract.workflow?.coordinator?.selectedOffer && (
            <Card className="selected-offer-card">
              <Card.Header>
                <h3>
                  <FiStar /> Selected Provider & Offer
                </h3>
              </Card.Header>
              <Card.Body>
                <div className="selected-provider-info">
                  <div className="provider-avatar">
                    {contract.workflow.coordinator.selectedOffer.providerDetails?.companyName?.charAt(0) ||
                     contract.workflow.coordinator.selectedOffer.provider?.name?.charAt(0) || 'P'}
                  </div>
                  <div className="provider-details">
                    <p className="provider-name">
                      {contract.workflow.coordinator.selectedOffer.providerDetails?.companyName ||
                       contract.workflow.coordinator.selectedOffer.provider?.name || 'Provider'}
                    </p>
                    {contract.workflow.coordinator.selectedOffer.providerDetails?.role && (
                      <p className="provider-role">
                        {contract.workflow.coordinator.selectedOffer.providerDetails.role}
                      </p>
                    )}
                    {contract.workflow.coordinator.selectedOffer.providerDetails?.email && (
                      <p className="provider-email">
                        {contract.workflow.coordinator.selectedOffer.providerDetails.email}
                      </p>
                    )}
                    {contract.workflow.coordinator.selectedOffer.providerDetails?.category && (
                      <p className="provider-category">
                        Category: {contract.workflow.coordinator.selectedOffer.providerDetails.category}
                      </p>
                    )}
                  </div>
                </div>

                <div className="offer-details-section">
                  <h4>Offer Details</h4>
                  <div className="offer-detail-item">
                    <span className="offer-label">Amount:</span>
                    <span className="offer-value offer-amount">
                      {formatCurrency(contract.workflow.coordinator.selectedOffer.offerAmount?.amount)}{' '}
                      {contract.workflow.coordinator.selectedOffer.offerAmount?.currency || 'EUR'}
                    </span>
                  </div>
                  {contract.workflow.coordinator.selectedOffer.proposedTimeline && (
                    <>
                      <div className="offer-detail-item">
                        <span className="offer-label">Proposed Start:</span>
                        <span className="offer-value">
                          {formatDate(contract.workflow.coordinator.selectedOffer.proposedTimeline.startDate)}
                        </span>
                      </div>
                      <div className="offer-detail-item">
                        <span className="offer-label">Proposed End:</span>
                        <span className="offer-value">
                          {formatDate(contract.workflow.coordinator.selectedOffer.proposedTimeline.endDate)}
                        </span>
                      </div>
                    </>
                  )}
                  {contract.workflow.coordinator.selectedOffer.description && (
                    <div className="offer-description">
                      <span className="offer-label">Description:</span>
                      <p>{contract.workflow.coordinator.selectedOffer.description}</p>
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Service Provider Requests */}
          {['published', 'searching_provider', 'provider_assigned'].includes(
            contract.status
          ) && (
            <Card className="requests-card">
              <Card.Header>
                <h3>
                  <FiUsers /> Service Provider Requests
                </h3>
              </Card.Header>
              <Card.Body>
                {requests.length === 0 ? (
                  <div className="no-requests">
                    <p>No requests received yet</p>
                  </div>
                ) : (
                  <div className="requests-list">
                    {requests.map((request) => (
                      <div key={request._id} className="request-item">
                        <div className="request-header">
                          <div className="provider-info">
                            <div className="provider-avatar">
                              {request.serviceProvider?.user?.firstName?.charAt(0)}
                              {request.serviceProvider?.user?.lastName?.charAt(0)}
                            </div>
                            <div>
                              <h4>
                                {request.serviceProvider?.user?.firstName}{' '}
                                {request.serviceProvider?.user?.lastName}
                              </h4>
                              <p>{request.serviceProvider?.coreRole}</p>
                            </div>
                          </div>
                          <Badge
                            variant={
                              request.status === 'accepted'
                                ? 'success'
                                : request.status === 'rejected'
                                ? 'error'
                                : 'warning'
                            }
                          >
                            {request.status}
                          </Badge>
                        </div>

                        <div className="request-details">
                          <div className="request-detail-item">
                            <span>Service:</span>
                            <strong>{request.serviceName}</strong>
                          </div>
                          <div className="request-detail-item">
                            <span>Budget:</span>
                            <strong>{formatCurrency(request.budget?.amount)}</strong>
                          </div>
                          <div className="request-detail-item">
                            <span>Persons:</span>
                            <strong>{request.numberOfPersons}</strong>
                          </div>
                          <div className="request-detail-item">
                            <span>Timeline:</span>
                            <strong>
                              {formatDate(request.timeline?.startTime)} -{' '}
                              {formatDate(request.timeline?.endTime)}
                            </strong>
                          </div>
                        </div>

                        <p className="request-description">{request.description}</p>

                        {request.deliverables?.length > 0 && (
                          <div className="deliverables">
                            <h5>Deliverables:</h5>
                            <ul>
                              {request.deliverables.map((d, i) => (
                                <li key={i}>{d.title}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {request.status === 'pending' && isClient && (
                          <div className="request-actions">
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => handleAcceptRequest(request._id)}
                              loading={actionLoading}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                contractAPI.rejectRequest(request._id, {})
                              }
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="contract-sidebar">
          <Card>
            <Card.Header>
              <h3>
                <FiDollarSign /> Budget
              </h3>
            </Card.Header>
            <Card.Body>
              <div className="budget-display">
                <span className="budget-range">
                  {formatCurrency(contract.budget?.minimum)} -{' '}
                  {formatCurrency(contract.budget?.maximum)}
                </span>
                <span className="budget-currency">{contract.budget?.currency}</span>
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              <h3>
                <FiCalendar /> Timeline
              </h3>
            </Card.Header>
            <Card.Body>
              <div className="timeline-display">
                <div className="timeline-item">
                  <span className="timeline-label">Start Date</span>
                  <span className="timeline-value">
                    {formatDate(contract.startDate)}
                  </span>
                </div>
                <div className="timeline-item">
                  <span className="timeline-label">End Date</span>
                  <span className="timeline-value">
                    {formatDate(contract.endDate)}
                  </span>
                </div>
                <div className="timeline-item">
                  <span className="timeline-label">Duration</span>
                  <span className="timeline-value">
                    {contract.durationDays} days
                  </span>
                </div>
              </div>
            </Card.Body>
          </Card>

          {contract.client && (
            <Card>
              <Card.Header>
                <h3>
                  <FiUsers /> Client
                </h3>
              </Card.Header>
              <Card.Body>
                <div className="client-info">
                  <div className="client-avatar">
                    {contract.client.firstName?.charAt(0)}
                    {contract.client.lastName?.charAt(0)}
                  </div>
                  <div>
                    <p className="client-name">
                      {contract.client.firstName} {contract.client.lastName}
                    </p>
                    <p className="client-email">{contract.client.email}</p>
                  </div>
                </div>
              </Card.Body>
            </Card>
          )}

          {contract.assignedProvider && (
            <Card>
              <Card.Header>
                <h3>
                  <FiUsers /> Assigned Provider
                </h3>
              </Card.Header>
              <Card.Body>
                <div className="provider-info-card">
                  <div className="provider-avatar">
                    {contract.assignedProvider.user?.firstName?.charAt(0)}
                    {contract.assignedProvider.user?.lastName?.charAt(0)}
                  </div>
                  <div>
                    <p className="provider-name">
                      {contract.assignedProvider.user?.firstName}{' '}
                      {contract.assignedProvider.user?.lastName}
                    </p>
                    <p className="provider-role">
                      {contract.assignedProvider.coreRole}
                    </p>
                    <div className="provider-rating">
                      <FiStar />
                      <span>
                        {contract.assignedProvider.rating?.average?.toFixed(1) ||
                          '0.0'}
                      </span>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModal}
        onClose={() => setRejectModal(false)}
        title="Reject Contract"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReject} loading={actionLoading}>
              Reject
            </Button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Rejection Reason</label>
          <textarea
            className="form-textarea"
            placeholder="Enter the reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
        </div>
      </Modal>
    </div>
  );
};

export default ContractDetail;
