import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FiPlus,
  FiSearch,
  FiFilter,
  FiChevronLeft,
  FiChevronRight,
  FiEye,
  FiEdit,
  FiTrash2,
  FiMoreVertical,
  FiCheck,
  FiX,
  FiUsers,
  FiDollarSign,
  FiCalendar,
  FiStar,
  FiCheckCircle,
  FiDownload,
} from 'react-icons/fi';
import { contractAPI, procurementAPI, legalAPI, coordinatorAPI, adminAPI } from '../../services/api';
import { Button, Select, Card, Badge, Spinner, Modal } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import {
  formatDate,
  formatBudgetRange,
  formatCurrency,
  getStatusColor,
  debounce,
} from '../../utils/helpers';
import { CONTRACT_TYPES, CONTRACT_STATUS_LABELS, OFFER_STATUS_LABELS } from '../../utils/constants';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import './Contracts.css';

const ContractList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin, isClient, isProcurementManager, isLegalCounsel, isContractCoordinator } = useAuth();

  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    contractType: searchParams.get('contractType') || '',
  });

  const [showFilters, setShowFilters] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, contract: null });
  const [rejectModal, setRejectModal] = useState({ open: false, contract: null });
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);

  // Coordinator: Offers modal state
  const [offersModal, setOffersModal] = useState({ open: false, contract: null });
  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [selectingOffer, setSelectingOffer] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, offer: null });
  const [selectionNotes, setSelectionNotes] = useState('');

  // Admin: Final approval modal state
  const [adminRejectModal, setAdminRejectModal] = useState({ open: false, contract: null });
  const [adminRejectReason, setAdminRejectReason] = useState('');

  // Admin: PDF download state
  const [downloadLoading, setDownloadLoading] = useState(false);

  useEffect(() => {
    fetchContracts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, filters.status, filters.contractType, isProcurementManager, isLegalCounsel, isContractCoordinator, isAdmin]);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.contractType && { contractType: filters.contractType }),
        sort: '-createdAt',
      };

      let response;
      // Workflow roles only see their specific pending contracts
      if (isProcurementManager) {
        response = await procurementAPI.getContracts(params);
      } else if (isLegalCounsel) {
        response = await legalAPI.getContracts(params);
      } else if (isContractCoordinator) {
        response = await coordinatorAPI.getContracts(params);
      } else {
        response = await contractAPI.getAll(params);
      }

      setContracts(response.data.data);
      setPagination((prev) => ({
        ...prev,
        ...response.data.pagination,
      }));
    } catch (error) {
      toast.error('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  const debouncedSearch = useCallback(
    () => debounce(() => {
      setPagination((prev) => ({ ...prev, page: 1 }));
      fetchContracts();
    }, 500)(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleSearchChange = (e) => {
    setFilters((prev) => ({ ...prev, search: e.target.value }));
    debouncedSearch();
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));

    // Update URL params
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const handleDelete = async () => {
    if (!deleteModal.contract) return;

    try {
      await contractAPI.delete(deleteModal.contract._id);
      toast.success('Contract deleted successfully');
      setDeleteModal({ open: false, contract: null });
      fetchContracts();
    } catch (error) {
      toast.error('Failed to delete contract');
    }
  };

  // Approve contract (Procurement or Legal)
  const handleApprove = async (contractId) => {
    try {
      setActionLoading(contractId);
      if (isProcurementManager) {
        await procurementAPI.approve(contractId);
        toast.success('Contract approved and sent to Legal Review');
      } else if (isLegalCounsel) {
        await legalAPI.approve(contractId);
        toast.success('Contract approved and opened for provider offers');
      }
      fetchContracts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve contract');
    } finally {
      setActionLoading(null);
    }
  };

  // Reject contract (Procurement or Legal)
  const handleReject = async () => {
    if (!rejectModal.contract || !rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      setActionLoading(rejectModal.contract._id);
      if (isProcurementManager) {
        await procurementAPI.reject(rejectModal.contract._id, { reason: rejectReason });
      } else if (isLegalCounsel) {
        await legalAPI.reject(rejectModal.contract._id, { reason: rejectReason });
      }
      toast.success('Contract rejected');
      setRejectModal({ open: false, contract: null });
      setRejectReason('');
      fetchContracts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject contract');
    } finally {
      setActionLoading(null);
    }
  };

  // Coordinator: View offers for a contract
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

  // Coordinator: Select an offer
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
      fetchContracts();
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

  // Admin: Final approve contract
  const handleFinalApprove = async (contractId) => {
    try {
      setActionLoading(contractId);
      await adminAPI.finalApprove(contractId);
      toast.success('Contract approved successfully!');
      fetchContracts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve contract');
    } finally {
      setActionLoading(null);
    }
  };

  // Admin: Final reject contract
  const handleFinalReject = async () => {
    if (!adminRejectModal.contract || !adminRejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      setActionLoading(adminRejectModal.contract._id);
      await adminAPI.finalReject(adminRejectModal.contract._id, { reason: adminRejectReason });
      toast.success('Contract rejected');
      setAdminRejectModal({ open: false, contract: null });
      setAdminRejectReason('');
      fetchContracts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject contract');
    } finally {
      setActionLoading(null);
    }
  };

  // Admin: Download current table view as PDF
  const handleDownloadContracts = () => {
    try {
      setDownloadLoading(true);

      if (contracts.length === 0) {
        toast.error('No contracts found to export');
        setDownloadLoading(false);
        return;
      }

      // Create PDF document
      const doc = new jsPDF('landscape', 'mm', 'a4');

      // Build title based on filters
      let title = 'Contracts Report';
      const filterParts = [];
      if (filters.status) {
        filterParts.push(`Status: ${CONTRACT_STATUS_LABELS[filters.status]?.label || filters.status}`);
      }
      if (filters.contractType) {
        filterParts.push(`Type: ${filters.contractType}`);
      }
      if (filters.search) {
        filterParts.push(`Search: "${filters.search}"`);
      }

      // Add title
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text(title, 14, 22);

      // Add filter info and generation date
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      let yPos = 30;
      if (filterParts.length > 0) {
        doc.text(`Filters: ${filterParts.join(' | ')}`, 14, yPos);
        yPos += 6;
      }
      doc.text(`Generated on: ${formatDate(new Date())}`, 14, yPos);
      yPos += 6;
      doc.text(`Showing: ${contracts.length} of ${pagination.total} contracts`, 14, yPos);
      yPos += 8;

      // Define table columns
      const tableColumn = [
        'Ref. Number',
        'Title',
        'Type',
        'Status',
        'Client',
        'Budget Range',
        'Start Date',
        'End Date',
        'Created At'
      ];

      // Prepare table rows from current contracts in table
      const tableRows = contracts.map(contract => [
        contract.referenceNumber || 'N/A',
        contract.title?.substring(0, 30) + (contract.title?.length > 30 ? '...' : '') || 'N/A',
        contract.contractType || 'N/A',
        CONTRACT_STATUS_LABELS[contract.status]?.label || contract.status?.replace(/_/g, ' ').toUpperCase() || 'N/A',
        contract.client ? `${contract.client.firstName || ''} ${contract.client.lastName || ''}`.trim() : 'No Client',
        formatBudgetRange(contract.budget?.minimum, contract.budget?.maximum) || 'N/A',
        formatDate(contract.startDate) || 'N/A',
        formatDate(contract.endDate) || 'N/A',
        formatDate(contract.createdAt) || 'N/A'
      ]);

      // Generate table
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: yPos,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 40 },
          2: { cellWidth: 25 },
          3: { cellWidth: 30 },
          4: { cellWidth: 30 },
          5: { cellWidth: 30 },
          6: { cellWidth: 25 },
          7: { cellWidth: 25 },
          8: { cellWidth: 25 },
        },
      });

      // Generate filename based on filters
      let filename = 'contracts';
      if (filters.status) {
        filename += `-${filters.status}`;
      }
      if (filters.contractType) {
        filename += `-${filters.contractType.toLowerCase().replace(/\s+/g, '-')}`;
      }
      filename += `-${new Date().toISOString().split('T')[0]}.pdf`;

      // Save the PDF
      doc.save(filename);
      toast.success(`Successfully exported ${contracts.length} contracts to PDF`);
    } catch (error) {
      console.error('Failed to download contracts:', error);
      toast.error('Failed to download contracts');
    } finally {
      setDownloadLoading(false);
    }
  };

  const statusOptions = Object.entries(CONTRACT_STATUS_LABELS).map(
    ([value, { label }]) => ({
      value,
      label,
    })
  );

  // Get page title based on role
  const getPageTitle = () => {
    if (isProcurementManager) return 'Procurement Review';
    if (isLegalCounsel) return 'Legal Review';
    if (isContractCoordinator) return 'Contract Coordination';
    return 'Contracts';
  };

  const getPageDescription = () => {
    if (isProcurementManager) return 'Review and approve/reject procurement requests';
    if (isLegalCounsel) return 'Review contracts for legal compliance';
    if (isContractCoordinator) return 'Coordinate and manage contract workflow';
    return 'Manage and track all your contracts';
  };

  // Check if user can create contracts
  const canCreateContract = isClient;

  // Check if user can delete contracts
  const canDeleteContract = isClient || isAdmin;

  return (
    <div className="contracts-page">
      <div className="page-header">
        <div className="page-header-content">
          <h1>{getPageTitle()}</h1>
          <p>{getPageDescription()}</p>
        </div>
        <div className="page-header-actions">
          {isAdmin && (
            <Button
              variant="secondary"
              icon={<FiDownload />}
              onClick={handleDownloadContracts}
              loading={downloadLoading}
              disabled={contracts.length === 0}
            >
              Download (PDF)
            </Button>
          )}
          {canCreateContract && (
            <Button icon={<FiPlus />} onClick={() => navigate('/contracts/new')}>
              Create Contract
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="filters-card">
        <div className="filters-row">
          <div className="search-input">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search contracts..."
              value={filters.search}
              onChange={handleSearchChange}
            />
          </div>

          <Button
            variant="secondary"
            icon={<FiFilter />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
        </div>

        {showFilters && (
          <div className="filters-expanded">
            <Select
              placeholder="All Statuses"
              options={statusOptions}
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            />
            <Select
              placeholder="All Types"
              options={CONTRACT_TYPES}
              value={filters.contractType}
              onChange={(e) => handleFilterChange('contractType', e.target.value)}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilters({ search: '', status: '', contractType: '' });
                setSearchParams({});
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </Card>

      {/* Contracts Table */}
      <Card className="contracts-table-card">
        {loading ? (
          <div className="table-loading">
            <Spinner size="lg" />
          </div>
        ) : contracts.length === 0 ? (
          <div className="table-empty">
            <p>{isProcurementManager ? 'No contracts pending procurement review' : isLegalCounsel ? 'No contracts pending legal review' : isContractCoordinator ? 'No contracts open for offers' : 'No contracts found'}</p>
            {canCreateContract && (
              <Button icon={<FiPlus />} onClick={() => navigate('/contracts/new')}>
                Create Your First Contract
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="contracts-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Budget</th>
                    {isAdmin && filters.status === 'pending_final_approval' ? (
                      <>
                        <th>Selected Provider</th>
                        <th>Offer Amount</th>
                      </>
                    ) : isContractCoordinator ? (
                      <th>Offers</th>
                    ) : (
                      <th>Duration</th>
                    )}
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
                      {isAdmin && filters.status === 'pending_final_approval' ? (
                        <>
                          <td>{contract.selectedOffer?.provider?.name || 'N/A'}</td>
                          <td>{formatCurrency(contract.selectedOffer?.offerAmount?.amount, contract.selectedOffer?.offerAmount?.currency)}</td>
                        </>
                      ) : isContractCoordinator ? (
                        <td>
                          <Badge variant={contract.pendingOfferCount > 0 ? 'info' : 'gray'}>
                            {contract.pendingOfferCount || 0} offers
                          </Badge>
                        </td>
                      ) : (
                        <td>
                          {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
                        </td>
                      )}
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
                          {/* Edit button - Client/Admin for draft, Procurement for pending_procurement, Legal for pending_legal */}
                          {((isClient || isAdmin) && ['draft', 'pending_approval'].includes(contract.status)) ||
                           (isProcurementManager && contract.status === 'pending_procurement') ||
                           (isLegalCounsel && contract.status === 'pending_legal') ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="action-btn"
                                onClick={() =>
                                  navigate(`/contracts/${contract._id}/edit`)
                                }
                                title="Edit"
                              >
                                <FiEdit />
                              </Button>
                            ) : null}
                          {/* View Offers button for Contract Coordinator */}
                          {isContractCoordinator && contract.status === 'open_for_offers' && (
                            <Button
                              variant="primary"
                              size="sm"
                              className="action-btn"
                              onClick={() => handleViewOffers(contract)}
                              title="View Offers"
                            >
                              <FiUsers />
                            </Button>
                          )}
                          {/* Admin: Final Approve/Reject buttons for pending_final_approval */}
                          {isAdmin && contract.status === 'pending_final_approval' && (
                            <>
                              <Button
                                variant="success"
                                size="sm"
                                className="action-btn"
                                onClick={() => handleFinalApprove(contract._id)}
                                disabled={actionLoading === contract._id}
                                title="Final Approve"
                              >
                                <FiCheck />
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                className="action-btn"
                                onClick={() => setAdminRejectModal({ open: true, contract })}
                                disabled={actionLoading === contract._id}
                                title="Reject"
                              >
                                <FiX />
                              </Button>
                            </>
                          )}
                          {/* Approve/Reject buttons for Procurement Manager or Legal Counsel */}
                          {((isProcurementManager && contract.status === 'pending_procurement') ||
                            (isLegalCounsel && contract.status === 'pending_legal')) && (
                            <>
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
                            </>
                          )}
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
                                {/* Edit in dropdown - same logic as button */}
                                {(((isClient || isAdmin) && ['draft', 'pending_approval'].includes(contract.status)) ||
                                  (isProcurementManager && contract.status === 'pending_procurement') ||
                                  (isLegalCounsel && contract.status === 'pending_legal')) && (
                                  <button
                                    className="dropdown-item"
                                    onClick={() => {
                                      navigate(`/contracts/${contract._id}/edit`);
                                      setActiveMenu(null);
                                    }}
                                  >
                                    <FiEdit /> Edit
                                  </button>
                                )}
                                {/* View Offers in dropdown for Contract Coordinator */}
                                {isContractCoordinator && contract.status === 'open_for_offers' && (
                                  <button
                                    className="dropdown-item"
                                    onClick={() => {
                                      handleViewOffers(contract);
                                      setActiveMenu(null);
                                    }}
                                  >
                                    <FiUsers /> View Offers ({contract.pendingOfferCount || 0})
                                  </button>
                                )}
                                {/* Admin: Final Approve/Reject in dropdown for pending_final_approval */}
                                {isAdmin && contract.status === 'pending_final_approval' && (
                                  <>
                                    <button
                                      className="dropdown-item success"
                                      onClick={() => {
                                        handleFinalApprove(contract._id);
                                        setActiveMenu(null);
                                      }}
                                    >
                                      <FiCheck /> Final Approve
                                    </button>
                                    <button
                                      className="dropdown-item danger"
                                      onClick={() => {
                                        setAdminRejectModal({ open: true, contract });
                                        setActiveMenu(null);
                                      }}
                                    >
                                      <FiX /> Reject
                                    </button>
                                  </>
                                )}
                                {/* Approve/Reject in dropdown for Procurement Manager or Legal Counsel */}
                                {((isProcurementManager && contract.status === 'pending_procurement') ||
                                  (isLegalCounsel && contract.status === 'pending_legal')) && (
                                  <>
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
                                  </>
                                )}
                                {/* Delete only for client/admin */}
                                {canDeleteContract && (
                                  <button
                                    className="dropdown-item danger"
                                    onClick={() => {
                                      setDeleteModal({ open: true, contract });
                                      setActiveMenu(null);
                                    }}
                                  >
                                    <FiTrash2 /> Delete
                                  </button>
                                )}
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

            {/* Pagination */}
            <div className="table-pagination">
              <div className="pagination-info">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} contracts
              </div>
              <div className="pagination-controls">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!pagination.hasPrevPage}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                >
                  <FiChevronLeft />
                </Button>
                <span className="pagination-pages">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!pagination.hasNextPage}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                >
                  <FiChevronRight />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, contract: null })}
        title="Delete Contract"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeleteModal({ open: false, contract: null })}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p>
          Are you sure you want to delete{' '}
          <strong>{deleteModal.contract?.title}</strong>? This action cannot be
          undone.
        </p>
      </Modal>

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

      {/* Coordinator: View Offers Modal */}
      {isContractCoordinator && (
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
      )}

      {/* Coordinator: Confirm Selection Modal */}
      {isContractCoordinator && (
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
      )}

      {/* Admin: Final Reject Contract Modal */}
      <Modal
        isOpen={adminRejectModal.open}
        onClose={() => {
          setAdminRejectModal({ open: false, contract: null });
          setAdminRejectReason('');
        }}
        title="Reject Contract"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setAdminRejectModal({ open: false, contract: null });
                setAdminRejectReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleFinalReject}
              disabled={!adminRejectReason.trim() || actionLoading}
            >
              {actionLoading ? 'Rejecting...' : 'Reject Contract'}
            </Button>
          </>
        }
      >
        <div className="reject-modal-content">
          <p>
            You are about to reject the contract{' '}
            <strong>{adminRejectModal.contract?.title}</strong>.
          </p>
          <div className="form-group">
            <label htmlFor="adminRejectReason">Rejection Reason *</label>
            <textarea
              id="adminRejectReason"
              value={adminRejectReason}
              onChange={(e) => setAdminRejectReason(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              rows={4}
              className="reject-reason-input"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ContractList;
