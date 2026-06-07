/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { ManualBookingFund, UserAccount, Invoice, DetailedCosts, RolePermissions } from '../types';
import { Lang, TRANSLATIONS } from '../translations';
import { 
  CircleDollarSign, Plus, Trash2, Printer, Search, Calendar, 
  TrendingUp, PiggyBank, ArrowDownLeft, ArrowUpRight, CheckCircle, 
  FileText, CreditCard, Wallet, Send, Download, RefreshCw, Layers, Eye
} from 'lucide-react';

interface MonthlyRecapProps {
  currentUser: UserAccount;
  invoices: Invoice[];
  funds: ManualBookingFund[];
  onAddFund: (newFund: ManualBookingFund) => void;
  onDeleteFund: (id: string) => void;
  lang: Lang;
  detailedCosts: { [month: string]: DetailedCosts };
  onUpdateDetailedCosts: React.Dispatch<React.SetStateAction<{ [month: string]: DetailedCosts }>>;
  userPermissions?: RolePermissions;
  onRedirectToCosts?: () => void;
}

export default function MonthlyRecap({
  currentUser,
  invoices,
  funds,
  onAddFund,
  onDeleteFund,
  lang,
  detailedCosts,
  onUpdateDetailedCosts,
  userPermissions,
  onRedirectToCosts
}: MonthlyRecapProps) {
  const t = TRANSLATIONS[lang];
  // Active selected audit month selector: e.g. "2026-06"
  const [selectedMonth, setSelectedMonth] = useState('2026-06');

  // Interactive Form State for adding new fund
  const [fundId, setFundId] = useState('');
  const [fecha, setFecha] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD
  });
  const [montoString, setMontoString] = useState('');
  const [metodoPago, setMetodoPago] = useState<'TPV' | 'Efectivo' | 'Transferencia' | 'Bizum' | 'Otros' | 'Online'>('TPV');
  const [concepto, setConcepto] = useState('');
  const [horaTransferencia, setHoraTransferencia] = useState(() => {
    const today = new Date();
    return today.toTimeString().substring(0, 5); // "HH:MM"
  });
  const [refBanco, setRefBanco] = useState('');

  // Form State for dynamic custom costs
  const [customCostLabel, setCustomCostLabel] = useState('');
  const [customCostAmountString, setCustomCostAmountString] = useState('');

  // Permissions helpers
  const canManageFunds = userPermissions ? userPermissions.manageManualFunds : (currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER' || currentUser.role === 'SUPPORT');
  const canManageCosts = userPermissions ? userPermissions.manageDetailedCosts : (currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER' || currentUser.role === 'SUPPORT');

  // Handle updating detailed costs per month
  const handleUpdateCostField = (field: keyof DetailedCosts, value: number) => {
    onUpdateDetailedCosts(prev => {
      const currentMonthCosts = prev[selectedMonth] || { 
        empleadosSueldos: 0, 
        seguridadSocialEmpresa: 0, 
        autonomosOtros: 0, 
        otrosCostes: 0,
        suministrosDirectos: 0,
        segurosHotel: 0,
        tasasImpuestos: 0,
        customCosts: []
      };
      const updatedMonth = { ...currentMonthCosts, [field]: value };
      const nextCosts = { ...prev, [selectedMonth]: updatedMonth };
      localStorage.setItem('hostal_detailed_monthly_costs', JSON.stringify(nextCosts));
      return nextCosts;
    });
  };

  const handleAddCustomCost = (label: string, amount: number) => {
    if (!label.trim() || amount <= 0) return;
    onUpdateDetailedCosts(prev => {
      const currentMonthCosts = prev[selectedMonth] || { 
        empleadosSueldos: 0, 
        seguridadSocialEmpresa: 0, 
        autonomosOtros: 0, 
        otrosCostes: 0,
        suministrosDirectos: 0,
        segurosHotel: 0,
        tasasImpuestos: 0,
        customCosts: [] 
      };
      const currentCustoms = currentMonthCosts.customCosts || [];
      const newCustomItem = { id: 'cost-' + Date.now(), label: label.trim(), amount };
      const updatedMonth = {
        ...currentMonthCosts,
        customCosts: [...currentCustoms, newCustomItem]
      };
      const nextCosts = { ...prev, [selectedMonth]: updatedMonth };
      localStorage.setItem('hostal_detailed_monthly_costs', JSON.stringify(nextCosts));
      return nextCosts;
    });
  };

  const handleRemoveCustomCost = (itemId: string) => {
    onUpdateDetailedCosts(prev => {
      const currentMonthCosts = prev[selectedMonth];
      if (!currentMonthCosts) return prev;
      const currentCustoms = currentMonthCosts.customCosts || [];
      const updatedMonth = {
        ...currentMonthCosts,
        customCosts: currentCustoms.filter(item => item.id !== itemId)
      };
      const nextCosts = { ...prev, [selectedMonth]: updatedMonth };
      localStorage.setItem('hostal_detailed_monthly_costs', JSON.stringify(nextCosts));
      return nextCosts;
    });
  };

  
  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Selected manual fund detail lookup overlay modal State
  const [consultingFund, setConsultingFund] = useState<ManualBookingFund | null>(null);

  // Hostal Information
  const hostalInfo = {
    name: 'HOSTAL SERRAMAR',
    company: 'SUN SERRAMAR SL',
    cif: 'B21902432',
    address: 'CALLE LAS FLORES, 5, 29631 BENALMADINA, MALAGA, ESPAÑA',
    email: 'SERRAMAR2906@GMAIL.COM',
    tel: '+34 652442604'
  };

  // Generate dynamic next transaction reference code suggestion
  const suggestedNextTxId = useMemo(() => {
    if (funds.length === 0) return 'TX-1001';
    // Match digit suffix
    const numericSuffixes = funds
      .map(f => {
        const parts = f.id.match(/\d+/);
        return parts ? parseInt(parts[0], 10) : 0;
      })
      .filter(n => n > 0);
    const maxVal = numericSuffixes.length > 0 ? Math.max(...numericSuffixes) : 1000;
    return `TX-${maxVal + 1}`;
  }, [funds]);

  // Handle registering new manual fund/booking
  const handleAddFundSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalMonto = parseFloat(montoString);
    if (isNaN(finalMonto) || finalMonto <= 0) {
      alert('Por favor introduzca un monto válido mayor que cero.');
      return;
    }

    if (!concepto.trim()) {
      alert('Por favor introduzca una descripción u concepto para el fondo.');
      return;
    }

    const finalTxId = fundId.trim() || suggestedNextTxId;
    
    // Check if ID already exists
    if (funds.some(f => f.id.toLowerCase() === finalTxId.toLowerCase())) {
      alert(`El ID de transferencia / fondo "${finalTxId}" ya está registrado. Use otro identificador o deje vacío para auto-asignar.`);
      return;
    }

    // Determine YYYY-MM month reference from selected fecha
    const parsedMonth = fecha.substring(0, 7); // e.g. "2026-06"

    const newFund: ManualBookingFund = {
      id: finalTxId,
      fecha,
      monto: finalMonto,
      metodo_pago: metodoPago,
      concepto: concepto.trim(),
      mes_referencia: parsedMonth,
      usuario: currentUser.name.split(' ')[0],
      referencia_banco: (metodoPago === 'Transferencia' || metodoPago === 'Online') ? refBanco.trim() : undefined,
      hora_transferencia: horaTransferencia.trim() || undefined
    };

    onAddFund(newFund);

    // Reset Form fields
    setFundId('');
    setMontoString('');
    setConcepto('');
    setRefBanco('');
    const today = new Date();
    setFecha(today.toISOString().split('T')[0]);
    setHoraTransferencia(today.toTimeString().substring(0, 5));
  };

  // Filter regular invoices of that month for dual report
  // Spanish invoices date form: '01/06/2026' represents DD/MM/YYYY
  const currentMonthInvoices = useMemo(() => {
    const [year, month] = selectedMonth.split('-'); // e.g. "2026", "06"
    return invoices.filter(inv => {
      const parts = inv.fecha.split('/');
      if (parts.length === 3) {
        // match year & month
        const invMonth = parts[1];
        const invYear = parts[2];
        return invMonth === month && invYear === year;
      }
      return false;
    });
  }, [invoices, selectedMonth]);

  // Segment traditional entries of the selected month
  const traditionalStats = useMemo(() => {
    let totalEntradas = 0; // Costos / Gastos
    let totalSalidas = 0; // Facturado a clientes ordinarios

    currentMonthInvoices.forEach(inv => {
      if (inv.estado === 'Anulada') return;
      if (inv.tipo === 'ENTRADA') {
        totalEntradas += inv.total_factura;
      }
      // SALIDA = informational only (already covered by SERAMAR booking imports)
      // Do NOT add to totalSalidas — only show IVA for fiscal reference
    });

    return {
      entradas: Number(totalEntradas.toFixed(2)),
      salidas: Number(totalSalidas.toFixed(2))
    };
  }, [currentMonthInvoices]);

  // Filter manual funds based on selected reference month
  const currentMonthFunds = useMemo(() => {
    return funds.filter(f => f.mes_referencia === selectedMonth);
  }, [funds, selectedMonth]);

  // Live filtered manual funds feed according to search input
  const searchedFunds = useMemo(() => {
    return currentMonthFunds.filter(f => {
      const q = searchQuery.toLowerCase();
      return (
        f.id.toLowerCase().includes(q) ||
        f.concepto.toLowerCase().includes(q) ||
        f.metodo_pago.toLowerCase().includes(q) ||
        f.fecha.includes(q) ||
        f.monto.toString().includes(q) ||
        (f.referencia_banco && f.referencia_banco.toLowerCase().includes(q)) ||
        (f.hora_transferencia && f.hora_transferencia.includes(q))
      );
    });
  }, [currentMonthFunds, searchQuery]);

  // Metrics specifically for the currently selected month manual bookings
  const fundMetrics = useMemo(() => {
    let tpvTotal = 0;
    let cashTotal = 0;
    let transferTotal = 0;
    let onlineTotal = 0;
    let otherTotal = 0;

    currentMonthFunds.forEach(f => {
      if (f.metodo_pago === 'TPV') {
        tpvTotal += f.monto;
      } else if (f.metodo_pago === 'Efectivo') {
        cashTotal += f.monto;
      } else if (f.metodo_pago === 'Transferencia') {
        transferTotal += f.monto;
      } else if (f.metodo_pago === 'Online') {
        onlineTotal += f.monto;
      } else {
        otherTotal += f.monto; // Bizum, Otros
      }
    });

    const totalFunds = tpvTotal + cashTotal + transferTotal + onlineTotal + otherTotal;

    return {
      tpv: Number(tpvTotal.toFixed(2)),
      cash: Number(cashTotal.toFixed(2)),
      transfer: Number(transferTotal.toFixed(2)),
      online: Number(onlineTotal.toFixed(2)),
      other: Number(otherTotal.toFixed(2)),
      total: Number(totalFunds.toFixed(2))
    };
  }, [currentMonthFunds]);

  // Integrated totals combining traditional income and manual book entries with workers pay & invoice cost entradas
  const consolidatedAudit = useMemo(() => {
    const totalIngresosClaseCaja = traditionalStats.salidas + fundMetrics.total;
    const currentCosts = detailedCosts[selectedMonth] || { 
      empleadosSueldos: 0, 
      seguridadSocialEmpresa: 0, 
      autonomosOtros: 0, 
      otrosCostes: 0,
      suministrosDirectos: 0,
      segurosHotel: 0,
      tasasImpuestos: 0,
      customCosts: []
    };
    
    let currentWorkerCost = (currentCosts.empleadosSueldos || 0) + 
                            (currentCosts.seguridadSocialEmpresa || 0) + 
                            (currentCosts.autonomosOtros || 0) + 
                            (currentCosts.otrosCostes || 0) +
                            (currentCosts.suministrosDirectos || 0) +
                            (currentCosts.segurosHotel || 0) +
                            (currentCosts.tasasImpuestos || 0);

    if (currentCosts.customCosts && Array.isArray(currentCosts.customCosts)) {
      currentCosts.customCosts.forEach(item => {
        currentWorkerCost += (item.amount || 0);
      });
    }

    const totalGastosEfectivos = traditionalStats.entradas + currentWorkerCost;
    const netoCaja = totalIngresosClaseCaja - totalGastosEfectivos;

    return {
      ingresosTotales: Number(totalIngresosClaseCaja.toFixed(2)),
      gastosFacturas: traditionalStats.entradas,
      gastosTrabajadores: currentWorkerCost,
      gastosDetalle: currentCosts,
      gastosTotales: Number(totalGastosEfectivos.toFixed(2)),
      balanceNeto: Number(netoCaja.toFixed(2)),
      // Profit margin = net profit / total revenue × 100 (standard formula)
      rentabilidadPorcentaje: totalIngresosClaseCaja > 0 
        ? Math.round((netoCaja / totalIngresosClaseCaja) * 100) 
        : 0
    };
  }, [traditionalStats, fundMetrics, detailedCosts, selectedMonth]);

  // Predefined month selections for faster auditing navigation
  const availableMonths = [
    { label: 'Junio 2026', value: '2026-06' },
    { label: 'Mayo 2026', value: '2026-05' },
    { label: 'Abril 2026', value: '2026-04' },
    { label: 'Marzo 2026', value: '2026-03' },
    { label: 'Febrero 2026', value: '2026-02' },
  ];

  const currentCostsForSelectedMonth = (detailedCosts[selectedMonth] || {}) as DetailedCosts;
  const hasItemizedEmployees = !!(currentCostsForSelectedMonth.employees && currentCostsForSelectedMonth.employees.length > 0);
  const hasItemizedOverheads = !!(currentCostsForSelectedMonth.overheads && currentCostsForSelectedMonth.overheads.length > 0);

  const handlePrintReport = () => {
    const hostalInfo = {
      name: 'HOSTAL SERRAMAR',
      company: 'SUN SERRAMAR SL',
      cif: 'B21902432',
      address: 'CALLE LAS FLORES, 5, 29631 BENALMADINA, MALAGA',
      email: 'SERRAMAR2906@GMAIL.COM',
      tel: '+34 652442604'
    };
    const today = new Date().toLocaleDateString('es-ES');
    const monthLabel = availableMonths.find(m => m.value === selectedMonth)?.label || selectedMonth;
    
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    
    w.document.write(`
      <!DOCTYPE html>
      <html><head><meta charset="UTF-8">
      <title>Informe Mensual - ${monthLabel}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1e293b; padding: 40px 50px; max-width: 210mm; margin: 0 auto; }
        h1 { font-size: 18pt; font-weight: 800; margin-bottom: 2px; }
        h2 { font-size: 12pt; font-weight: 700; margin: 20px 0 10px; padding-bottom: 4px; border-bottom: 1px solid #cbd5e1; }
        .brand { font-size: 8pt; color: #64748b; line-height: 1.4; margin-bottom: 8px; }
        .brand strong { color: #1e293b; }
        .meta { display: flex; justify-content: space-between; border-bottom: 2px solid #1e293b; padding-bottom: 10px; margin-bottom: 20px; }
        .meta-left { text-align: left; }
        .meta-right { text-align: right; font-size: 9pt; }
        .meta-right span { display: block; }
        table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 12px; page-break-inside: avoid; }
        th { background: #f1f5f9; color: #1e293b; font-weight: 700; font-size: 8pt; text-transform: uppercase; padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left; }
        td { padding: 5px 8px; border: 1px solid #e2e8f0; font-size: 9pt; }
        .num { text-align: right; font-family: 'Consolas', monospace; }
        .total-row td { font-weight: 800; font-size: 10pt; border-top: 2px solid #1e293b; background: #f8fafc; }
        .positive { color: #059669; }
        .negative { color: #dc2626; }
        .footer { margin-top: 30px; font-size: 8pt; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        .signature { margin-top: 60px; display: flex; justify-content: space-between; }
        .sig-line { border-top: 1px solid #1e293b; width: 200px; margin-top: 40px; }
        .sig-label { font-size: 8pt; color: #64748b; margin-top: 4px; }
        @media print { body { padding: 0; } }
      </style></head>
      <body>
        <div class="meta">
          <div class="meta-left">
            <h1>INFORME MENSUAL DE CAJA</h1>
            <div class="brand">
              <strong>${hostalInfo.company}</strong> | CIF: ${hostalInfo.cif}<br>
              ${hostalInfo.address}<br>
              ${hostalInfo.email} | ${hostalInfo.tel}
            </div>
          </div>
          <div class="meta-right">
            <span><strong>Periodo:</strong> ${monthLabel}</span>
            <span><strong>Fecha:</strong> ${today}</span>
            <span><strong>Ref:</strong> AUDIT-${selectedMonth}</span>
          </div>
        </div>

        <h2>1. INGRESOS (INBOUND)</h2>
        <table>
          <tr><th>Concepto</th><th class="num">Importe (EUR)</th></tr>
          <tr><td>Facturas Emitidas (Salidas)</td><td class="num">${traditionalStats.salidas.toLocaleString('es-ES', {minimumFractionDigits:2})} €</td></tr>
          <tr><td>Reservas Manuales TPV</td><td class="num">${fundMetrics.tpv.toLocaleString('es-ES', {minimumFractionDigits:2})} €</td></tr>
          <tr><td>Reservas Manuales Efectivo</td><td class="num">${fundMetrics.cash.toLocaleString('es-ES', {minimumFractionDigits:2})} €</td></tr>
          <tr><td>Transferencias Bancarias</td><td class="num">${fundMetrics.transfer.toLocaleString('es-ES', {minimumFractionDigits:2})} €</td></tr>
          <tr><td>Online / Booking.com</td><td class="num">${fundMetrics.online.toLocaleString('es-ES', {minimumFractionDigits:2})} €</td></tr>
          <tr><td>Bizum / Otros</td><td class="num">${fundMetrics.other.toLocaleString('es-ES', {minimumFractionDigits:2})} €</td></tr>
          <tr class="total-row"><td><strong>TOTAL INGRESOS</strong></td><td class="num"><strong>${consolidatedAudit.ingresosTotales.toLocaleString('es-ES', {minimumFractionDigits:2})} €</strong></td></tr>
        </table>

        <h2>2. GASTOS (OUTBOUND)</h2>
        <table>
          <tr><th>Concepto</th><th class="num">Importe (EUR)</th></tr>
          <tr><td>Facturas de Proveedores (Entradas)</td><td class="num">${consolidatedAudit.gastosFacturas.toLocaleString('es-ES', {minimumFractionDigits:2})} €</td></tr>
          <tr><td>Nóminas (Sueldos Netos)</td><td class="num">${(consolidatedAudit.gastosDetalle.empleadosSueldos || 0).toLocaleString('es-ES', {minimumFractionDigits:2})} €</td></tr>
          <tr><td>Seguridad Social Empresa</td><td class="num">${(consolidatedAudit.gastosDetalle.seguridadSocialEmpresa || 0).toLocaleString('es-ES', {minimumFractionDigits:2})} €</td></tr>
          <tr><td>Autónomos / Dirección</td><td class="num">${(consolidatedAudit.gastosDetalle.autonomosOtros || 0).toLocaleString('es-ES', {minimumFractionDigits:2})} €</td></tr>
          <tr><td>Suministros (Luz, Agua, Internet)</td><td class="num">${(consolidatedAudit.gastosDetalle.suministrosDirectos || 0).toLocaleString('es-ES', {minimumFractionDigits:2})} €</td></tr>
          <tr><td>Seguros Hotel</td><td class="num">${(consolidatedAudit.gastosDetalle.segurosHotel || 0).toLocaleString('es-ES', {minimumFractionDigits:2})} €</td></tr>
          <tr><td>Tasas e Impuestos</td><td class="num">${(consolidatedAudit.gastosDetalle.tasasImpuestos || 0).toLocaleString('es-ES', {minimumFractionDigits:2})} €</td></tr>
          <tr><td>Otros Costes</td><td class="num">${(consolidatedAudit.gastosDetalle.otrosCostes || 0).toLocaleString('es-ES', {minimumFractionDigits:2})} €</td></tr>
          ${(consolidatedAudit.gastosDetalle.customCosts || []).map((c: any) => `<tr><td>↳ ${c.label}</td><td class="num">${c.amount.toLocaleString('es-ES', {minimumFractionDigits:2})} €</td></tr>`).join('')}
          <tr class="total-row"><td><strong>TOTAL GASTOS</strong></td><td class="num"><strong>${consolidatedAudit.gastosTotales.toLocaleString('es-ES', {minimumFractionDigits:2})} €</strong></td></tr>
        </table>

        <h2>3. RESULTADO NETO</h2>
        <table>
          <tr><th>Concepto</th><th class="num">Importe (EUR)</th></tr>
          <tr><td>Total Ingresos</td><td class="num positive">+ ${consolidatedAudit.ingresosTotales.toLocaleString('es-ES', {minimumFractionDigits:2})} €</td></tr>
          <tr><td>Total Gastos</td><td class="num negative">- ${consolidatedAudit.gastosTotales.toLocaleString('es-ES', {minimumFractionDigits:2})} €</td></tr>
          <tr class="total-row"><td><strong>BENEFICIO NETO</strong></td><td class="num"><strong class="${consolidatedAudit.balanceNeto >= 0 ? 'positive' : 'negative'}">${consolidatedAudit.balanceNeto.toLocaleString('es-ES', {minimumFractionDigits:2})} €</strong></td></tr>
          <tr><td>Margen de Rentabilidad</td><td class="num"><strong>${consolidatedAudit.rentabilidadPorcentaje}%</strong></td></tr>
        </table>

        <div class="signature">
          <div><div class="sig-line"></div><div class="sig-label">Firma del Director de Operaciones</div></div>
          <div><div class="sig-line"></div><div class="sig-label">Firma del Administrador / Auditor</div></div>
        </div>
        <div class="footer">${hostalInfo.company} | ${hostalInfo.cif} | ${hostalInfo.address} | Generado: ${today} | Versión 1.0</div>
      </body></html>
    `);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const handleExportMonthlyRecapCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `INFORME INTEGRAL DE CONCILIACION MENSUAL - Hostal Serramar\n`;
    csvContent += `Mes Referencia: ${selectedMonth}\n\n`;
    csvContent += `SECCION,CONCEPTO/PAGO,DETALLES,MONTO_EUR\n`;
    
    // Inbound Incomes
    csvContent += `INGRESOS,Facturación Tradicional Ordinaria,Facturas de Salidas,${traditionalStats.salidas}\n`;
    csvContent += `INGRESOS,Manual TPV Offline,Fondos TPV,${fundMetrics.tpv}\n`;
    csvContent += `INGRESOS,Manual Efectivo (Cash) Offline,Fondos Efectivo,${fundMetrics.cash}\n`;
    csvContent += `INGRESOS,Transferencia Bancaria Manual,Fondo Bancario Directo,${fundMetrics.transfer}\n`;
    csvContent += `INGRESOS,Transferencia Agencia Online,Fondo Liquidación Online,${fundMetrics.online}\n`;
    csvContent += `INGRESOS,Bizum / Otros,Otros Métodos de Cobro,${fundMetrics.other}\n`;
    csvContent += `INGRESOS,TOTAL INGRESOS (INBOUND),Ingresos Conciliados,${consolidatedAudit.ingresosTotales}\n\n`;
    
    // Outbound Expenses
    csvContent += `GASTOS,Compras Facturas Recurrentes,Asientos de Entrada,${traditionalStats.entradas}\n`;
    csvContent += `GASTOS,Trabajadores y Dirección,Nóminas de Empleados,${consolidatedAudit.gastosTrabajadores}\n`;
    csvContent += `GASTOS,TOTAL GASTOS (OUTBOUND),Egresos Conciliados,${consolidatedAudit.gastosTotales}\n\n`;
    
    // Balanced Margin
    csvContent += `RENTABILIDAD,CONCILIACIÓN NETO MENSUAL,Balance de Caja,${consolidatedAudit.balanceNeto}\n`;
    csvContent += `RENTABILIDAD,PROVINCIONAL RENTABILIDAD,Margen Porcentual,${consolidatedAudit.rentabilidadPorcentaje}%\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `auditoria_mensual_hotel_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* BRAND & HEADER SUMMARY CARD */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-indigo-950 relative overflow-hidden">
        {/* Decorative backdrop elements */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-2xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-black uppercase tracking-wider mb-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Hostal Serramar • Audit & Recap Module</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-2">
              Recuento y Auditoría de Fondos Diarios
            </h2>
            <p className="text-slate-300 text-xs font-medium max-w-2xl leading-relaxed">
              Registre y audite los fondos recibidos a través de <span className="font-extrabold text-white">TPV</span>, <span className="font-extrabold text-white">Efectivo (Cash)</span> o <span className="font-extrabold text-white">Transferencias externas</span> para reservas manuales y reservas directas del Hostal. Obtenga un informe mensual consolidado imprimible.
            </p>
          </div>

          {/* Month selector action dropdown */}
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/10 shrink-0 w-full md:w-auto">
            <span className="block text-[9px] uppercase font-bold text-indigo-300 tracking-wider mb-2">MES DE AUDITORÍA ACTIVO</span>
            <div className="flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-indigo-400 shrink-0" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-white font-extrabold text-sm focus:outline-none cursor-pointer pr-4"
              >
                {availableMonths.map(m => (
                  <option key={m.value} value={m.value} className="bg-slate-900 text-white">
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Corporate contact bar indicator */}
        <div className="border-t border-white/10 mt-6 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-indigo-200">
          <div>
            <span className="text-[9px] text-slate-400 block font-bold">EMISOR FISCAL</span>
            <span className="font-semibold text-white">{hostalInfo.company}</span>
          </div>
          <div>
            <span className="text-[9px] text-slate-400 block font-bold">NIF / CIF</span>
            <span className="font-mono text-white">{hostalInfo.cif}</span>
          </div>
          <div>
            <span className="text-[9px] text-slate-400 block font-bold">UBICACIÓN</span>
            <span className="text-white truncate block max-w-xs" title={hostalInfo.address}>Benalmádena (Málaga)</span>
          </div>
          <div>
            <span className="text-[9px] text-slate-400 block font-bold">SOPORTE INTERNO</span>
            <span className="text-indigo-300 truncate block">{hostalInfo.email}</span>
          </div>
        </div>
      </div>

      {/* METRICS ROW (MONTHLY CONSOLIDATION & AUDIT) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* KPI 1 : Manual TPV Received */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block mb-1">TOTAL MANUAL MONTHLY TPV</span>
            <p className="text-2xl font-black text-slate-800 font-mono">
              {fundMetrics.tpv.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </p>
            <span className="text-[9px] text-slate-500 font-semibold mt-1 block">
              Suma recibida cobrada por TPV
            </span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <CreditCard className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* KPI 2 : Manual Cash Received */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider block mb-1">TOTAL MANUAL MONTHLY CASH</span>
            <p className="text-2xl font-black text-emerald-800 font-mono">
              {fundMetrics.cash.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </p>
            <span className="text-[9px] text-slate-500 font-semibold mt-1 block">
              Suma total cobrada en Efectivo
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Wallet className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* KPI 3 : Bank Transfers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider block mb-1">TOTAL BANK TRANSFER (VIA TIME/REF)</span>
            <p className="text-2xl font-black text-blue-800 font-mono">
              {fundMetrics.transfer.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </p>
            <span className="text-[9px] text-slate-500 font-semibold mt-1 block border-t border-slate-100 pt-1">
              {currentMonthFunds.filter(f => f.metodo_pago === 'Transferencia').length} transferencias bancarias
            </span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Send className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* KPI 3.5 : Online Agency (Booking.com & Web) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-purple-700 uppercase tracking-wider block mb-1">ONLINE / BOOKING.COM AGENT</span>
            <p className="text-2xl font-black text-purple-800 font-mono">
              {fundMetrics.online.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </p>
            <span className="text-[9px] text-slate-500 font-semibold mt-1 block border-t border-slate-100 pt-1">
              {currentMonthFunds.filter(f => f.metodo_pago === 'Online').length} liquidaciones online
            </span>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl font-bold flex items-center justify-center text-sm">
            🌐
          </div>
        </div>

        {/* KPI 4 : Consolidated Manual Fund sum */}
        <div className="bg-indigo-600 text-white p-5 rounded-2xl shadow-md flex items-center justify-between border border-indigo-700">
          <div>
            <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider block mb-1">TOTAL MANUAL BOOKINGS</span>
            <p className="text-2xl font-black font-mono">
              {fundMetrics.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </p>
            <span className="text-[9px] text-indigo-100 font-semibold mt-1 block">
              Suma de TPV, Efectivo, Transf, y Otros
            </span>
          </div>
          <div className="p-3 bg-indigo-500 text-white rounded-xl">
            <CircleDollarSign className="w-5.5 h-5.5" />
          </div>
        </div>

      </div>

      {/* THREE PANELS GRID: Register / Explore Feeds / Audit Cross Check */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* PANEL LEFT: ADD MANUAL BOOKING FUND FORM (col-span 5) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">Agregar Ingreso de Reserva / Fondo</h3>
              <p className="text-[10px] text-slate-400">Inserte nuevos cobros no emitidos como facturas recurrentes</p>
            </div>
          </div>

          {!canManageFunds && (
            <div className="bg-amber-50 border border-amber-200 text-amber-850 p-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 mb-2 text-left">
              <span>🔒</span>
              <span>{lang === 'es' ? 'Solo lectura: Su rol no tiene permisos para crear fondos.' : 'Read-only: Your role does not have permissions to register funds.'}</span>
            </div>
          )}

          <form onSubmit={handleAddFundSubmit} className="space-y-4">
            <fieldset disabled={!canManageFunds} className="space-y-4 text-left">
            
            {/* Input: ID / Identificador Transferencia */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                ID / REFERENCIA COBRO ({suggestedNextTxId})
              </label>
              <input
                type="text"
                value={fundId}
                onChange={(e) => setFundId(e.target.value)}
                placeholder={`Dejar vacío para: ${suggestedNextTxId}`}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-600 text-slate-700 placeholder:text-slate-400 font-mono font-bold"
              />
            </div>

             {/* Input: Fecha & Hora de Recepción */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  FECHA COBRO
                </label>
                <input
                  type="date"
                  required
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-600 text-slate-700 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  HORA COBRO
                </label>
                <input
                  type="time"
                  required
                  value={horaTransferencia}
                  onChange={(e) => setHoraTransferencia(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-600 text-slate-700 font-mono font-bold"
                />
              </div>
            </div>

            {/* Input Grid: Monto & Método de Pago */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  MONTO (€)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="350.00"
                    value={montoString}
                    onChange={(e) => setMontoString(e.target.value)}
                    className="w-full pl-3 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-600 text-slate-700"
                  />
                  <span className="absolute right-3 top-2.5 text-[10px] font-mono text-slate-400 font-semibold">€</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  MÉTODO DE COBRO
                </label>
                <select
                  value={metodoPago}
                  onChange={(e: any) => setMetodoPago(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 cursor-pointer"
                >
                  <option value="Efectivo">{lang === 'es' ? '1. Efectivo (Offline Cash)' : '1. Cash (Offline Efectivo)'}</option>
                  <option value="TPV">{lang === 'es' ? '2. TPV (Offline Card)' : '2. TPV reception (Offline Card)'}</option>
                  <option value="Transferencia">{lang === 'es' ? '3. Transferencia Directa (Offline Bank)' : '3. Standard Wire (Offline Bank)'}</option>
                  <option value="Online">{lang === 'es' ? '4. Transferencia Agencia (Online - Booking.com, Web...)' : '4. Agency Transfer (Online - Booking.com, Web...)'}</option>
                  <option value="Bizum">Bizum</option>
                  <option value="Otros">{lang === 'es' ? 'Otros' : 'Others'}</option>
                </select>
              </div>
            </div>

            {/* Dynamic context field for Bank Transfers or Online settlements */}
            {(metodoPago === 'Transferencia' || metodoPago === 'Online') && (
              <div className="p-3 bg-blue-50 border border-blue-150 rounded-xl space-y-2 animate-fade-in text-left">
                <span className="block text-[9px] uppercase font-black text-blue-700 tracking-wider">
                  {metodoPago === 'Online' ? 'Referencia de la Liquidación Online / Banco' : 'Detalles de Transferencia Bancaria Obligatorios'}
                </span>
                <div>
                  <label className="block text-[9px] font-bold uppercase text-slate-500 mb-0.5">REFERENCIA O CÓDIGO DE OPERACIÓN BANCO</label>
                  <input
                    type="text"
                    required={metodoPago === 'Transferencia' || metodoPago === 'Online'}
                    placeholder={metodoPago === 'Online' ? "Ej. Liquidación Semanal Booking..." : "Ej. ES91 3000 4523..."}
                    value={refBanco}
                    onChange={(e) => setRefBanco(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-slate-700"
                  />
                </div>
              </div>
            )}

            {/* Input: Concepto */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                DETALLE DE LA RESERVA / CONCEPTO
              </label>
              <textarea
                rows={2}
                required
                placeholder="Por ejemplo: Reserva Manuel - 4 noches Hab. Doble TPV"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 placeholder:text-slate-400"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="w-4.5 h-4.5" />
              Ingresar Fondo
            </button>
            </fieldset>
          </form>
        </div>

        {/* PANEL RIGHT: DETAILED REGISTER FEED & TABLE (col-span 7) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          
          <div className="space-y-3">
            {/* Table Header and Search Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800">Historial Diario • {availableMonths.find(m => m.value === selectedMonth)?.label}</h3>
                <p className="text-[10px] text-slate-400">Suma total de fondos registrados para este periodo</p>
              </div>

              {/* Dynamic Search Box */}
              <div className="relative w-full sm:w-48">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar cobro..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* List and Table Grid */}
            <div className="overflow-x-auto min-h-[240px]">
              {searchedFunds.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-12 text-slate-400">
                  <div className="p-3 bg-slate-50 rounded-full mb-3 text-slate-400">
                    <Layers className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-600">No se detectaron cobros en este mes</p>
                  <p className="text-[10px] mt-1 text-slate-400">
                    {searchQuery ? 'Modifique los términos de búsqueda' : 'Registre su primer cobro manual con el menú de la izquierda'}
                  </p>
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] text-slate-400 uppercase font-bold text-slate-500">
                      <th className="py-2 font-black">ID</th>
                      <th className="py-2 font-black">FECHA / HORA</th>
                      <th className="py-2 font-black">MÉTODO</th>
                      <th className="py-2 font-black">REF. BANCO</th>
                      <th className="py-2 font-black">CONCEPTO</th>
                      <th className="py-2 text-right font-black">MONTO</th>
                      <th className="py-2 text-center font-black w-10">ACCION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {searchedFunds.map(f => (
                      <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 font-mono font-bold text-indigo-600">{f.id}</td>
                        <td className="py-2.5 text-slate-500 font-mono text-[11px] leading-tight">
                          {f.fecha.split('-').reverse().join('/')}
                          {f.hora_transferencia && (
                            <span className="block text-[9px] text-slate-400 font-semibold" title="Hora de recepción">🕒 {f.hora_transferencia}</span>
                          )}
                        </td>
                        <td className="py-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold tracking-wide uppercase ${
                            f.metodo_pago === 'TPV' 
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                              : f.metodo_pago === 'Efectivo'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : f.metodo_pago === 'Transferencia'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                  : f.metodo_pago === 'Online'
                                    ? 'bg-purple-50 text-purple-700 border border-purple-100'
                                    : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {f.metodo_pago === 'Online' ? 'ONLINE (Agencia)' : f.metodo_pago}
                          </span>
                        </td>
                        <td className="py-2.5 font-mono text-[9px] text-slate-600 max-w-[110px] truncate" title={f.referencia_banco || '-'}>
                          {f.referencia_banco ? (
                            <span className="font-semibold text-blue-700 select-all">{f.referencia_banco}</span>
                          ) : (
                            <span className="text-slate-300 font-normal">-</span>
                          )}
                        </td>
                        <td className="py-2.5 text-slate-700 text-xs max-w-[130px] truncate" title={f.concepto}>
                          {f.concepto}
                        </td>
                        <td className="py-2.5 font-mono font-extrabold text-slate-800 text-right text-xs">
                          {f.monto.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                        </td>
                        <td className="py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setConsultingFund(f)}
                              className="p-1 px-2 border border-slate-200 hover:border-indigo-300 text-indigo-600 hover:bg-indigo-50/50 rounded bg-white cursor-pointer transition-all flex items-center gap-1 font-bold text-[10px]"
                              title="Consultar detalles completos"
                            >
                              <Eye className="w-3 h-3 text-indigo-500" />
                              {lang === 'es' ? 'Consultar' : lang === 'fr' ? 'Consulter' : 'Consult'}
                            </button>

                            <button
                              onClick={() => {
                                const confirmMsg = lang === 'es' ? `¿Seguro que desea eliminar el cobro manual "${f.id}"? This cannot be undone.` : lang === 'fr' ? `Voulez-vous supprimer la transaction "${f.id}" ?` : `Are you sure you want to delete manual fund transaction "${f.id}"?`;
                                if (confirm(confirmMsg)) {
                                  onDeleteFund(f.id);
                                }
                              }}
                              className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                              title="Eliminar Transacción"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Quick summary notice */}
          <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 text-[11px] text-indigo-900 leading-normal font-semibold flex items-center gap-2">
            <span>ℹ️</span>
            <span>
              Todos los cobros agregados se calculan al instante en la auditoría cruzada mensual que se muestra debajo.
            </span>
          </div>

        </div>

      </div>

      {/* CROSS AUDIT SECTION (DUAL BOOKKEEPING COMPILER) */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
          <div>
            <span className="px-2 py-0.5 bg-indigo-100 border border-indigo-200 text-indigo-700 rounded text-[9px] tracking-wider font-extrabold uppercase">
              Auditoría y Cuenta de Pérdidas y Ganancias
            </span>
            <h3 className="font-extrabold text-lg text-slate-800 mt-1">Convergencia Contable Mensual • Beneficio Exacto</h3>
            <p className="text-xs text-slate-500">
              Conciliación integral de ingresos de facturación y fondos manuales frente a costes de entradas y gastos de trabajadores.
            </p>
          </div>

          {currentUser.role === 'ADMIN' ? (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handlePrintReport}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                title="Imprimir Informe de Auditoría y Conciliación"
              >
                <Printer className="w-4 h-4 text-slate-300" />
                Imprimir Informe
              </button>

              <button
                onClick={handleExportMonthlyRecapCSV}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                title="Exportar Reporte Mensual Consolidado a Excel/CSV"
              >
                <Download className="w-4 h-4 text-emerald-105" />
                Descargar CSV
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                disabled
                className="px-4 py-2 bg-slate-200 text-slate-400 rounded-xl text-xs font-bold opacity-60 cursor-not-allowed flex items-center gap-2"
                title="Solo el ADMIN del hotel puede generar imprimir informes"
              >
                🔒 Imprimir Informe
              </button>

              <button
                disabled
                className="px-4 py-2 bg-slate-200 text-slate-400 rounded-xl text-xs font-bold opacity-60 cursor-not-allowed flex items-center gap-2"
                title="Solo el ADMIN del hotel puede exportar reportes de conciliación"
              >
                🔒 Descargar CSV
              </button>
            </div>
          )}
        </div>

        {/* Balanced Grid matching layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Column 1: Detailed Incomes (Standard & Manual) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
            <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>1. Ingresos Totales (Inbound)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </h4>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs text-slate-600 font-semibold">
                <span>Facturas Ordinarias (Salidas):</span>
                <span className="font-mono text-slate-800 font-bold">{traditionalStats.salidas.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-600 font-semibold">
                <span>1. Offline Cash (Efectivo):</span>
                <span className="font-mono text-emerald-700 font-bold">+{fundMetrics.cash.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-600 font-semibold">
                <span>2. Offline TPV (Tarjeta):</span>
                <span className="font-mono text-indigo-700 font-bold">+{fundMetrics.tpv.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-600 font-semibold">
                <span>3. Offline Bank Transfer (Transferencia):</span>
                <span className="font-mono text-blue-700 font-bold">+{fundMetrics.transfer.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-600 font-semibold">
                <span>4. Online Bookings (Booking.com/Web):</span>
                <span className="font-mono text-purple-700 font-bold">+{fundMetrics.online.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-600">
                <span>Otros / Bizum:</span>
                <span className="font-mono font-medium text-slate-700">+{fundMetrics.other.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
              </div>

              <div className="border-t border-dashed border-slate-200 my-2 pt-2 flex justify-between items-center text-xs font-black text-slate-900 bg-slate-50/50 p-2 rounded">
                <span>Total Ingresos Consolidados:</span>
                <span className="font-mono text-sm text-slate-900 font-black">
                  {consolidatedAudit.ingresosTotales.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                </span>
              </div>
            </div>
          </div>

          {/* Column 2: Configuration & Detailed Costs (Explotación & Trabajadores) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
            <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider pb-1.5 border-b border-slate-100 flex items-center justify-between">
              <span>{t.costDetailTitle}</span>
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            </h4>
            
            <p className="text-[10px] text-slate-400 font-medium leading-tight">
              {lang === 'es' 
                ? 'Resumen consolidation de costes fijos, nóminas de operarios y variables configurados en la pestaña de gestión.' 
                : lang === 'fr'
                ? 'Résumé consolidé des coûts fixes, des salaires des opérateurs et des variables configurés dans l\'onglet de gestion.'
                : 'Consolidated overview of fixed charges, operator wages, and active monthly variables.'}
            </p>

            {/* Premium quick-access redirection CTA to the new Company Costs tab */}
            {onRedirectToCosts && (
              <button 
                onClick={onRedirectToCosts}
                type="button"
                className="w-full p-3 bg-rose-50 hover:bg-rose-100/70 border border-rose-100 rounded-xl flex items-start gap-2.5 text-[10px] text-rose-800 transition-all font-semibold leading-normal text-left cursor-pointer group"
              >
                <span className="text-sm group-hover:scale-110 transition-transform">💡</span>
                <div className="flex-1">
                  <span className="font-extrabold block text-rose-900 leading-none mb-1">
                    {lang === 'es' ? '⚙️ Ir a Costes de Empresa' : lang === 'fr' ? '⚙️ Aller aux Coûts d\'Entreprise' : '⚙️ Go to Company Costs'}
                  </span>
                  <span className="text-rose-700/90">
                    {lang === 'es' 
                      ? 'Pulse aquí para ingresar salarios por empleado, autónomos, luz, agua, seguros e impuestos.' 
                      : lang === 'fr'
                      ? 'Cliquez ici pour saisir les salaires par employé, les indépendants, l\'électricité, l\'eau, les assurances et les taxes.'
                      : 'Click here to record wages per employee, freelancers, electricity, water, insurance, and taxes.'}
                  </span>
                </div>
              </button>
            )}
            
            <div className="space-y-3 pt-1">
              {/* Facturacion cost entradas */}
              <div className="flex justify-between items-center text-xs text-slate-600 font-bold bg-slate-50 p-2 rounded-lg border border-slate-100">
                <span className="flex items-center gap-1.5 text-slate-705">
                  <span className="text-slate-400">📦</span>
                  <span>Proveedores / Compras (Deducibles):</span>
                </span>
                <span className="font-mono text-rose-700">
                  -{consolidatedAudit.gastosFacturas.toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', { minimumFractionDigits: 2 })} €
                </span>
              </div>

              {/* Readonly Wage breakdown */}
              <div className="flex justify-between items-center text-xs text-slate-600 font-semibold px-1">
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-400">👤</span>
                  <span>{t.wageLabel}:</span>
                </span>
                <span className="font-mono font-bold text-slate-700">
                  -{(consolidatedAudit.gastosDetalle.empleadosSueldos || 0).toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', { minimumFractionDigits: 2 })} €
                </span>
              </div>

              {/* Readonly employerTax breakdown */}
              <div className="flex justify-between items-center text-xs text-slate-600 font-semibold px-1">
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-400">🛡️</span>
                  <span>{t.employerTaxLabel}:</span>
                </span>
                <span className="font-mono font-bold text-slate-700">
                  -{(consolidatedAudit.gastosDetalle.seguridadSocialEmpresa || 0).toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', { minimumFractionDigits: 2 })} €
                </span>
              </div>

              {/* Readonly Freelancer/autónomos */}
              <div className="flex justify-between items-center text-xs text-slate-600 font-semibold px-1">
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-400">💼</span>
                  <span>{t.freelanceLabel}:</span>
                </span>
                <span className="font-mono font-bold text-slate-700">
                  -{(consolidatedAudit.gastosDetalle.autonomosOtros || 0).toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', { minimumFractionDigits: 2 })} €
                </span>
              </div>

              {/* Readonly Utilities / Suministros */}
              <div className="flex justify-between items-center text-xs text-slate-600 font-semibold px-1">
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-400">💡</span>
                  <span>{lang === 'es' ? 'Suministros (Luz/Agua/Línea)' : lang === 'fr' ? 'Fournitures Directes' : 'Supplies & Power'}:</span>
                </span>
                <span className="font-mono font-bold text-slate-700">
                  -{(consolidatedAudit.gastosDetalle.suministrosDirectos || 0).toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', { minimumFractionDigits: 2 })} €
                </span>
              </div>

              {/* Readonly Insurances / Seguros */}
              <div className="flex justify-between items-center text-xs text-slate-600 font-semibold px-1">
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-400">🏢</span>
                  <span>{lang === 'es' ? 'Seguros del Hotel / Mutua' : lang === 'fr' ? 'Assurances du Hôtel' : 'Commercial Insurance'}:</span>
                </span>
                <span className="font-mono font-bold text-slate-700">
                  -{(consolidatedAudit.gastosDetalle.segurosHotel || 0).toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', { minimumFractionDigits: 2 })} €
                </span>
              </div>

              {/* Readonly municipal taxes */}
              <div className="flex justify-between items-center text-xs text-slate-600 font-semibold px-1">
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-400">🏛️</span>
                  <span>{lang === 'es' ? 'Tasas e Impuestos' : lang === 'fr' ? 'Taxes et Impôts' : 'Municipal Fees & Taxes'}:</span>
                </span>
                <span className="font-mono font-bold text-slate-700">
                  -{(consolidatedAudit.gastosDetalle.tasasImpuestos || 0).toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', { minimumFractionDigits: 2 })} €
                </span>
              </div>

              {/* Readonly extra Custom Costs items summary */}
              <div className="flex justify-between items-center text-xs text-slate-600 font-semibold px-1">
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-400">🛒</span>
                  <span>{lang === 'es' ? 'Conceptos Adicionales' : lang === 'fr' ? 'Concepts Supplémentaires' : 'Custom Added Costs'}:</span>
                </span>
                <span className="font-mono font-bold text-slate-700">
                  -{((consolidatedAudit.gastosDetalle.otrosCostes || 0) + 
                    (consolidatedAudit.gastosDetalle.customCosts || []).reduce((sum, item) => sum + item.amount, 0)
                  ).toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', { minimumFractionDigits: 2 })} €
                </span>
              </div>

              {/* Little interactive info of custom costs listed directly for reference */}
              {(consolidatedAudit.gastosDetalle.customCosts && consolidatedAudit.gastosDetalle.customCosts.length > 0) && (
                <div className="mt-1.5 p-2 bg-slate-50 border border-slate-100 rounded-lg max-h-24 overflow-y-auto space-y-1 text-[10px]">
                  <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">
                    {lang === 'es' ? 'Detalle Conceptos Extra:' : 'Extra Concept Details:'}
                  </span>
                  {consolidatedAudit.gastosDetalle.customCosts.map(item => (
                    <div key={item.id} className="flex justify-between text-slate-600">
                      <span className="truncate pr-2 font-medium">• {item.label}</span>
                      <span className="font-mono font-semibold">-{item.amount.toFixed(2)} €</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-dashed border-slate-200 my-2 pt-2 flex justify-between items-center text-xs font-black text-rose-800 bg-rose-50/50 p-2 rounded">
                <span>Costes Consolidados Totales:</span>
                <span className="font-mono text-sm">
                  -{consolidatedAudit.gastosTotales.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                </span>
              </div>
            </div>
          </div>

          {/* Column 3: Consolidated final balance */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-2xl border border-indigo-950 space-y-4 shadow-md">
            <h4 className="font-bold text-xs text-indigo-200 uppercase tracking-wider pb-2 border-b border-indigo-800 flex items-center justify-between">
              <span>3. Beneficio Neto Exacto</span>
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse"></span>
            </h4>
            
            <div className="space-y-3.5">
              <div className="flex justify-between items-center text-xs text-slate-300">
                <span className="font-semibold">Revenues (Ingresos):</span>
                <span className="font-mono font-bold text-emerald-400">+{consolidatedAudit.ingresosTotales.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-300">
                <span className="font-semibold">Expenses (Costes):</span>
                <span className="font-mono font-bold text-rose-400">-{consolidatedAudit.gastosTotales.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
              </div>

              <div className="border-t border-white/10 pt-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-black text-indigo-200">Beneficio Neto:</span>
                  <div className="text-right">
                    <span className={`font-mono text-xl font-black block leading-none ${consolidatedAudit.balanceNeto >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {consolidatedAudit.balanceNeto.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                    </span>
                    <span className={`text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded inline-block mt-2 ${
                      consolidatedAudit.balanceNeto >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {consolidatedAudit.balanceNeto >= 0 ? `SUPERÁVIT (${consolidatedAudit.rentabilidadPorcentaje}%)` : 'DÉFICIT'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* PRINT BANNER HIDDEN ON SCREEN - FORMAL REPORT LAYOUT (A4) */}
      <div className="hidden print:block bg-white p-12 text-slate-900 font-sans space-y-8" id="formal-rapport-output">
        
        {/* Print Brand header */}
        <div className="flex justify-between items-start pb-6 border-b border-slate-300">
          <div>
            <span className="text-xs font-black tracking-widest text-indigo-700 uppercase">{hostalInfo.name}</span>
            <h2 className="text-xl font-extrabold text-slate-800 mt-1">Informe Mensual de Caja e Ingresos de Fondos</h2>
            <p className="text-[10px] text-slate-500 leading-normal mt-1.5">
              Emisor: <span className="font-bold">{hostalInfo.company}</span> | CIF: {hostalInfo.cif}<br />
              Domicilio: {hostalInfo.address}<br />
              Contacto: {hostalInfo.email} • Tel: {hostalInfo.tel}
            </p>
          </div>

          <div className="text-right">
            <span className="p-1 px-3 border border-slate-300 text-[9px] uppercase font-bold tracking-wider rounded">
              RAPPORT DE AUDITORÍA
            </span>
            <p className="text-xs font-bold mt-2 text-slate-700">Periodo: {availableMonths.find(m => m.value === selectedMonth)?.label || selectedMonth}</p>
            <p className="text-[9px] text-slate-400 mt-1">Fecha de Generación: {new Date().toLocaleDateString('es-ES')}</p>
          </div>
        </div>

        {/* Financial KPIs table */}
        <div className="space-y-4">
          <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-800 pb-1 border-b border-slate-200">
            1. BALANCE MENSUAL DETALLADO DE PÉRDIDAS Y GANANCIAS (Euros)
          </h3>
          
          <table className="w-full text-[11px] text-left border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-100 font-bold uppercase text-[9px] text-slate-600">
                <th className="p-2 border border-slate-200">Concepto / Partida Contable</th>
                <th className="p-2 border border-slate-200 text-right">Ingresos (In)</th>
                <th className="p-2 border border-slate-200 text-right">Gastos / Costos (Out)</th>
                <th className="p-2 border border-slate-200 text-right bg-slate-100">Balance Parcial</th>
              </tr>
            </thead>
            <tbody>
              {/* Incomes */}
              <tr>
                <td className="p-2 border border-slate-200">Facturas Emitidas Ordinarias (Salidas)</td>
                <td className="p-2 border border-slate-200 text-right font-mono font-semibold text-emerald-800">+{traditionalStats.salidas.toFixed(2)} €</td>
                <td className="p-2 border border-slate-200 text-right font-mono text-slate-400">0.00 €</td>
                <td className="p-2 border border-slate-200 text-right font-mono text-slate-600">+{traditionalStats.salidas.toFixed(2)} €</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-200">Reservas Directas en Cash (Efectivo)</td>
                <td className="p-2 border border-slate-200 text-right font-mono font-semibold text-emerald-800">+{fundMetrics.cash.toFixed(2)} €</td>
                <td className="p-2 border border-slate-200 text-right font-mono text-slate-400">0.00 €</td>
                <td className="p-2 border border-slate-200 text-right font-mono text-slate-600">+{fundMetrics.cash.toFixed(2)} €</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-200">Reservas Directas por TPV (Tarjeta)</td>
                <td className="p-2 border border-slate-200 text-right font-mono font-semibold text-emerald-800">+{fundMetrics.tpv.toFixed(2)} €</td>
                <td className="p-2 border border-slate-200 text-right font-mono text-slate-400">0.00 €</td>
                <td className="p-2 border border-slate-200 text-right font-mono text-slate-600">+{fundMetrics.tpv.toFixed(2)} €</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-200">Transferencias Bancarias Recibidas</td>
                <td className="p-2 border border-slate-200 text-right font-mono font-semibold text-emerald-800">+{fundMetrics.transfer.toFixed(2)} €</td>
                <td className="p-2 border border-slate-200 text-right font-mono text-slate-400">0.00 €</td>
                <td className="p-2 border border-slate-200 text-right font-mono text-slate-600">+{fundMetrics.transfer.toFixed(2)} €</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-200">Otras Contribuciones directas (Bizums/Otros)</td>
                <td className="p-2 border border-slate-200 text-right font-mono font-semibold text-emerald-800">+{fundMetrics.other.toFixed(2)} €</td>
                <td className="p-2 border border-slate-200 text-right font-mono text-slate-400">0.00 €</td>
                <td className="p-2 border border-slate-200 text-right font-mono text-slate-600">+{fundMetrics.other.toFixed(2)} €</td>
              </tr>
              {/* Costs */}
              <tr className="bg-slate-50/50">
                <td className="p-2 border border-slate-200">Coste de Facturas Recibidas (Entradas / Cast)</td>
                <td className="p-2 border border-slate-200 text-right font-mono text-slate-400">0.00 €</td>
                <td className="p-2 border border-slate-200 text-right font-mono font-semibold text-rose-800">-{consolidatedAudit.gastosFacturas.toFixed(2)} €</td>
                <td className="p-2 border border-slate-200 text-right font-mono text-rose-850">-{consolidatedAudit.gastosFacturas.toFixed(2)} €</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="p-2 border border-slate-200 font-bold">Gastos Totales de Personal & Colaboradores</td>
                <td className="p-2 border border-slate-200 text-right font-mono text-slate-400">0.00 €</td>
                <td className="p-2 border border-slate-200 text-right font-mono font-semibold text-rose-800">-{consolidatedAudit.gastosTrabajadores.toFixed(2)} €</td>
                <td className="p-2 border border-slate-200 text-right font-mono font-bold text-rose-900">-{consolidatedAudit.gastosTrabajadores.toFixed(2)} €</td>
              </tr>
              <tr className="bg-slate-50/10 text-[10px]">
                <td className="p-1 px-4 border border-slate-200 italic text-slate-500">↳ {t.wageLabel}</td>
                <td className="p-1 border border-slate-200 text-right text-slate-400 font-mono">0.00 €</td>
                <td className="p-1 border border-slate-200 text-right font-mono text-rose-700">-{ (consolidatedAudit.gastosDetalle.empleadosSueldos || 0).toFixed(2) } €</td>
                <td className="p-1 border border-slate-200 text-right text-slate-400 font-mono">-</td>
              </tr>
              <tr className="bg-slate-50/10 text-[10px]">
                <td className="p-1 px-4 border border-slate-200 italic text-slate-500">↳ {t.employerTaxLabel}</td>
                <td className="p-1 border border-slate-200 text-right text-slate-400 font-mono">0.00 €</td>
                <td className="p-1 border border-slate-200 text-right font-mono text-rose-700">-{ (consolidatedAudit.gastosDetalle.seguridadSocialEmpresa || 0).toFixed(2) } €</td>
                <td className="p-1 border border-slate-200 text-right text-slate-400 font-mono">-</td>
              </tr>
              <tr className="bg-slate-50/10 text-[10px]">
                <td className="p-1 px-4 border border-slate-200 italic text-slate-500">↳ {t.freelanceLabel}</td>
                <td className="p-1 border border-slate-200 text-right text-slate-400 font-mono">0.00 €</td>
                <td className="p-1 border border-slate-200 text-right font-mono text-rose-700">-{ (consolidatedAudit.gastosDetalle.autonomosOtros || 0).toFixed(2) } €</td>
                <td className="p-1 border border-slate-200 text-right text-slate-400 font-mono">-</td>
              </tr>
              <tr className="bg-slate-50/10 text-[10px]">
                <td className="p-1 px-4 border border-slate-200 italic text-slate-500">↳ {t.otherCostLabel}</td>
                <td className="p-1 border border-slate-200 text-right text-slate-400 font-mono">0.00 €</td>
                <td className="p-1 border border-slate-200 text-right font-mono text-rose-700">-{ (consolidatedAudit.gastosDetalle.otrosCostes || 0).toFixed(2) } €</td>
                <td className="p-1 border border-slate-200 text-right text-slate-400 font-mono">-</td>
              </tr>
              {/* Sub Totals */}
              <tr className="bg-slate-100 font-extrabold text-[12px] text-slate-900">
                <td className="p-2.5 border border-slate-300">TOTAL CONSOLIDADO MENSUAL</td>
                <td className="p-2.5 border border-slate-300 text-right font-mono text-emerald-900">+{consolidatedAudit.ingresosTotales.toFixed(2)} €</td>
                <td className="p-2.5 border border-slate-300 text-right font-mono text-rose-900">-{consolidatedAudit.gastosTotales.toFixed(2)} €</td>
                <td className="p-2.5 border border-slate-300 text-right font-mono text-slate-950 bg-slate-200/60 {consolidatedAudit.balanceNeto >= 0 ? 'text-emerald-900' : 'text-rose-900'}">
                  {consolidatedAudit.balanceNeto.toFixed(2)} €
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-[9px] text-slate-400 text-right italic font-medium">
            *Resultado Neto con un margen de rentabilidad económica del {consolidatedAudit.rentabilidadPorcentaje}% para este ejercicio.
          </p>
        </div>

        {/* Detailed manual entries table */}
        <div className="space-y-3 pt-4">
          <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-800 pb-1 border-b border-slate-200">
            2. HISTORIAL DIARIO DE FONDOS DIRECTOS CONTABILIZADOS ({availableMonths.find(m => m.value === selectedMonth)?.label})
          </h3>

          <table className="w-full text-[10px] text-left border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-100 font-bold uppercase text-[8px] text-slate-500">
                <th className="p-2 border border-slate-200">ID Ref</th>
                <th className="p-2 border border-slate-200">Fecha / Hora</th>
                <th className="p-2 border border-slate-200">Método de Pago</th>
                <th className="p-2 border border-slate-200">Ref. Operación Banco</th>
                <th className="p-2 border border-slate-200">Descripción / Concepto</th>
                <th className="p-2 border border-slate-200 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {currentMonthFunds.map(f => (
                <tr key={f.id} className="font-medium hover:bg-slate-50">
                  <td className="p-2 border border-slate-200 font-mono text-indigo-700 font-bold">{f.id}</td>
                  <td className="p-2 border border-slate-200 font-mono text-slate-500">
                    {f.fecha.split('-').reverse().join('/')}
                    {f.hora_transferencia && ` @ ${f.hora_transferencia}`}
                  </td>
                  <td className="p-2 border border-slate-200 font-bold text-slate-700">{f.metodo_pago}</td>
                  <td className="p-2 border border-slate-200 font-mono font-bold text-blue-800">{f.referencia_banco || '-'}</td>
                  <td className="p-2 border border-slate-200 max-w-xs">{f.concepto}</td>
                  <td className="p-2 border border-slate-200 text-right font-mono font-bold">{f.monto.toFixed(2)} €</td>
                </tr>
              ))}
              {currentMonthFunds.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 border border-slate-200 text-center text-slate-400">
                    No hay transacciones registradas para este periodo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Formal signature sections */}
        <div className="grid grid-cols-2 gap-12 pt-16 text-center text-xs">
          <div>
            <div className="mx-auto w-44 h-0.5 bg-slate-300 mb-2" />
            <p className="font-extrabold text-slate-700">Firma del Director de Operaciones</p>
            <p className="text-[10px] text-slate-400">Hostal Serramar Sello Oficial</p>
          </div>
          <div>
            <div className="mx-auto w-44 h-0.5 bg-slate-300 mb-2" />
            <p className="font-extrabold text-slate-700">Firma del Administrador / Auditor</p>
            <p className="text-[10px] text-slate-400">SUN SERRAMAR SL</p>
          </div>
        </div>

      </div>

      {/* Consulting Manual Fund Modal */}
      {consultingFund && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-fade-in font-sans">
            {/* Modal Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center text-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Eye className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                    {lang === 'es' ? 'Ficha de Cobro / Transacción' : lang === 'fr' ? 'Fiche de Transaction' : 'Strategic Booking Transaction Details'}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">REF: {consultingFund.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setConsultingFund(null)}
                className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 font-bold border border-slate-200 rounded-lg text-xs cursor-pointer"
              >
                {lang === 'es' ? 'Cerrar' : lang === 'fr' ? 'Fermer' : 'Close'}
              </button>
            </div>

            {/* Information Grid */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 select-text">
              {/* Type and Date Row */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">{lang === 'es' ? 'Fecha de Registro' : lang === 'fr' ? 'Date d\'Enregistrement' : 'Record Date'}</span>
                  <span className="text-xs font-mono font-bold text-slate-800">
                    {consultingFund.fecha.split('-').reverse().join('/')}
                    {consultingFund.hora_transferencia && ` @ ${consultingFund.hora_transferencia}`}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider text-right">{lang === 'es' ? 'Área Contable' : lang === 'fr' ? 'Secteur' : 'Sect'}</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                    💰 {lang === 'es' ? 'Auditoría de Caja' : lang === 'fr' ? 'Dépôts de Caisse' : 'Cash box / TPV fund'}
                  </span>
                </div>
              </div>

              {/* Amount Box */}
              <div className="bg-emerald-50/45 p-5 border border-emerald-100 rounded-2xl text-center space-y-1">
                <span className="block text-[10px] uppercase font-bold text-emerald-800 tracking-widest">{lang === 'es' ? 'MONTO TOTAL' : lang === 'fr' ? 'MONTANT TOTAL' : 'TOTAL LIQUIDATED AMOUNT'}</span>
                <span className="text-2xl font-black font-mono text-emerald-700 block">
                  {consultingFund.monto.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                </span>
                <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                  {lang === 'es' ? 'Calculado al instante en la auditoría mensual' : 'Factored live in audited recap sheets'}
                </p>
              </div>

              {/* Payment details */}
              <div className="space-y-3.5 pt-1.5">
                <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">{lang === 'es' ? 'Atributos del Pago Manual' : 'Transaction Attributes'}</span>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-[10px] text-slate-400 font-semibold">{lang === 'es' ? 'Método Contable' : 'Payment Type'}:</p>
                    <p className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5 mt-1">
                      💳 {consultingFund.metodo_pago}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-[10px] text-slate-400 font-semibold">{lang === 'es' ? 'Período Fiscal' : 'Referral Period'}:</p>
                    <p className="text-xs font-mono font-bold text-indigo-700 mt-1">
                      📅 {consultingFund.mes_referencia}
                    </p>
                  </div>
                </div>

                {consultingFund.referencia_banco && (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                    <p className="text-[10px] text-slate-400 font-semibold">{lang === 'es' ? 'Referencia Banco / Código Transacción' : 'Bank Reference / TXN Code'}:</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-blue-800 uppercase select-all">{consultingFund.referencia_banco}</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(consultingFund.referencia_banco || '');
                          alert(lang === 'es' ? '¡Referencia bancaria copiada!' : 'Bank reference copied!');
                        }}
                        className="text-[9px] bg-white hover:bg-slate-200 border border-slate-300 p-0.5 px-2 rounded-md font-black text-slate-600 transition-colors cursor-pointer"
                        title="Copy Bank Code"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Concept / Detail Memo */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <p className="text-[10px] text-slate-400 font-semibold">{lang === 'es' ? 'Concepto de Depósito / Observación' : 'Transaction Descriptional Concept'}:</p>
                <div className="text-xs text-slate-800 font-bold bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed italic">
                  {consultingFund.concepto}
                </div>
              </div>

              {/* Audit logs & creators */}
              <div className="border-t border-slate-200 pt-4 flex justify-between items-center text-[10px] text-slate-400 bg-slate-50/70 -mx-6 -mb-6 p-4 px-6 border-b rounded-b-2xl">
                <div>
                  <span>{lang === 'es' ? 'Registrado por:' : lang === 'fr' ? 'Créé par :' : 'Admin Keyed-by:'} </span>
                  <span className="font-mono bg-indigo-50 px-1 py-0.2 rounded border border-indigo-200">
                    {consultingFund.usuario}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 uppercase tracking-widest text-[9px]">{lang === 'es' ? 'CONCILIADO' : 'CONCILIATED'}</span>
                </div>
              </div>

            </div>

            {/* Print/Close actions */}
            <div className="p-4 px-6 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  const f = consultingFund;
                  if (!f) return;
                  const w3 = window.open('', '_blank', 'width=800,height=600');
                  if (!w3) return;
                  const hi = { company: 'SUN SERRAMAR SL', cif: 'B21902432', address: 'CALLE LAS FLORES, 5, 29631 BENALMADINA, MALAGA', email: 'SERRAMAR2906@GMAIL.COM', tel: '+34 652442604' };
                  w3.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Recibo '+f.id+'</title><style>body{font-family:Segoe UI,Arial,sans-serif;font-size:10pt;color:#1e293b;padding:30px 40px;max-width:210mm;margin:0 auto}h1{font-size:16pt;border-bottom:2px solid #1e293b;padding-bottom:6px;margin-bottom:4px}.meta{font-size:7pt;color:#64748b;margin-bottom:16px}table{width:100%;border-collapse:collapse;margin:12px 0;font-size:9pt}td{padding:5px 10px;border:1px solid #e2e8f0}.label{background:#f8fafc;font-weight:600;width:40%}.amount{font-size:14pt;font-weight:800;text-align:center;padding:15px;background:#f8fafc;margin:12px 0}.footer{margin-top:25px;font-size:7pt;color:#94a3b8;text-align:center;border-top:1px solid #e2e8f0;padding-top:8px}@media print{body{padding:0}}</style></head><body><h1>COMPROBANTE DE COBRO</h1><div class="meta"><strong>'+hi.company+'</strong> | CIF: '+hi.cif+' | '+hi.address+'</div><table><tr><td class="label">Referencia</td><td><strong>'+f.id+'</strong></td></tr><tr><td class="label">Fecha</td><td>'+f.fecha+'</td></tr><tr><td class="label">Hora</td><td>'+(f.hora_transferencia||'-')+'</td></tr><tr><td class="label">Metodo de Pago</td><td>'+f.metodo_pago+'</td></tr>'+(f.referencia_banco?('<tr><td class="label">Ref. Banco</td><td>'+f.referencia_banco+'</td></tr>'):'')+'<tr><td class="label">Concepto</td><td>'+f.concepto+'</td></tr></table><div class="amount">'+f.monto.toLocaleString("es-ES",{minimumFractionDigits:2})+' EUR</div><div class="footer">'+hi.company+' | '+hi.cif+' | '+hi.address+' | Registrado por: '+f.usuario+' | Periodo: '+f.mes_referencia+'</div></body></html>');
                  w3.document.close();
                  setTimeout(() => w3.print(), 400);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1 cursor-pointer font-semibold border border-slate-200"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                {lang === 'es' ? 'Imprimir Ficha' : lang === 'fr' ? "Imprimer" : 'Print Voucher'}
              </button>

              <button
                type="button"
                onClick={() => setConsultingFund(null)}
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
