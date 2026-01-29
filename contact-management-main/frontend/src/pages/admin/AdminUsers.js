import React, { useState, useEffect, useCallback } from 'react';
import {
  FiUsers,
  FiSearch,
  FiFilter,
  FiPlus,
  FiChevronLeft,
  FiChevronRight,
  FiToggleLeft,
  FiToggleRight,
  FiMoreVertical,
  FiUserCheck,
  FiUserX,
} from 'react-icons/fi';
import { adminAPI } from '../../services/api';
import { Button, Card, Badge, Spinner, Modal, Select } from '../../components/common';
import { formatDate, debounce } from '../../utils/helpers';
import toast from 'react-hot-toast';
import './Admin.css';

// Role labels for display
const ROLE_LABELS = {
  admin: { label: 'Admin', color: 'error' },
  client: { label: 'Client', color: 'info' },
  service_provider: { label: 'Service Provider', color: 'success' },
  procurement_manager: { label: 'Procurement Manager', color: 'warning' },
  legal_counsel: { label: 'Legal Counsel', color: 'purple' },
  contract_coordinator: { label: 'Contract Coordinator', color: 'cyan' },
};

// Role options for select dropdown
const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'client', label: 'Client' },
  { value: 'service_provider', label: 'Service Provider' },
  { value: 'procurement_manager', label: 'Procurement Manager' },
  { value: 'legal_counsel', label: 'Legal Counsel' },
  { value: 'contract_coordinator', label: 'Contract Coordinator' },
];

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const [filters, setFilters] = useState({
    search: '',
    role: '',
    isActive: '',
  });

  const [showFilters, setShowFilters] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // Create user modal state
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'client',
    phone: {
      countryCode: '+49',
      number: '',
    },
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, filters.role, filters.isActive]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.search && { search: filters.search }),
        ...(filters.role && { role: filters.role }),
        ...(filters.isActive !== '' && { isActive: filters.isActive }),
        sort: '-createdAt',
      };

      const response = await adminAPI.getUsers(params);
      setUsers(response.data.data);
      setPagination((prev) => ({
        ...prev,
        ...response.data.pagination,
      }));
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  const debouncedSearch = useCallback(
    () => debounce(() => {
      setPagination((prev) => ({ ...prev, page: 1 }));
      fetchUsers();
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
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      setActionLoading(userId);
      await adminAPI.updateUserStatus(userId, { isActive: !currentStatus });
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update user status');
    } finally {
      setActionLoading(null);
      setActiveMenu(null);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!createForm.firstName.trim()) errors.firstName = 'First name is required';
    if (!createForm.lastName.trim()) errors.lastName = 'Last name is required';
    if (!createForm.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email)) {
      errors.email = 'Invalid email format';
    }
    if (!createForm.password) errors.password = 'Password is required';
    else if (createForm.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    if (!createForm.role) errors.role = 'Role is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setCreateLoading(true);
      await adminAPI.createUserWithRole(createForm);

      toast.success('User created successfully');
      setCreateModal(false);
      setCreateForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'client',
        phone: { countryCode: '+49', number: '' },
      });
      setFormErrors({});
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleFormChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setCreateForm((prev) => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value },
      }));
    } else {
      setCreateForm((prev) => ({ ...prev, [field]: value }));
    }
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const closeCreateModal = () => {
    setCreateModal(false);
    setCreateForm({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'client',
      phone: { countryCode: '+49', number: '' },
    });
    setFormErrors({});
  };

  return (
    <div className="admin-users-page">
      <div className="page-header">
        <div className="page-header-content">
          <h1><FiUsers /> User Management</h1>
          <p>View and manage all system users</p>
        </div>
        <div className="page-header-actions">
          <Button icon={<FiPlus />} onClick={() => setCreateModal(true)}>
            Create User
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="filters-card">
        <div className="filters-row">
          <div className="search-input">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search users by name or email..."
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
              placeholder="All Roles"
              options={ROLE_OPTIONS}
              value={filters.role}
              onChange={(e) => handleFilterChange('role', e.target.value)}
            />
            <Select
              placeholder="All Status"
              options={[
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' },
              ]}
              value={filters.isActive}
              onChange={(e) => handleFilterChange('isActive', e.target.value)}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilters({ search: '', role: '', isActive: '' });
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </Card>

      {/* Users Table */}
      <Card className="users-table-card">
        {loading ? (
          <div className="table-loading">
            <Spinner size="lg" />
          </div>
        ) : users.length === 0 ? (
          <div className="table-empty">
            <FiUsers className="empty-icon" />
            <p>No users found</p>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td className="name-cell">
                        <div className="user-name">
                          <span className="user-avatar">
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </span>
                          <span>{user.firstName} {user.lastName}</span>
                        </div>
                      </td>
                      <td className="email-cell">
                        <span className="email-text">{user.email}</span>
                      </td>
                      <td>
                        <Badge variant={ROLE_LABELS[user.role]?.color || 'gray'}>
                          {ROLE_LABELS[user.role]?.label || user.role}
                        </Badge>
                      </td>
                      <td>
                        <Badge variant={user.isActive ? 'success' : 'error'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>
                        <div className="actions-cell">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="action-btn"
                            onClick={() => handleToggleStatus(user._id, user.isActive)}
                            disabled={actionLoading === user._id}
                            title={user.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {user.isActive ? <FiToggleRight className="toggle-on" /> : <FiToggleLeft className="toggle-off" />}
                          </Button>
                          <div className="dropdown-wrapper">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="action-btn"
                              onClick={() => setActiveMenu(activeMenu === user._id ? null : user._id)}
                            >
                              <FiMoreVertical />
                            </Button>
                            {activeMenu === user._id && (
                              <div className="dropdown-menu">
                                <button
                                  className="dropdown-item"
                                  onClick={() => {
                                    handleToggleStatus(user._id, user.isActive);
                                  }}
                                >
                                  {user.isActive ? <FiUserX /> : <FiUserCheck />}
                                  {user.isActive ? 'Deactivate User' : 'Activate User'}
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

            {/* Pagination */}
            <div className="table-pagination">
              <div className="pagination-info">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} users
              </div>
              <div className="pagination-controls">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!pagination.hasPrevPage}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
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
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                >
                  <FiChevronRight />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Create User Modal */}
      <Modal
        isOpen={createModal}
        onClose={closeCreateModal}
        title="Create New User"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeCreateModal}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={createLoading}
            >
              {createLoading ? 'Creating...' : 'Create User'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateUser} className="create-user-form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                First Name <span className="required">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${formErrors.firstName ? 'error' : ''}`}
                value={createForm.firstName}
                onChange={(e) => handleFormChange('firstName', e.target.value)}
                placeholder="Enter first name"
              />
              {formErrors.firstName && (
                <span className="form-error">{formErrors.firstName}</span>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">
                Last Name <span className="required">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${formErrors.lastName ? 'error' : ''}`}
                value={createForm.lastName}
                onChange={(e) => handleFormChange('lastName', e.target.value)}
                placeholder="Enter last name"
              />
              {formErrors.lastName && (
                <span className="form-error">{formErrors.lastName}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Email <span className="required">*</span>
            </label>
            <input
              type="email"
              className={`form-input ${formErrors.email ? 'error' : ''}`}
              value={createForm.email}
              onChange={(e) => handleFormChange('email', e.target.value)}
              placeholder="Enter email address"
            />
            {formErrors.email && (
              <span className="form-error">{formErrors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              Password <span className="required">*</span>
            </label>
            <input
              type="password"
              className={`form-input ${formErrors.password ? 'error' : ''}`}
              value={createForm.password}
              onChange={(e) => handleFormChange('password', e.target.value)}
              placeholder="Enter password (min 8 characters)"
            />
            {formErrors.password && (
              <span className="form-error">{formErrors.password}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              Role <span className="required">*</span>
            </label>
            <select
              className={`form-select ${formErrors.role ? 'error' : ''}`}
              value={createForm.role}
              onChange={(e) => handleFormChange('role', e.target.value)}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {formErrors.role && (
              <span className="form-error">{formErrors.role}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Phone (Optional)</label>
            <div className="phone-input-group">
              <select
                className="form-select phone-code"
                value={createForm.phone.countryCode}
                onChange={(e) => handleFormChange('phone.countryCode', e.target.value)}
              >
                <option value="+49">+49 (DE)</option>
                <option value="+1">+1 (US)</option>
                <option value="+44">+44 (UK)</option>
                <option value="+33">+33 (FR)</option>
              </select>
              <input
                type="text"
                className="form-input phone-number"
                value={createForm.phone.number}
                onChange={(e) => handleFormChange('phone.number', e.target.value)}
                placeholder="Phone number"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminUsers;
