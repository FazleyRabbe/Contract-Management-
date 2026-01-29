export const ROLES = {
  ADMIN: 'admin',
  CLIENT: 'client',
  SERVICE_PROVIDER: 'service_provider',
  PROCUREMENT_MANAGER: 'procurement_manager',
  LEGAL_COUNSEL: 'legal_counsel',
  CONTRACT_COORDINATOR: 'contract_coordinator',
};

export const CONTRACT_TYPES = [
  { value: 'IT Service', label: 'IT Service' },
  { value: 'Data Server Management', label: 'Data Server Management' },
  { value: 'Office Administrator', label: 'Office Administrator' },
  { value: 'Software Handling', label: 'Software Handling' },
];

export const CONTRACT_STATUS = {
  DRAFT: 'draft',
  PENDING_PROCUREMENT: 'pending_procurement',
  PENDING_LEGAL: 'pending_legal',
  OPEN_FOR_OFFERS: 'open_for_offers',
  OFFER_SELECTED: 'offer_selected',
  PENDING_FINAL_APPROVAL: 'pending_final_approval',
  FINAL_APPROVED: 'final_approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  // Legacy statuses (for backward compatibility)
  PENDING_APPROVAL: 'pending_approval',
  PUBLISHED: 'published',
  SEARCHING_PROVIDER: 'searching_provider',
  PROVIDER_ASSIGNED: 'provider_assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
};

export const CONTRACT_STATUS_LABELS = {
  draft: { label: 'Draft', color: 'gray' },
  pending_procurement: { label: 'Pending Procurement', color: 'warning' },
  pending_legal: { label: 'Pending Legal', color: 'warning' },
  open_for_offers: { label: 'Open for Offers', color: 'info' },
  offer_selected: { label: 'Offer Selected', color: 'info' },
  pending_final_approval: { label: 'Pending Final Approval', color: 'warning' },
  final_approved: { label: 'Final Approved', color: 'success' },
  rejected: { label: 'Rejected', color: 'error' },
  cancelled: { label: 'Cancelled', color: 'error' },
  // Legacy statuses (for backward compatibility)
  pending_approval: { label: 'Pending Approval', color: 'warning' },
  published: { label: 'Published', color: 'info' },
  searching_provider: { label: 'Searching Provider', color: 'info' },
  provider_assigned: { label: 'Provider Assigned', color: 'info' },
  in_progress: { label: 'In Progress', color: 'success' },
  completed: { label: 'Completed', color: 'success' },
};

export const CLIENT_STATUS_LABELS = {
  draft: 'Draft',
  pending_procurement: 'Under Procurement Review',
  pending_legal: 'Under Legal Review',
  open_for_offers: 'Accepting Offers',
  offer_selected: 'Offer Selected',
  pending_final_approval: 'Awaiting Final Approval',
  final_approved: 'Contract Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  // Legacy statuses (for backward compatibility)
  pending_approval: 'Request Pending',
  published: 'Searching Provider',
  searching_provider: 'Searching Provider',
  provider_assigned: 'Waiting for Approval',
  in_progress: 'In Progress',
  completed: 'Contract Completed',
};

export const REQUEST_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
};

export const OFFER_STATUS = {
  PENDING: 'pending',
  SELECTED: 'selected',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
};

export const OFFER_STATUS_LABELS = {
  pending: { label: 'Pending', color: 'warning' },
  selected: { label: 'Selected', color: 'success' },
  rejected: { label: 'Rejected', color: 'error' },
  withdrawn: { label: 'Withdrawn', color: 'gray' },
};

export const COUNTRY_CODES = [
  { code: '+49', country: 'Germany' },
  { code: '+1', country: 'USA' },
  { code: '+44', country: 'UK' },
  { code: '+33', country: 'France' },
  { code: '+39', country: 'Italy' },
  { code: '+34', country: 'Spain' },
  { code: '+31', country: 'Netherlands' },
  { code: '+32', country: 'Belgium' },
  { code: '+43', country: 'Austria' },
  { code: '+41', country: 'Switzerland' },
];

export const VALIDATION = {
  DESCRIPTION_MAX_WORDS: 150,
  TARGET_CONDITIONS_MAX_WORDS: 150,
  MIN_TARGET_PERSONS: 1,
  MAX_TARGET_PERSONS: 20,
  MIN_PASSWORD_LENGTH: 8,
};

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password/:token',
  DASHBOARD: '/dashboard',
  CONTRACTS: '/contracts',
  CONTRACT_CREATE: '/contracts/new',
  CONTRACT_DETAIL: '/contracts/:id',
  CONTRACT_EDIT: '/contracts/:id/edit',
  SERVICE_PROVIDERS: '/service-providers',
  SERVICE_PROVIDER_DETAIL: '/service-providers/:id',
  PROFILE: '/profile',
  ADMIN_USERS: '/admin/users',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_AUDIT_LOGS: '/admin/audit-logs',
};
