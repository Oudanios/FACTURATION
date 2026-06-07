/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Invoice, UserAccount, ClientInvoiceData, AppPermissionsConfig } from './types';

export const USER_ACCOUNTS: UserAccount[] = [
  {
    username: 'admin',
    name: 'Administrator (Oudani)',
    role: 'ADMIN',
    password: 'OUDANI@RABI'
  },
  {
    username: 'kristian',
    name: 'Kristian Manager',
    role: 'MANAGER',
    password: 'KRISTIAN@2026'
  },
  {
    username: 'support',
    name: 'Technical Support (Soporte)',
    role: 'SUPPORT',
    password: 'SUPPORT@2026'
  },
  {
    username: 'rabi',
    name: 'Rabi User',
    role: 'USER',
    password: 'RABI@OUDANI'
  },
  {
    username: 'viewer',
    name: 'Auditor Viewer',
    role: 'VIEWER',
    password: 'VIEW'
  }
];

export const DEFAULT_PERMISSIONS: AppPermissionsConfig = {
  ADMIN: {
    showDashboard: true,
    showInvoices: true,
    createInvoices: true,
    editInvoices: true,
    deleteInvoices: true,
    manageManualFunds: true,
    manageDetailedCosts: true,
    showRecapTab: true,
    manageSettingsAndCategories: true,
    editUsers: true,
    deleteUsers: true,
    configSystem: true
  },
  MANAGER: {
    showDashboard: true,
    showInvoices: true,
    createInvoices: true,
    editInvoices: true,
    deleteInvoices: false,
    manageManualFunds: true,
    manageDetailedCosts: true,
    showRecapTab: true,
    manageSettingsAndCategories: false,
    editUsers: false,
    deleteUsers: false,
    configSystem: false
  },
  SUPPORT: {
    showDashboard: true,
    showInvoices: true,
    createInvoices: true,
    editInvoices: true,
    deleteInvoices: false,
    manageManualFunds: true,
    manageDetailedCosts: true,
    showRecapTab: true,
    manageSettingsAndCategories: true,
    editUsers: true,
    deleteUsers: false,
    configSystem: false
  },
  USER: {
    showDashboard: true,
    showInvoices: true,
    createInvoices: true,
    editInvoices: false,
    deleteInvoices: false,
    manageManualFunds: false,
    manageDetailedCosts: false,
    showRecapTab: false,
    manageSettingsAndCategories: false,
    editUsers: false,
    deleteUsers: false,
    configSystem: false
  },
  VIEWER: {
    showDashboard: true,
    showInvoices: true,
    createInvoices: false,
    editInvoices: false,
    deleteInvoices: false,
    manageManualFunds: false,
    manageDetailedCosts: false,
    showRecapTab: false,
    manageSettingsAndCategories: false,
    editUsers: false,
    deleteUsers: false,
    configSystem: false
  }
};

export const CATEGORIES = {
  ENTRADA: ['Compra', 'Mantenimiento', 'Suministros', 'Alquiler', 'Seguros', 'Otros Co'],
  SALIDA: ['Factura a Cliente', 'Eventos', 'Otros In']
};

// Clean start — no sample data shipped to production
export const INITIAL_INVOICES: Invoice[] = [];

export const INITIAL_CLIENT_INVOICES: ClientInvoiceData[] = [];

export const INITIAL_FUNDS: any[] = [];
