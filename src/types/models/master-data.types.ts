/**
 * Master Data Model Type Definitions
 * ===================================
 * 
 * Purpose:
 * Defines TypeScript interfaces for the Master Data model.
 * Ensures type safety when managing application-wide configuration data.
 * 
 * Interfaces:
 * - MasterDataAttributes: Complete structure of a master data record
 * - MasterDataCreationAttributes: Optional fields for creating new master data
 * 
 * Corresponding Model: master-data.model.ts
 * Database Table: application_master_data
 * 
 * Usage:
 * Used for storing system-wide settings, dropdown options, feature flags,
 * and reference data with type safety.
 */

import { Optional } from 'sequelize';

export interface MasterDataAttributes {
  uuid: string;
  name: string;
  value: any; // JSON
  createdAt: Date;
  createdBy: string;
  updatedBy: string | null;
  updatedAt: Date | null;
}

export interface MasterDataCreationAttributes
  extends Optional<MasterDataAttributes, 'uuid' | 'value' | 'createdAt' | 'updatedBy' | 'updatedAt'> {}
