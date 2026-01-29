import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiFileText,
  FiCheckCircle,
  FiUsers,
  FiEye,
  FiCheck,
  FiMoreVertical,
  FiBriefcase,
  FiDollarSign,
  FiCalendar,
  FiStar,
} from 'react-icons/fi';
import { coordinatorAPI } from '../../services/api';
import { Card, Badge, Spinner, Button, Modal } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { formatDate, formatBudgetRange, formatCurrency, getStatusColor } from '../../utils/helpers';
import { CONTRACT_STATUS_LABELS, OFFER_STATUS_LABELS } from '../../utils/constants';
import toast from 'react-hot-toast';
import './Dashboard.css';

const ContractCoordinatorDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState([]);
  const [stats, setStats] = useState({
    openContractsCount: 0,
    totalPendingOffers: 0,
    selectedToday: 0,
  });
  const [activeMenu, setActiveMenu] = useState(null);

  // Offers modal state
  const [offersModal, setOffersModal] = useState({ open: false, contract: null });
  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [selectingOffer, setSelectingOffer] = useState(null);

  // Selection confirmation modal
  const [confirmModal, setConfirmModal] = useState({ open: false, offer: null });
  const [selectionNotes, setSelectionNotes] = useState('');

  useEffect(() => {
    fetchCoordinatorData();
  }, []);

  const fetchCoordinatorData = async () => {
    try {
      setLoading(true);
      const [contractsRes, statsRes] = await Promise.all([
        coordinatorAPI.getContracts(),
        coordinatorAPI.getStats().catch(() => ({ data: { data: {} } })),
      ]);

      const data = contractsRes.data.data || [];
      setContracts(data);

      const apiStats = statsRes.data?.data || {};
      setStats({
        openContractsCount: apiStats.openContractsCount ?? data.length,
        totalPendingOffers: apiStats.totalPendingOffers ?? 0,
        selectedToday: apiStats.selectedToday ?? 0,
      });
    } catch (error) {
      toast.error('Failed to load coordinator data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewOffers = async (contract) => {
    setOffersModal({ open: true, contract });
    setOffersLoading(true);
    try {
      const response = await coordinatorAPI.getContract(contract._id);
      setOffers(response.data.data.offers || []);
    } catch (error) {
      toast.error('Failed to load offers');
      setOffers([]);
    } finally {
      setOffersLoading(false);
    }
  };

  const handleSelectOffer = async () => {
    if (!confirmModal.offer) return;

    try {
      setSelectingOffer(confirmModal.offer._id);
      await coordinatorAPI.selectOffer(
        offersModal.contract._id,
        confirmModal.offer._id,
        { notes: selectionNotes }
      );
      toast.success('Offer selected and sent to Admin for final approval');
      setConfirmModal({ open: false, offer: null });
      setSelectionNotes('');
      setOffersModal({ open: false, contract: null });
      fetchCoordinatorData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to select offer');
    } finally {
      setSelectingOffer(null);
    }
  };

  const closeOffersModal = () => {
    setOffersModal({ open: false, contract: null });
    setOffers([]);
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
        <h1>Contract Coordinator Dashboard</h1>
        <p>Welcome back, {user?.firstName}! Review offers and select providers for contracts.</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <Card className="stat-card">
          <div className="stat-icon pending">
            <FiFileText />
          </div>
          <div className="stat-content">
            <h3>{stats.openContractsCount}</h3>
            <p>Open for Offers</p>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="stat-icon info">
            <FiUsers />
          </div>
          <div className="stat-content">
            <h3>{stats.totalPendingOffers}</h3>
            <p>Pending Offers</p>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="stat-icon success">
            <FiCheckCircle />
          </div>
          <div className="stat-content">
            <h3>{stats.selectedToday}</h3>
            <p>Selected Today</p>
          </div>
        </Card>
      </div>

      {/* Contracts Open for Offers */}
      <Card className="contracts-table-card">
        <div className="card-header-row">
          <h2>
            <FiBriefcase /> Contracts Open for Offers
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
            <p>No contracts currently open for offers</p>
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
                  <th>Offers</th>
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
                      <Badge variant={contract.pendingOfferCount > 0 ? 'info' : 'gray'}>
                        {contract.pendingOfferCount || 0} offers
                      </Badge>
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
                          title="View Contract"
                        >
                          <FiEye />
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          className="action-btn"
                          onClick={() => handleViewOffers(contract)}
                          title="View Offers"
                          disabled={contract.pendingOfferCount === 0}
                        >
                          <FiUsers />
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
                                  handleViewOffers(contract);
                                  setActiveMenu(null);
                                }}
                                disabled={contract.pendingOfferCount === 0}
                              >
                                <FiUsers /> View Offers ({contract.pendingOfferCount})
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

      {/* View Offers Modal */}
      <Modal
        isOpen={offersModal.open}
        onClose={closeOffersModal}
        title={`Offers for: ${offersModal.contract?.title || ''}`}
        size="lg"
      >
        <div className="offers-modal-content">
          {offersLoading ? (
            <div className="offers-loading">
              <Spinner size="md" />
              <p>Loading offers...</p>
            </div>
          ) : offers.length === 0 ? (
            <div className="offers-empty">
              <FiUsers className="empty-icon" />
              <p>No offers received for this contract yet</p>
            </div>
          ) : (
            <div className="offers-list">
              {offers.map((offer) => (
                <div key={offer._id} className={`offer-card ${offer.status}`}>
                  <div className="offer-header">
                    <div className="provider-info">
                      <h4>{offer.provider?.name || 'Unknown Provider'}</h4>
                      <div className="provider-meta">
                        {offer.provider?.rating && (
                          <span className="provider-rating">
                            <FiStar /> {offer.provider.rating.toFixed(1)}
                          </span>
                        )}
                        {offer.provider?.category && (
                          <span className="provider-category">{offer.provider.category}</span>
                        )}
                        {offer.provider?.verified && (
                          <Badge variant="success" size="sm">Verified</Badge>
                        )}
                      </div>
                    </div>
                    <Badge variant={OFFER_STATUS_LABELS[offer.status]?.color || 'gray'}>
                      {OFFER_STATUS_LABELS[offer.status]?.label || offer.status}
                    </Badge>
                  </div>

                  <div className="offer-details">
                    <div className="offer-detail">
                      <FiDollarSign />
                      <span>
                        <strong>Offer Amount:</strong> {formatCurrency(offer.offerAmount?.amount, offer.offerAmount?.currency)}
                      </span>
                    </div>
                    <div className="offer-detail">
                      <FiCalendar />
                      <span>
                        <strong>Timeline:</strong> {formatDate(offer.proposedTimeline?.startDate)} - {formatDate(offer.proposedTimeline?.endDate)}
                      </span>
                    </div>
                    {offer.provider?.tasksCompleted > 0 && (
                      <div className="offer-detail">
                        <FiCheckCircle />
                        <span>
                          <strong>Tasks Completed:</strong> {offer.provider.tasksCompleted}
                        </span>
                      </div>
                    )}
                  </div>

                  {offer.description && (
                    <div className="offer-description">
                      <p>{offer.description}</p>
                    </div>
                  )}

                  {offer.deliverables && offer.deliverables.length > 0 && (
                    <div className="offer-deliverables">
                      <strong>Deliverables:</strong>
                      <ul>
                        {offer.deliverables.map((d, idx) => (
                          <li key={idx}>{d.title}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {offer.status === 'pending' && (
                    <div className="offer-actions">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => setConfirmModal({ open: true, offer })}
                        disabled={selectingOffer === offer._id}
                      >
                        <FiCheck /> Select This Offer
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Confirm Selection Modal */}
      <Modal
        isOpen={confirmModal.open}
        onClose={() => {
          setConfirmModal({ open: false, offer: null });
          setSelectionNotes('');
        }}
        title="Confirm Offer Selection"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setConfirmModal({ open: false, offer: null });
                setSelectionNotes('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={handleSelectOffer}
              disabled={selectingOffer}
            >
              {selectingOffer ? 'Selecting...' : 'Confirm Selection'}
            </Button>
          </>
        }
      >
        <div className="confirm-modal-content">
          <p>
            You are about to select the offer from{' '}
            <strong>{confirmModal.offer?.provider?.name}</strong> for{' '}
            <strong>{formatCurrency(confirmModal.offer?.offerAmount?.amount)}</strong>.
          </p>
          <p className="warning-text">
            This will reject all other pending offers and send the contract to Admin for final approval.
          </p>
          <div className="form-group">
            <label htmlFor="selectionNotes">Selection Notes (Optional)</label>
            <textarea
              id="selectionNotes"
              value={selectionNotes}
              onChange={(e) => setSelectionNotes(e.target.value)}
              placeholder="Add any notes about why this offer was selected..."
              rows={3}
              className="selection-notes-input"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ContractCoordinatorDashboard;
