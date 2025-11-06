/**
 * Get Customer Controller
 * ======================
 * Thin wrapper controller for retrieving customer records
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { getCustomerDetails, getPaginatedCustomers, searchCustomers } from '../../services/crud/get-customer.service';

/**
 * Get Customer Details By ID
 */
export async function getCustomerByIdController(req: Request, res: Response) {
  try {
    logger.info('📥 Get customer request received', {
      customerId: req.params.id
    });

    const customer = await getCustomerDetails(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Customer retrieved successfully',
      data: customer,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('💥 Get customer controller error', {
      error: error?.message
    });

    const statusCode = error.code === 'NOT_FOUND' ? 404 : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to retrieve customer',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Get Paginated Customers List
 */
export async function getCustomersListController(req: Request, res: Response) {
  try {
    logger.info('📥 Get customers list request received', {
      filters: req.body.filters,
      page: req.body.pagination?.page
    });

    const { pagination, filters } = req.body;
    let { page } = pagination;
    const { pageLimit } = pagination;

    if (!page) {
      page = 1;
    }

    const customers = await getPaginatedCustomers(filters || {}, page, pageLimit);

    return res.status(200).json({
      success: true,
      message: 'Customers list retrieved successfully',
      data: customers,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('💥 Get customers list controller error', {
      error: error?.message
    });

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve customers list',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Search Customers By Keyword
 */
export async function searchCustomersController(req: Request, res: Response) {
  try {
    logger.info('📥 Search customers request received', {
      keyword: req.params.keyword
    });

    const { keyword, exclude } = req.body;
    let excludedUsers: string[] = [];

    if (typeof exclude === 'string') {
      excludedUsers = exclude.split(',');
    }

    excludedUsers.push((req as any).user?.uuid || '');

    const results = await searchCustomers(keyword, excludedUsers);

    return res.status(200).json({
      success: true,
      message: 'Search completed successfully',
      data: results,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('💥 Search customers controller error', {
      error: error?.message
    });

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to search customers',
      timestamp: new Date().toISOString()
    });
  }
}
