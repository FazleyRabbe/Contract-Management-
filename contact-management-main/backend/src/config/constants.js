module.exports = {
  // User Roles
  ROLES: {
    ADMIN: 'admin',
    CLIENT: 'client',
    SERVICE_PROVIDER: 'service_provider',
    PROCUREMENT_MANAGER: 'procurement_manager',
    LEGAL_COUNSEL: 'legal_counsel',
    CONTRACT_COORDINATOR: 'contract_coordinator',
  },

  // Contract Types
  CONTRACT_TYPES: {
    IT_SERVICE: 'IT Service',
    DATA_SERVER_MANAGEMENT: 'Data Server Management',
    OFFICE_ADMINISTRATOR: 'Office Administrator',
    SOFTWARE_HANDLING: 'Software Handling',
  },

  // Contract Status - Multi-step approval workflow
  CONTRACT_STATUS: {
    DRAFT: 'draft',
    PENDING_PROCUREMENT: 'pending_procurement',        // Step 1: Waiting for Procurement Manager
    PENDING_LEGAL: 'pending_legal',                    // Step 2: Waiting for Legal Counsel
    OPEN_FOR_OFFERS: 'open_for_offers',               // Step 3: Legal approved, open for provider offers
    OFFER_SELECTED: 'offer_selected',                  // Step 4: Coordinator selected an offer
    PENDING_FINAL_APPROVAL: 'pending_final_approval',  // Step 5: Waiting for Admin final approval
    FINAL_APPROVED: 'final_approved',                  // Step 6: Admin approved - Contract finalized
    REJECTED: 'rejected',                              // Contract rejected at any stage
    CANCELLED: 'cancelled',
    // Legacy statuses for backward compatibility
    PENDING_APPROVAL: 'pending_approval',
    PUBLISHED: 'published',
    SEARCHING_PROVIDER: 'searching_provider',
    PROVIDER_ASSIGNED: 'provider_assigned',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
  },

  // Offer Status
  OFFER_STATUS: {
    PENDING: 'pending',
    SELECTED: 'selected',
    REJECTED: 'rejected',
    WITHDRAWN: 'withdrawn',
  },

  // Service Provider Request Status
  SP_REQUEST_STATUS: {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    WITHDRAWN: 'withdrawn',
  },

  // Client Contract View Status (for UI display)
  CLIENT_CONTRACT_STATUS: {
    REQUEST_PENDING: 'Request Pending',
    PENDING_PROCUREMENT: 'Pending Procurement Review',
    PENDING_LEGAL: 'Pending Legal Review',
    OPEN_FOR_OFFERS: 'Open for Provider Offers',
    OFFER_SELECTED: 'Offer Selected',
    PENDING_FINAL_APPROVAL: 'Pending Final Approval',
    FINAL_APPROVED: 'Contract Approved',
    REQUEST_ACCEPTED: 'Request Accepted',
    SEARCHING_PROVIDER: 'Searching Provider',
    WAITING_APPROVAL: 'Waiting for Approval',
    CONTRACT_COMPLETED: 'Contract Completed',
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
  },

  // Validation Limits
  VALIDATION: {
    DESCRIPTION_MAX_WORDS: 150,
    TARGET_CONDITIONS_MAX_WORDS: 150,
    MIN_TARGET_PERSONS: 1,
    MAX_TARGET_PERSONS: 20,
    MIN_RATING: 1,
    MAX_RATING: 5,
    MIN_PASSWORD_LENGTH: 8,
  },

  // Country Codes (Default Germany)
  DEFAULT_COUNTRY_CODE: '+49',

  // Audit Log Actions
  AUDIT_ACTIONS: {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    STATUS_CHANGE: 'status_change',
    APPROVE: 'approve',
    REJECT: 'reject',
    ASSIGN: 'assign',
    PROCUREMENT_APPROVE: 'procurement_approve',
    PROCUREMENT_REJECT: 'procurement_reject',
    LEGAL_APPROVE: 'legal_approve',
    LEGAL_REJECT: 'legal_reject',
    OFFER_SUBMIT: 'offer_submit',
    OFFER_SELECT: 'offer_select',
    FINAL_APPROVE: 'final_approve',
    FINAL_REJECT: 'final_reject',
  },
};
