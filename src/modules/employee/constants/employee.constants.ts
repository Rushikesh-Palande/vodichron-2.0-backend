/**
 * Employee Module Constants
 * =========================
 * 
 * Contains constants used across the employee module.
 * Following the same pattern as auth.constants.ts
 */

/**
 * Employee API Routes
 * ------------------
 * Base paths for employee-related endpoints
 */
export const EMPLOYEE_ROUTES = {
  BASE: '/api/employees',
  GET_BY_ID: '/:id',
  LIST: '/list',
  SEARCH: '/search/:keyword',
  CREATE: '/register',
  UPDATE: '/update',
  DELETE: '/:id',
  EXISTS: '/exists',
  
  // Photo management
  PHOTO: {
    UPLOAD: '/photo/upload',
    GET: '/image/:id',
    DELETE: '/image/:id',
  },
  
  // Document management
  DOCUMENTS: {
    UPLOAD: '/document/upload',
    LIST: '/documents/:id',
    LIST_ALL: '/all/documents',
    DELETE: '/document/:empid/:docid',
    DOWNLOAD: '/document/download/:empid/:docid',
    APPROVE: '/document/approve/:docid',
  },
  
  // Search variants
  SEARCH_VARIANTS: {
    ROLE_ASSIGNMENT: '/search/role-assignment/list/:keyword',
    MANAGER_ASSIGNMENT: '/search/manager-assignment/list/:keyword',
    LEAVE_APPROVER: '/search/leave-approver/list/:keyword',
  },
} as const;

/**
 * Employee Data Limits
 * -------------------
 * Pagination and data size limits
 */
export const EMPLOYEE_LIMITS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  SEARCH_MIN_KEYWORD_LENGTH: 2,
  MAX_SEARCH_RESULTS: 50,
} as const;

/**
 * Employee Document Types
 * ----------------------
 * Allowed document types for employee uploads
 */
export const EMPLOYEE_DOCUMENT_TYPES = {
  AADHAAR: 'aadhaar',
  PAN: 'pan',
  DEGREE: 'degree',
  EXPERIENCE: 'experience',
  PASSPORT: 'passport',
  OTHER: 'other',
} as const;

/**
 * Employee Photo Configuration
 * ---------------------------
 * Configuration for employee photo uploads
 */
export const EMPLOYEE_PHOTO_CONFIG = {
  MAX_SIZE_MB: 5,
  ALLOWED_FORMATS: ['image/jpeg', 'image/jpg', 'image/png'],
  FOLDER: 'employee_documents',
  DEFAULT_PHOTO: 'nouser.png',
} as const;
