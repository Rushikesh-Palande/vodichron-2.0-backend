/**
 * Customer Routes
 * ==============
 * 
 * Express routes for customer operations
 * Uses thin wrapper controllers that delegate to service layer
 * 
 * Routes:
 * - POST /api/customers - Create new customer
 * - GET /api/customers/:id - Get customer by ID
 * - GET /api/customers - Get paginated customers list
 * - GET /api/customers/search/:keyword - Search customers
 * - PATCH /api/customers/:id - Update customer
 * - DELETE /api/customers/:id - Delete customer
 */

import { Router, Request, Response, NextFunction } from 'express';
import { logger } from '../../../utils/logger';
import {
  createCustomerExpressController,
} from '../controllers/crud/create-customer.controller';
import {
  getCustomerByIdController,
  getCustomersListController,
  searchCustomersController,
} from '../controllers/crud/get-customer.controller';
import {
  updateCustomerController,
  deleteCustomerController,
} from '../controllers/crud/update-customer.controller';

/**
 * Error Handling Middleware for Controllers
 * ==========================================
 * Wraps controller calls to catch and handle errors
 */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create Customer Router
 */
const router = Router();

// ============================================================================
// CREATE Routes
// ============================================================================

/**
 * Create Customer
 * POST /api/customers
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('📥 POST /api/customers', {
      userId: (req as any).user?.uuid,
      operation: 'createCustomer_express'
    });
    await createCustomerExpressController(req, res);
  })
);

// ============================================================================
// READ Routes
// ============================================================================

/**
 * Get Customer By ID
 * GET /api/customers/:id
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('📥 GET /api/customers/:id', {
      customerId: req.params.id,
      operation: 'getCustomerById_express'
    });
    await getCustomerByIdController(req, res);
  })
);

/**
 * Get Paginated Customers List
 * POST /api/customers/list
 * (Using POST to support body with pagination and filters)
 */
router.post(
  '/list',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('📥 POST /api/customers/list', {
      page: req.body.pagination?.page,
      operation: 'getCustomersList_express'
    });
    await getCustomersListController(req, res);
  })
);

/**
 * Search Customers By Keyword
 * GET /api/customers/search/:keyword
 */
router.get(
  '/search/:keyword',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('📥 GET /api/customers/search/:keyword', {
      keyword: req.params.keyword,
      operation: 'searchCustomers_express'
    });
    await searchCustomersController(req, res);
  })
);

// ============================================================================
// UPDATE Routes
// ============================================================================

/**
 * Update Customer
 * PATCH /api/customers/:id
 */
router.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('📥 PATCH /api/customers/:id', {
      customerId: req.params.id,
      operation: 'updateCustomer_express'
    });
    // Update uses body uuid, not path id
    await updateCustomerController(req, res);
  })
);

// ============================================================================
// DELETE Routes
// ============================================================================

/**
 * Delete Customer
 * DELETE /api/customers/:id
 */
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('📥 DELETE /api/customers/:id', {
      customerId: req.params.id,
      operation: 'deleteCustomer_express'
    });
    await deleteCustomerController(req, res);
  })
);

export default router;
