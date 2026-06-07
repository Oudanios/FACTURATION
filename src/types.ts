/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type InvoiceType = 'ENTRADA' | 'SALIDA';

export interface Invoice {
  id: string; // unique internal id
  n_origen: number; // Order number as seen in CSV (can repeat for split entries)
  fecha: string; // DD/MM/YYYY
  tipo: InvoiceType;
  n_factura: string;
  empresa_cliente: string;
  nif_cif: string;
  concepto: string;
  categoria: string;
  base_imponible: number;
  porc_iva: number; // e.g., 4, 10, 21
  cuota_iva: number;
  irpf_perc: number; // e.g., 0, 15
  retencion_irpf: number;
  total_factura: number;
  metodo_pago: 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Bizum' | 'Otros';
  estado: 'Pagada' | 'Pendiente' | 'Anulada';
  usuario: string; // who keyed it in or modified it
  documento_tipo?: 'Factura' | 'Recibo'; // To differentiate official Invoices from bank/municipal receipts
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'SUPPORT' | 'USER' | 'VIEWER';

export interface RolePermissions {
  showDashboard: boolean;
  showInvoices: boolean;
  createInvoices: boolean;
  editInvoices: boolean;
  deleteInvoices: boolean;
  manageManualFunds: boolean;
  manageDetailedCosts: boolean;
  showRecapTab: boolean;
  manageSettingsAndCategories: boolean;
  editUsers?: boolean;
  deleteUsers?: boolean;
  configSystem?: boolean;
}

export interface AppPermissionsConfig {
  ADMIN: RolePermissions;
  MANAGER: RolePermissions;
  SUPPORT: RolePermissions;
  USER: RolePermissions;
  VIEWER: RolePermissions;
}

export interface UserAccount {
  username: string;
  name: string;
  role: UserRole;
  password?: string; // used for verification in login
}

export interface ClientInvoiceItem {
  id: string;
  concepto: string;
  cantidad: number;
  precio_unitario: number;
  iva_porc: number;
}

export interface ClientInvoiceData {
  n_factura: string;
  fecha: string;
  cliente_nombre: string;
  cliente_nif: string;
  cliente_direccion?: string;
  cliente_email?: string;
  items: ClientInvoiceItem[];
  metodo_pago: 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Bizum' | 'Otros';
  notas?: string;
  total_base: number;
  total_iva: number;
  total_factura: number;
  usuario_creador: string;
}

export interface EmployeeCost {
  id: string;
  name: string;
  role: string;
  netSalary: number;
  socialSecurity: number;
}

export interface OverheadCost {
  id: string;
  category: 'Internet' | 'Electricity' | 'Water' | 'Rent' | 'Insurance' | 'Taxes' | 'Marketing' | 'Other';
  label: string;
  amount: number;
  date?: string; // YYYY-MM-DD
  isPaid?: boolean;
}

export interface DetailedCosts {
  empleadosSueldos: number;
  seguridadSocialEmpresa: number;
  autonomosOtros: number;
  otrosCostes: number;
  suministrosDirectos?: number;
  segurosHotel?: number;
  tasasImpuestos?: number;
  customCosts?: Array<{ id: string; label: string; amount: number }>;
  employees?: EmployeeCost[];
  overheads?: OverheadCost[];
}

export interface ManualBookingFund {
  id: string; // unique transfer or transition ID
  fecha: string; // YYYY-MM-DD
  mes_referencia: string; // YYYY-MM
  monto: number; // Amount/monto in euros
  metodo_pago: 'TPV' | 'Efectivo' | 'Transferencia' | 'Bizum' | 'Otros' | 'Online';
  concepto: string; // Describir reserva / transferencia
  usuario: string; // User who recorded this fund
  referencia_banco?: string; // bank reference of bank transfer
  hora_transferencia?: string; // exact payment time hour e.g. 14:35
  isOnlineBooking?: boolean; // explicitly mark as online booking website/booking.com if needed
}



