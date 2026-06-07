/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Invoice, InvoiceType, UserAccount } from '../types';
import { CATEGORIES } from '../data';
import { 
  Plus, Search, Edit2, Trash2, Filter, 
  ArrowDownCircle, ArrowUpCircle, CheckSquare, Clock, 
  AlertTriangle, FileSpreadsheet, RotateCcw, X, Check, Calendar, Eye, Printer, Copy
} from 'lucide-react';

interface InvoiceManagerProps {
  invoices: Invoice[];
  currentUser: UserAccount;
  onAddInvoice: (invoice: Invoice) => void;
  onUpdateInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (id: string) => void;
  onFacturaSelectForBill?: () => void; // redirection if they want to load Billing Tab
  lang?: any;
}

export default function InvoiceManager({ 
  invoices, 
  currentUser, 
  onAddInvoice, 
  onUpdateInvoice, 
  onDeleteInvoice,
  onFacturaSelectForBill,
  lang
}: InvoiceManagerProps) {
  // Consulting state for detail preview
  const [consultingInvoice, setConsultingInvoice] = useState<Invoice | null>(null);

  // Query & Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterTipo, setFilterTipo] = useState<string>('ALL');
  const [filterCategoria, setFilterCategoria] = useState<string>('ALL');
  const [filterEstado, setFilterEstado] = useState<string>('ALL');
  const [filterPago, setFilterPago] = useState<string>('ALL');

  // Sorting State
  const [sortBy, setSortBy] = useState<'Nº' | 'FECHA' | 'TOTAL' | 'RECIENTE'>('RECIENTE');

  // Form Panel (Modal) state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  // Form Fields
  const [fecha, setFecha] = useState('');
  const [tipo, setTipo] = useState<InvoiceType>('ENTRADA');
  const [documentoTipo, setDocumentoTipo] = useState<'Factura' | 'Recibo'>('Factura');
  const [nFactura, setNFactura] = useState('');
  const [empresaCliente, setEmpresaCliente] = useState('');
  const [nifCif, setNifCif] = useState('');
  const [concepto, setConcepto] = useState('');
  const [categoria, setCategoria] = useState('');
  const [baseImponible, setBaseImponible] = useState<number>(0);
  const [porcIva, setPorcIva] = useState<number>(21);
  const [irpfPerc, setIrpfPerc] = useState<number>(0);
  const [metodoPago, setMetodoPago] = useState<'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Bizum' | 'Otros'>('Efectivo');
  const [estado, setEstado] = useState<'Pagada' | 'Pendiente' | 'Anulada'>('Pagada');

  // Permissions helper
  const canAdd = currentUser.role !== 'VIEWER';
  const canEdit = currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER';
  const canDelete = currentUser.role === 'ADMIN';

  // Available categories based on selected Tipo in form
  const availableCategoriesInForm = useMemo(() => {
    return CATEGORIES[tipo];
  }, [tipo]);

  // Reset form helper
  const resetForm = () => {
    const today = new Date();
    const formattedToday = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    
    setFecha(formattedToday);
    setTipo('ENTRADA');
    setDocumentoTipo('Factura');
    setNFactura('');
    setEmpresaCliente('');
    setNifCif('');
    setConcepto('');
    setCategoria(CATEGORIES.ENTRADA[0]);
    setBaseImponible(0);
    setPorcIva(21);
    setIrpfPerc(0);
    setMetodoPago('Efectivo');
    setEstado('Pagada');
    setEditingInvoice(null);
  };

  // Open modal for Adding
  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Open modal for Editing
  const handleOpenEdit = (inv: Invoice) => {
    if (!canEdit) return;
    setEditingInvoice(inv);
    setFecha(inv.fecha);
    setTipo(inv.tipo);
    setDocumentoTipo(inv.documento_tipo || 'Factura');
    setNFactura(inv.n_factura);
    setEmpresaCliente(inv.empresa_cliente);
    setNifCif(inv.nif_cif);
    setConcepto(inv.concepto);
    setCategoria(inv.categoria);
    setBaseImponible(inv.base_imponible);
    setPorcIva(inv.porc_iva);
    setIrpfPerc(inv.irpf_perc);
    setMetodoPago(inv.metodo_pago);
    setEstado(inv.estado);
    setIsModalOpen(true);
  };

  // Submit invoice form
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAdd) return;

    // Maths calculations
    const base = Number(baseImponible) || 0;
    const cuota_iva = Number((base * (porcIva / 100)).toFixed(2));
    const retencion_irpf = Number((base * (irpfPerc / 100)).toFixed(2));
    const total_factura = Number((base + cuota_iva - retencion_irpf).toFixed(2));

    // Calculate maximum nº_origen
    const highestOrigen = invoices.reduce((max, inv) => (inv.n_origen > max ? inv.n_origen : max), 0);

    // Default fields if document is and bank receipt or local receipt and is empty
    const finalNFactura = nFactura.trim() || (documentoTipo === 'Recibo' ? `REC-${Date.now().toString().substring(7)}` : '');
    const finalNifCif = nifCif.trim() || (documentoTipo === 'Recibo' ? 'RECIBO-SB' : 'N/A');

    if (editingInvoice) {
      // Update
      const updated: Invoice = {
        ...editingInvoice,
        fecha,
        tipo,
        documento_tipo: documentoTipo,
        n_factura: finalNFactura,
        empresa_cliente: empresaCliente,
        nif_cif: finalNifCif,
        concepto,
        categoria,
        base_imponible: base,
        porc_iva: porcIva,
        cuota_iva,
        irpf_perc: irpfPerc,
        retencion_irpf,
        total_factura,
        metodo_pago: metodoPago,
        estado,
        usuario: currentUser.name.split(' ')[0] // updated by current user
      };
      onUpdateInvoice(updated);
    } else {
      // Add new
      const newVal: Invoice = {
        id: `inv-${Date.now()}`,
        n_origen: highestOrigen + 1,
        fecha,
        tipo,
        documento_tipo: documentoTipo,
        n_factura: finalNFactura,
        empresa_cliente: empresaCliente,
        nif_cif: finalNifCif,
        concepto,
        categoria,
        base_imponible: base,
        porc_iva: porcIva,
        cuota_iva,
        irpf_perc: irpfPerc,
        retencion_irpf,
        total_factura,
        metodo_pago: metodoPago,
        estado,
        usuario: currentUser.name.split(' ')[0]
      };
      onAddInvoice(newVal);
    }

    setIsModalOpen(false);
    resetForm();
  };

  // Auto-recalculate VAT block in preview
  const calculatedFields = useMemo(() => {
    const base = Number(baseImponible) || 0;
    const cuota_iva = Number((base * (porcIva / 100)).toFixed(2));
    const retencion_irpf = Number((base * (irpfPerc / 100)).toFixed(2));
    const total_factura = Number((base + cuota_iva - retencion_irpf).toFixed(2));
    return { cuota_iva, retencion_irpf, total_factura };
  }, [baseImponible, porcIva, irpfPerc]);

  // Expose category options dynamically in filter bar
  const allPossibleCategoriesObj = useMemo(() => {
    return [...CATEGORIES.ENTRADA, ...CATEGORIES.SALIDA].filter((v, i, self) => self.indexOf(v) === i);
  }, []);

  // Filtered & Sorted Invoices
  const processedInvoices = useMemo(() => {
    let result = invoices.filter(inv => {
      // Search Box (searches Factura, Empresa, Concept, NIF)
      const q = searchTerm.toLowerCase();
      const matchSearch = searchTerm === '' || 
        inv.n_factura.toLowerCase().includes(q) ||
        inv.empresa_cliente.toLowerCase().includes(q) ||
        inv.concepto.toLowerCase().includes(q) ||
        inv.nif_cif.toLowerCase().includes(q) ||
        inv.usuario.toLowerCase().includes(q);

      const matchTipo = filterTipo === 'ALL' || inv.tipo === filterTipo;
      const matchCategoria = filterCategoria === 'ALL' || inv.categoria === filterCategoria;
      const matchEstado = filterEstado === 'ALL' || inv.estado === filterEstado;
      const matchPago = filterPago === 'ALL' || inv.metodo_pago === filterPago;

      return matchSearch && matchTipo && matchCategoria && matchEstado && matchPago;
    });

    // Sorting block
    return result.sort((a, b) => {
      if (sortBy === 'Nº') {
        return b.n_origen - a.n_origen;
      }
      if (sortBy === 'TOTAL') {
        return b.total_factura - a.total_factura;
      }
      if (sortBy === 'FECHA') {
        const parseDate = (d: string) => {
          const parts = d.split('/');
          if (parts.length === 3) {
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
          }
          return 0;
        };
        return parseDate(b.fecha) - parseDate(a.fecha);
      }
      // RECIENTE defaults to incremental ID setup or reverse insertion sequence
      return b.id.localeCompare(a.id);
    });
  }, [invoices, searchTerm, filterTipo, filterCategoria, filterEstado, filterPago, sortBy]);

  // Export visible to CSV helper
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'ID,Nº,Fecha,Tipo,Nº Factura,Empresa / Cliente,NIF / CIF,Concepto,Categoría,Base Imponible,IVA %,Cuota IVA,IRPF %,Retención IRPF,Total Factura,Método Pago,Estado,Usuario\n';
    
    processedInvoices.forEach(row => {
      const line = [
        row.id,
        row.n_origen,
        row.fecha,
        row.tipo,
        `"${row.n_factura}"`,
        `"${row.empresa_cliente}"`,
        `"${row.nif_cif}"`,
        `"${row.concepto}"`,
        `"${row.categoria}"`,
        row.base_imponible.toFixed(2),
        `${row.porc_iva}%`,
        row.cuota_iva.toFixed(2),
        `${row.irpf_perc}%`,
        row.retencion_irpf.toFixed(2),
        row.total_factura.toFixed(2),
        row.metodo_pago,
        row.estado,
        row.usuario
      ].join(',');
      csvContent += line + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'registro_de_facturas_hotel.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterTipo('ALL');
    setFilterCategoria('ALL');
    setFilterEstado('ALL');
    setFilterPago('ALL');
    setSortBy('RECIENTE');
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200">
        <div>
          <h3 className="text-base font-bold text-slate-800">Historial & Registro de Facturas</h3>
          <p className="text-xs text-slate-500">Gestione los asientos contables de Entrada (compras) y Salida (facturación)</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onFacturaSelectForBill && (
            <button
              onClick={onFacturaSelectForBill}
              className="px-3.5 py-2 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-slate-500" />
              Nuevo Cliente Factura Tab
            </button>
          )}

          {currentUser.role === 'ADMIN' ? (
            <>
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Exportar registros filtrados a CSV"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Descargar Excel/CSV
              </button>

              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Imprimir listado filtrado"
              >
                <Printer className="w-4 h-4 text-indigo-600" />
                Imprimir Reporte
              </button>
            </>
          ) : (
            <>
              <button
                disabled
                className="px-3.5 py-2 bg-slate-50 text-slate-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed opacity-60 border border-slate-250"
                title="Acceso Restringido: Solo el ADMIN puede exportar registros"
              >
                🔒 Descargar CSV
              </button>

              <button
                disabled
                className="px-3.5 py-2 bg-slate-50 text-slate-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed opacity-60 border border-slate-250"
                title="Acceso Restringido: Solo el ADMIN puede imprimir registros"
              >
                🔒 Imprimir Reporte
              </button>
            </>
          )}

          {canAdd ? (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-150 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Añadir Entrada / Salida
            </button>
          ) : (
            <span className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] uppercase font-bold text-slate-400">
              Vista de Solo Lectura
            </span>
          )}
        </div>
      </div>

      {/* Modern Filter Rail */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3.5">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search bar */}
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3.5 top-2.5 w-4.5 h-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nº de factura, empresa, cliente, concepto, NIF o usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-100/50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all placeholder-slate-400 text-slate-700"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                showFilters || filterTipo !== 'ALL' || filterCategoria !== 'ALL' || filterEstado !== 'ALL' || filterPago !== 'ALL'
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filtros Avanzados
            </button>

            {/* Clear Filters Reset */}
            {(searchTerm || filterTipo !== 'ALL' || filterCategoria !== 'ALL' || filterEstado !== 'ALL' || filterPago !== 'ALL') && (
              <button
                onClick={handleResetFilters}
                className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-700 transition-all cursor-pointer"
                title="Restablecer filtros"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="RECIENTE">Recientes Primero</option>
              <option value="FECHA">Por Fecha</option>
              <option value="TOTAL">Mayor Importe</option>
              <option value="Nº">Por Nº Registro</option>
            </select>
          </div>
        </div>

        {/* Expandable Advanced Filters */}
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
            {/* Tipo */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Tipo de Factura</label>
              <select
                value={filterTipo}
                onChange={(e) => {
                  setFilterTipo(e.target.value);
                  setFilterCategoria('ALL'); // Reset category when tipo changes
                }}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="ALL">Todos (Entradas/Salidas)</option>
                <option value="ENTRADA">ENTRADA (Compra / Coste)</option>
                <option value="SALIDA">SALIDA (Venta / Facturado)</option>
              </select>
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Categoría</label>
              <select
                value={filterCategoria}
                onChange={(e) => setFilterCategoria(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="ALL">Todas las Categorías</option>
                {filterTipo === 'ALL' 
                  ? allPossibleCategoriesObj.map(cat => <option key={cat} value={cat}>{cat}</option>)
                  : CATEGORIES[filterTipo as InvoiceType].map(cat => <option key={cat} value={cat}>{cat}</option>)
                }
              </select>
            </div>

            {/* Estado */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Estado de Pago</label>
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="Pagada">Pagada</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Anulada">Anulada</option>
              </select>
            </div>

            {/* Método de Pago */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Método de Pago</label>
              <select
                value={filterPago}
                onChange={(e) => setFilterPago(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="ALL">Todos los Métodos</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Bizum">Bizum</option>
                <option value="Otros">Otros</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main Registry Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {processedInvoices.length === 0 ? (
          <div className="p-16 text-center">
            <AlertTriangle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-700">No se encontraron facturas matching</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">Intente cambiar los filtros o el texto de búsqueda e intente nuevamente.</p>
            {(searchTerm || filterTipo !== 'ALL' || filterCategoria !== 'ALL' || filterEstado !== 'ALL' || filterPago !== 'ALL') && (
              <button
                onClick={handleResetFilters}
                className="mt-4 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 transition-all cursor-pointer"
              >
                Limpiar Filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse text-left text-xs text-slate-600">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="px-4 py-3.5 font-bold">Nº / Fecha</th>
                  <th className="px-4 py-3.5 font-bold">Tipo</th>
                  <th className="px-4 py-3.5 font-bold">Nº Factura</th>
                  <th className="px-4 py-3.5 font-bold">Cliente / Proveedor</th>
                  <th className="px-4 py-3.5 font-bold">Concepto / Categoría</th>
                  <th className="px-4 py-3.5 font-bold text-right">Base Imponible</th>
                  <th className="px-4 py-3.5 font-bold text-right">IVA</th>
                  <th className="px-4 py-3.5 font-bold text-right">Pre. IRPF</th>
                  <th className="px-4 py-3.5 font-bold text-right">Total Factura</th>
                  <th className="px-4 py-3.5 font-bold">Método / Estado</th>
                  <th className="px-4 py-3.5 font-bold text-center">Usuario</th>
                  <th className="px-4 py-3.5 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {processedInvoices.map((inv) => {
                  const isIncoming = inv.tipo === 'ENTRADA';
                  
                  return (
                    <tr 
                      key={inv.id} 
                      className={`hover:bg-indigo-50/15 transition-colors ${
                        inv.estado === 'Anulada' ? 'bg-slate-50/50 opacity-60' : ''
                      }`}
                    >
                      {/* Nº and Fecha */}
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded mr-1.5 font-bold text-slate-600">
                          #{inv.n_origen}
                        </span>
                        <span className="font-medium text-slate-700">{inv.fecha}</span>
                      </td>

                      {/* Tipo badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isIncoming 
                            ? 'bg-rose-50 text-rose-700' 
                             : 'bg-green-50 text-green-700'
                        }`}>
                          {isIncoming ? (
                            <>
                              <ArrowDownCircle className="w-3.5 h-3.5" />
                              ENTRADA
                            </>
                          ) : (
                            <>
                              <ArrowUpCircle className="w-3.5 h-3.5" />
                              SALIDA
                            </>
                          )}
                        </span>
                      </td>

                      {/* Invoice Number */}
                      <td className="px-4 py-3 text-slate-800 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold font-mono text-[11px]">{inv.n_factura}</span>
                          <span className={`text-[8px] font-bold tracking-wider ${
                            inv.documento_tipo === 'Recibo' 
                              ? 'text-amber-600' 
                              : 'text-indigo-500'
                          }`}>
                            {inv.documento_tipo === 'Recibo' ? '🧾 JUSTIFICANTE/TASAS' : '📄 FACTURA OFICIAL'}
                          </span>
                        </div>
                      </td>

                      {/* Cliente / Proveedor */}
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-800 line-clamp-1">{inv.empresa_cliente}</p>
                        <p className="text-[10px] text-slate-400 font-mono tracking-tight leading-normal uppercase">{inv.nif_cif}</p>
                      </td>

                      {/* Concepto / Categoría */}
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="font-medium text-slate-700 line-clamp-1">{inv.concepto}</p>
                        <p className="text-[10px] text-slate-500 block truncate capitalize bg-slate-100 inline-block px-1.5 py-0.3 rounded font-medium mt-0.5">{inv.categoria}</p>
                      </td>

                      {/* Base Imponible */}
                      <td className="px-4 py-3 text-right font-medium text-slate-800 whitespace-nowrap">
                        {inv.base_imponible.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </td>

                      {/* IVA */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="font-bold text-slate-700">{inv.cuota_iva.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
                        <span className="text-[10px] text-slate-400 block tracking-tighter">({inv.porc_iva}%)</span>
                      </td>

                      {/* IRPF */}
                      <td className="px-4 py-3 text-right whitespace-nowrap text-slate-500">
                        {inv.retencion_irpf > 0 ? (
                          <>
                            <span className="font-medium text-slate-600">-{inv.retencion_irpf.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
                            <span className="text-[10px] text-red-500 block">({inv.irpf_perc}%)</span>
                          </>
                        ) : '-'}
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap font-sans text-sm">
                        {inv.total_factura.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </td>

                      {/* Método / Estado */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-[10px] font-semibold text-slate-500 leading-normal mb-0.5">{inv.metodo_pago}</p>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          inv.estado === 'Pagada' ? 'bg-green-50 text-green-700 border border-green-100' :
                          inv.estado === 'Pendiente' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {inv.estado === 'Pagada' ? 'PAGADA' : 
                           inv.estado === 'Pendiente' ? 'PENDIENTE' : 'ANULADA'}
                        </span>
                      </td>

                      {/* User who indexed */}
                      <td className="px-4 py-3 text-center whitespace-nowrap text-slate-500 font-mono text-[10px]">
                        <span className="bg-slate-50 rounded border border-slate-200 px-1 py-0.5 uppercase tracking-wide">
                          {inv.usuario}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 font-sans">
                          <button
                            onClick={() => setConsultingInvoice(inv)}
                            className="p-1 px-2 border border-slate-200 hover:border-indigo-300 text-indigo-600 hover:bg-indigo-50 rounded bg-white cursor-pointer transition-all flex items-center gap-1 font-bold text-[11px]"
                            title="Consultar detalles completos"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {lang === 'es' ? 'Consultar' : lang === 'fr' ? 'Consulter' : 'Consult'}
                          </button>

                          {canEdit ? (
                            <button
                              onClick={() => handleOpenEdit(inv)}
                              className="p-1 px-2 border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50/50 rounded bg-white cursor-pointer transition-all flex items-center gap-1 font-semibold text-[11px]"
                              title="Editar registro"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              {lang === 'es' ? 'Editar' : lang === 'fr' ? 'Modifier' : 'Edit'}
                            </button>
                          ) : (
                            <span className="p-1 text-slate-300 cursor-not-allowed">🔏</span>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => {
                                const confirmMsg = lang === 'es' ? `¿Seguro que desea eliminar para siempre la factura Nº ${inv.n_origen}?` : lang === 'fr' ? `Voulez-vous supprimer l'écriture Nº ${inv.n_origen} ?` : `Are you sure you want to delete invoice record #${inv.n_origen}?`;
                                if (window.confirm(confirmMsg)) {
                                  onDeleteInvoice(inv.id);
                                }
                              }}
                              className="p-1 border border-transparent hover:border-rose-100 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-all"
                              title="Eliminar asiento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals Summary Footer */}
        <div className="bg-slate-50/80 p-4 border-t border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold">
          <div className="bg-white/80 p-3 rounded-xl border border-slate-200">
            <span className="text-slate-400 block text-[9px] uppercase tracking-wide">Facturas Filtradas</span>
            <span className="text-base font-bold text-slate-800">{processedInvoices.length} asientos</span>
          </div>

          <div className="bg-white/80 p-3 rounded-xl border border-slate-200">
            <span className="text-slate-400 block text-[9px] uppercase tracking-wide">Total Base Imponible</span>
            <span className="text-base font-bold text-slate-800">
              {processedInvoices.reduce((sum, inv) => sum + (inv.estado !== 'Anulada' ? inv.base_imponible : 0), 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </span>
          </div>

          <div className="bg-white/80 p-3 rounded-xl border border-slate-200">
            <span className="text-slate-400 block text-[9px] uppercase tracking-wide">Total IVA Acumulado</span>
            <span className="text-base font-bold text-green-700">
              {processedInvoices.reduce((sum, inv) => sum + (inv.estado !== 'Anulada' ? inv.cuota_iva : 0), 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </span>
          </div>

          <div className="bg-white/80 p-3 rounded-xl border border-slate-200">
            <span className="text-slate-400 block text-[9px] uppercase tracking-wide">Monto Neto Registrado</span>
            <span className="text-base font-bold text-indigo-700 font-sans">
              {processedInvoices.reduce((sum, inv) => sum + (inv.estado !== 'Anulada' ? inv.total_factura : 0), 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </span>
          </div>
        </div>
      </div>

      {/* Slide-over or Modal popup for Add/Edit Invoice */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  {editingInvoice ? `Editar Asiento Contable #${editingInvoice.n_origen}` : 'Registrar Nueva Transacción (Entrada / Salida)'}
                </h4>
                <p className="text-[11px] text-slate-500">Introduzca los datos para la facturación interna</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 font-bold border border-slate-200 rounded-lg text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              
              {/* Type Switch and Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Tipo de Registro</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTipo('ENTRADA');
                        setCategoria(CATEGORIES.ENTRADA[0]);
                      }}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        tipo === 'ENTRADA'
                          ? 'border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-500/15'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      ENTRADA (Compra/Gasto)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTipo('SALIDA');
                        setCategoria(CATEGORIES.SALIDA[0]);
                      }}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        tipo === 'SALIDA'
                          ? 'border-green-500 bg-green-50 text-green-700 ring-2 ring-green-500/15'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      SALIDA (Venta/Ingreso)
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="fecha" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Fecha de Factura</label>
                  <input
                    type="text"
                    id="fecha"
                    placeholder="DD/MM/YYYY"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Formato recomendado: DD/MM/YYYY</span>
                </div>
              </div>

              {/* Document Type Selector (Factura vs Recibo de cargo/Tasa/Autónomo) */}
              <div className="bg-slate-50 p-3.5 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                <div>
                  <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">Clase de Documento Contable</span>
                  <p className="text-[10px] text-slate-500 leading-normal max-w-sm mt-0.5">
                    {tipo === 'ENTRADA' 
                      ? 'Diferencie entre una Factura de proveedor oficial (deducible IVA) o un Recibo/Justificante de tasas o seguros sociales (sin factura).'
                      : 'Especifique si emite una factura oficial completa o registra un recibo de entrega simple.'
                    }
                  </p>
                </div>

                <div className="inline-flex rounded-xl bg-slate-200/60 p-1 shrink-0 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setDocumentoTipo('Factura')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      documentoTipo === 'Factura'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    📃 Factura Oficial
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDocumentoTipo('Recibo');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      documentoTipo === 'Recibo'
                        ? 'bg-amber-100 text-amber-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    🧾 Recibo / Tasa Bancaria
                  </button>
                </div>
              </div>

              {/* Invoice Serial and Client info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="nFactura" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    {documentoTipo === 'Recibo' ? 'Ref/Cód Justificante (Opcional)' : 'Número de Factura'}
                  </label>
                  <input
                    type="text"
                    id="nFactura"
                    placeholder={documentoTipo === 'Recibo' ? 'Vacío = Auto-asignado' : 'ej. F26-00042 o 95257695'}
                    value={nFactura}
                    onChange={(e) => setNFactura(e.target.value)}
                    required={documentoTipo === 'Factura'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none font-mono"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="empresaCliente" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    {documentoTipo === 'Recibo' ? 'Entidad / Receptor del Pago' : 'Empresa / Cliente'}
                  </label>
                  <input
                    type="text"
                    id="empresaCliente"
                    placeholder={documentoTipo === 'Recibo' ? 'Ej. Ayuntamiento, Banco, Seguridad Social...' : 'Nombre comercial o social de la entidad'}
                    value={empresaCliente}
                    onChange={(e) => setEmpresaCliente(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
              </div>

              {/* NIF/CIF and Concepto */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="nifCif" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    {documentoTipo === 'Recibo' ? 'NIF / CIF Emisor (Opcional)' : 'NIF / CIF'}
                  </label>
                  <input
                    type="text"
                    id="nifCif"
                    placeholder={documentoTipo === 'Recibo' ? 'Escribir si se dispone' : 'Identificación fiscal'}
                    value={nifCif}
                    onChange={(e) => setNifCif(e.target.value)}
                    required={documentoTipo === 'Factura'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none uppercase font-mono"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="concepto" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Concepto Principal</label>
                  <input
                    type="text"
                    id="concepto"
                    placeholder="ej. COMPRA DE UTENSILIOS DE COCINA"
                    value={concepto}
                    onChange={(e) => setConcepto(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
              </div>

              {/* Categoría and Pago Method */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="categoria" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Categoría Contable</label>
                  <select
                    id="categoria"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none cursor-pointer"
                  >
                    {availableCategoriesInForm.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="metodoPago" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Método de Pago</label>
                  <select
                    id="metodoPago"
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Bizum">Bizum</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="estado" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Estado de Pago</label>
                  <select
                    id="estado"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="Pagada">Pagada</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Anulada">Anulada (Cancelada)</option>
                  </select>
                </div>
              </div>

              {/* Bases Imponibles and automatic calc indicators */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5">
                <span className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">Cálculo de Impuestos y Totales</span>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="baseImponible" className="block text-[10px] font-medium text-slate-500 mb-1">Base Imponible (€)</label>
                    <input
                      type="number"
                      id="baseImponible"
                      step="0.01"
                      min="0"
                      value={baseImponible === 0 ? '' : baseImponible}
                      onChange={(e) => setBaseImponible(Number(e.target.value))}
                      required
                      placeholder="0.00"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label htmlFor="porcIva" className="block text-[10px] font-medium text-slate-500 mb-1">% IVA Aplicable</label>
                    <select
                      id="porcIva"
                      value={porcIva}
                      onChange={(e) => setPorcIva(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="21">21% (Servicios / Gral)</option>
                      <option value="10">10% (Habitación / Resta.)</option>
                      <option value="4">4% (Superreducido)</option>
                      <option value="0">0% (Inmune / Exento)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="irpfPerc" className="block text-[10px] font-medium text-slate-500 mb-1">Retención IRPF (%)</label>
                    <select
                      id="irpfPerc"
                      value={irpfPerc}
                      onChange={(e) => setIrpfPerc(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="0">Sin retención (0%)</option>
                      <option value="15">Profesionales (15%)</option>
                      <option value="19">Arrendamientos (19%)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 pt-3.5 border-t border-slate-200/60 font-mono text-center text-xs">
                  <div className="bg-white/70 p-2.5 rounded-xl border border-slate-200">
                    <span className="block text-[9px] uppercase tracking-wide text-slate-500">Cuota IVA</span>
                    <span className="font-bold text-slate-700">+{calculatedFields.cuota_iva.toFixed(2)} €</span>
                  </div>

                  <div className="bg-white/70 p-2.5 rounded-xl border border-slate-200">
                    <span className="block text-[9px] uppercase tracking-wide text-slate-500 font-medium">Retención IRPF</span>
                    <span className="font-bold text-rose-600">
                      {calculatedFields.retencion_irpf > 0 ? `-${calculatedFields.retencion_irpf.toFixed(2)} €` : '0.00 €'}
                    </span>
                  </div>

                  <div className="bg-indigo-600 text-white p-2.5 rounded-xl font-sans">
                    <span className="block text-[9px] uppercase tracking-wide text-indigo-200 font-bold">TOTAL FACTURA</span>
                    <span className="font-extrabold text-white text-sm">{calculatedFields.total_factura.toFixed(2)} €</span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-150 cursor-pointer flex items-center gap-1.5 transition-all"
                >
                  <Check className="w-4 h-4" />
                  {editingInvoice ? 'Guardar Cambios' : 'Registrar Factura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Consulting Invoice Modal */}
      {consultingInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-fade-in font-sans">
            {/* Modal Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center text-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                    {lang === 'es' ? 'Ficha de Consulta Auditoría' : lang === 'fr' ? "Fiche d'Audit Comptable" : 'Strategic Audit Details'}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">UUID: {consultingInvoice.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setConsultingInvoice(null)}
                className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 font-bold border border-slate-200 rounded-lg text-xs cursor-pointer"
              >
                {lang === 'es' ? 'Cerrar' : lang === 'fr' ? 'Fermer' : 'Close'}
              </button>
            </div>

            {/* Information Grid */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 select-text">
              {/* Reference badge row */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">Nº Registro Fiscal</span>
                  <span className="text-sm font-black font-mono text-slate-800">#{consultingInvoice.n_origen}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider text-right">Clase Operación</span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider ${
                    consultingInvoice.tipo === 'ENTRADA' 
                      ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                      : 'bg-green-50 text-green-700 border border-green-100'
                  }`}>
                    {consultingInvoice.tipo === 'ENTRADA' 
                      ? (lang === 'es' ? '🔻 ENTRADA (Gasto)' : lang === 'fr' ? '🔻 ENTRÉE (Charges)' : '🔻 EXPENSE') 
                      : (lang === 'es' ? '🔺 SALIDA (Ingreso)' : lang === 'fr' ? '🔺 SORTIE (Revenus)' : '🔺 SALE INVOICE')
                    }
                  </span>
                </div>
              </div>

              {/* Company Info Box */}
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-2">
                <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                  {consultingInvoice.tipo === 'ENTRADA' 
                    ? (lang === 'es' ? 'Datos del Proveedor / Acreedor' : lang === 'fr' ? 'Détails du Fournisseur' : 'Merchant / Provider Details')
                    : (lang === 'es' ? 'Datos del Cliente Facturado' : lang === 'fr' ? 'Détails du Client' : 'Recipient / Client Details')
                  }
                </span>
                
                <div className="grid grid-cols-1 gap-1">
                  <p className="text-[10px] text-slate-400 font-semibold">{lang === 'es' ? 'Razon Social / Nombre:' : lang === 'fr' ? 'Dénomination :' : 'Company Name:'}</p>
                  <p className="text-sm font-extrabold text-slate-800 leading-tight uppercase font-mono">{consultingInvoice.empresa_cliente}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-200">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold">NIF / CIF:</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xs font-mono font-bold text-indigo-700 uppercase">{consultingInvoice.nif_cif}</p>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(consultingInvoice.nif_cif);
                          alert(lang === 'es' ? '¡NIF Copiado al portapapeles!' : 'NIF copied!');
                        }}
                        className="text-[9px] bg-slate-200/70 hover:bg-slate-300 p-0.5 px-1.5 rounded font-black text-slate-600 transition-colors cursor-pointer"
                        title="Copy NIF"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold">{lang === 'es' ? 'Fecha de Emisión:' : lang === 'fr' ? 'Date d\'Émission :' : 'Issue Date:'}</p>
                    <p className="text-xs font-mono font-bold text-slate-700 mt-0.5">{consultingInvoice.fecha}</p>
                  </div>
                </div>
              </div>

              {/* Ticket details */}
              <div className="space-y-3">
                <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">Concepto de Asiento & Categoría</span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold">{lang === 'es' ? 'Concepto Principal' : lang === 'fr' ? 'Libellé Concept' : 'Main Concept'}:</p>
                    <p className="text-xs text-slate-800 font-bold mt-1 leading-normal bg-slate-50 p-2.5 rounded-lg border border-slate-200 italic">{consultingInvoice.concepto}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold">{lang === 'es' ? 'Categoría Contable' : lang === 'fr' ? 'Catégorie Comptable' : 'Accounting Category'}:</p>
                    <p className="text-xs text-indigo-700 font-extrabold mt-1 leading-normal bg-indigo-50/40 p-2.5 rounded-lg border border-indigo-100 uppercase tracking-wide">
                      {consultingInvoice.categoria}
                    </p>
                  </div>
                </div>
              </div>

              {/* Fiscal Breakdown Summary */}
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">{lang === 'es' ? 'Desglose Impositivo / Fiscal' : lang === 'fr' ? 'Répartition Fiscale' : 'Tax & Financial Breakdown'}</span>
                
                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden font-mono text-xs">
                  {/* Base */}
                  <div className="flex justify-between items-center px-4 py-2 hover:bg-slate-100/50">
                    <span className="text-slate-500 font-semibold font-sans">{lang === 'es' ? 'Base Imponible' : lang === 'fr' ? 'Base Imposable' : 'Tax Base (Net)'}</span>
                    <span className="font-bold text-slate-800">{consultingInvoice.base_imponible.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
                  </div>

                  {/* IVA */}
                  <div className="flex justify-between items-center px-4 py-2 border-t border-slate-200 bg-slate-50 hover:bg-slate-100/50">
                    <span className="text-slate-500 font-semibold font-sans">
                      {lang === 'es' ? 'IVA Aplicado' : lang === 'fr' ? 'TVA' : 'VAT Applied'} <span className="text-[10px] text-slate-400 font-mono font-bold">({consultingInvoice.porc_iva}%)</span>
                    </span>
                    <span className="font-semibold text-emerald-700">+{consultingInvoice.cuota_iva.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
                  </div>

                  {/* IRPF (only if registered) */}
                  {consultingInvoice.irpf_perc > 0 && (
                    <div className="flex justify-between items-center px-4 py-2 border-t border-slate-200 bg-rose-50/10 hover:bg-rose-50/20 text-rose-700">
                      <span className="text-rose-500 font-semibold font-sans">
                        {lang === 'es' ? 'Retención IRPF' : lang === 'fr' ? "Retenue d'impôt" : 'Withholding Taxes (IRPF)'} <span className="text-[10px] text-rose-400 font-mono font-bold">({consultingInvoice.irpf_perc}%)</span>
                      </span>
                      <span className="font-medium">- {consultingInvoice.retencion_irpf.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
                    </div>
                  )}

                  {/* Absolute Total */}
                  <div className="flex justify-between items-center px-4 py-3 border-t border-slate-200 bg-indigo-600 text-white font-sans">
                    <span className="font-black text-xs uppercase tracking-wider">{lang === 'es' ? 'TOTAL DE FACTURA' : lang === 'fr' ? 'TOTAL FACTURÉ' : 'TOTAL AMOUNT'}</span>
                    <span className="text-base font-black font-mono">{consultingInvoice.total_factura.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
                  </div>
                </div>
              </div>

              {/* Status and Method */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4">
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold">{lang === 'es' ? 'Método de Pago' : lang === 'fr' ? 'Méthode de Paiement' : 'Payment Method'}:</p>
                  <p className="text-xs font-black text-slate-700 uppercase flex items-center gap-1.5 mt-1 font-mono">
                    💳 {consultingInvoice.metodo_pago}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] text-slate-400 font-semibold">{lang === 'es' ? 'Estado Conciliación' : lang === 'fr' ? 'Statut du Paiement' : 'Verification Status'}:</p>
                  <div className="mt-1">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                      consultingInvoice.estado === 'Pagada' ? 'bg-green-50 text-green-700 border border-green-200 font-extrabold' :
                      consultingInvoice.estado === 'Pendiente' ? 'bg-amber-50 text-amber-700 border border-amber-200 font-extrabold' : 'bg-slate-100 text-slate-500 border border-slate-200 font-extrabold'
                    }`}>
                      ● {consultingInvoice.estado}
                    </span>
                  </div>
                </div>
              </div>

              {/* Audit logs & creators */}
              <div className="border-t border-slate-200 pt-4 flex justify-between items-center text-[10px] text-slate-400 bg-slate-50/70 -mx-6 -mb-6 p-4 px-6 border-b rounded-b-2xl">
                <div>
                  <span>{lang === 'es' ? 'Registrado por:' : lang === 'fr' ? 'Enregistré par :' : 'Keyed-by:'} </span>
                  <span className="font-mono bg-indigo-50 px-1 py-0.2 rounded border border-indigo-200">
                    {consultingInvoice.usuario}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="font-semibold">Nº Doc: <span className="font-mono bg-white px-1.5 py-0.5 leading-none rounded select-all font-bold text-slate-600 border border-slate-200">{consultingInvoice.n_factura}</span></span>
                </div>
              </div>

            </div>

            {/* Print/Close actions */}
            <div className="p-4 px-6 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1 cursor-pointer font-semibold border border-slate-200"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                {lang === 'es' ? 'Imprimir Ficha' : lang === 'fr' ? "Imprimer l'état" : 'Print Record'}
              </button>

              <button
                type="button"
                onClick={() => setConsultingInvoice(null)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black cursor-pointer transition-all"
              >
                {lang === 'es' ? 'Cerrar' : lang === 'fr' ? 'Fermer' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
