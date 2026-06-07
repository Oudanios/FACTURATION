/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, ArrowDownRight, ArrowUpRight, Wallet, Calendar, 
  HelpCircle, Receipt, Building, Users, Landmark, Coins, 
  ShieldAlert, Sparkles, AlertTriangle, ArrowRight, Info, Percent
} from 'lucide-react';

import { Invoice, ManualBookingFund, DetailedCosts } from '../types';
import { Lang, TRANSLATIONS } from '../translations';

interface DashboardProps {
  invoices: Invoice[];
  funds?: ManualBookingFund[]; // Passed from main state
  lang: Lang;
  detailedCosts: { [month: string]: DetailedCosts };
}

export default function Dashboard({ invoices, funds = [], lang, detailedCosts }: DashboardProps) {
  const t = TRANSLATIONS[lang];
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [showTaxGuide, setShowTaxGuide] = useState(true);

  // Available Years
  const years = useMemo(() => {
    const list = new Set<string>();
    invoices.forEach(inv => {
      const parts = inv.fecha.split('/');
      if (parts.length === 3) {
        list.add(parts[2]);
      }
    });
    // Add years from funds too
    funds.forEach(f => {
      if (f.fecha && f.fecha.includes('-')) {
        list.add(f.fecha.substring(0, 4));
      }
    });
    const arr = Array.from(list);
    return arr.length > 0 ? arr.sort() : ['2026'];
  }, [invoices, funds]);

  // Months available
  const months = [
    { value: 'All', label: 'Todos los Meses' },
    { value: '01', label: 'Enero' },
    { value: '02', label: 'Febrero' },
    { value: '03', label: 'Marzo' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Mayo' },
    { value: '06', label: 'Junio' },
    { value: '07', label: 'Julio' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' }
  ];

  // Helper to parse DD/MM/YYYY dates
  const parseInvoiceDate = (dateStr: string) => {
    const p = dateStr.split('/');
    if (p.length === 3) {
      return {
        day: p[0],
        month: p[1],
        year: p[2]
      };
    }
    return { day: '01', month: '01', year: '2026' };
  };

  // Filtered invoices for statistics
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const { month, year } = parseInvoiceDate(inv.fecha);
      const matchYear = year === selectedYear;
      const matchMonth = selectedMonth === 'All' || month === selectedMonth;
      return matchYear && matchMonth && inv.estado !== 'Anulada';
    });
  }, [invoices, selectedYear, selectedMonth]);

  // Filtered funds (manual bookings) for statistics
  const filteredFunds = useMemo(() => {
    return funds.filter(f => {
      if (f.fecha && f.fecha.includes('-')) {
        const parts = f.fecha.split('-');
        const fYear = parts[0];
        const fMonth = parts[1];
        const matchYear = fYear === selectedYear;
        const matchMonth = selectedMonth === 'All' || fMonth === selectedMonth;
        return matchYear && matchMonth;
      }
      return false;
    });
  }, [funds, selectedYear, selectedMonth]);

  // Real-time operations calculations
  const stats = useMemo(() => {
    // 1) REAL REVENUE FROM RESERVATIONS (FUNDS)
    let offlineBookings = 0; // Cash + TPV
    let onlineBookings = 0;  // Transfer, Bizum, Others (Booking.com online)
    let numOffline = 0;
    let numOnline = 0;

    filteredFunds.forEach(f => {
      if (f.metodo_pago === 'Efectivo' || f.metodo_pago === 'TPV') {
        offlineBookings += f.monto;
        numOffline++;
      } else {
        onlineBookings += f.monto;
        numOnline++;
      }
    });

    const realIncomingRevenue = offlineBookings + onlineBookings;

    // 2) REAL COSTS (ENTRADAS)
    let officialProviderCosts = 0; // Invoices of type ENTRADA with document tipo === 'Factura'
    let receiptAndTaxesCosts = 0;   // Receipts of type ENTRADA (like Ayuntamiento, bank taxas, insurance, where we only get bank receipt)
    let pendingCost = 0;

    filteredInvoices.forEach(inv => {
      if (inv.tipo === 'ENTRADA') {
        if (inv.documento_tipo === 'Recibo') {
          receiptAndTaxesCosts += inv.total_factura;
        } else {
          officialProviderCosts += inv.total_factura;
        }

        if (inv.estado === 'Pendiente') {
          pendingCost += inv.total_factura;
        }
      }
    });

    // 3) STAFF PAYROLL COSTS
    let totalWorkersCost = 0;
    if (selectedMonth === 'All') {
      // Sum for all available months in select year
      Object.entries(detailedCosts).forEach(([mKey, value]) => {
        if (mKey.startsWith(selectedYear)) {
          const sumMonth = (value.empleadosSueldos || 0) + 
                           (value.seguridadSocialEmpresa || 0) + 
                           (value.autonomosOtros || 0) + 
                           (value.otrosCostes || 0);
          totalWorkersCost += sumMonth;
        }
      });
    } else {
      const specKey = `${selectedYear}-${selectedMonth}`;
      const value = detailedCosts[specKey] || { empleadosSueldos: 0, seguridadSocialEmpresa: 0, autonomosOtros: 0, otrosCostes: 0 };
      totalWorkersCost = (value.empleadosSueldos || 0) + 
                         (value.seguridadSocialEmpresa || 0) + 
                         (value.autonomosOtros || 0) + 
                         (value.otrosCostes || 0);
    }

    const totalRealCosts = officialProviderCosts + receiptAndTaxesCosts + totalWorkersCost;

    // 4) DECLARED SALES INVOICES (SALIDAS)
    // Issued *only* when the customer requested one!
    let declaredSalesInvoices = 0;
    let numDeclaredInvoices = 0;
    let pendingDeclaredInvoices = 0;

    filteredInvoices.forEach(inv => {
      if (inv.tipo === 'SALIDA') {
        declaredSalesInvoices += inv.total_factura;
        numDeclaredInvoices++;
        if (inv.estado === 'Pendiente') {
          pendingDeclaredInvoices += inv.total_factura;
        }
      }
    });

    // 5) REAL OPERATING NET BALANCE
    const netOperationBalance = realIncomingRevenue - totalRealCosts;
    const profitMargin = realIncomingRevenue > 0 ? (netOperationBalance / realIncomingRevenue) * 100 : 0;

    // 6) DECLARATION CONTROL
    // Compare official Sales invoices against real book cashflow to compute correct tax ratio.
    const declaredPercentage = realIncomingRevenue > 0 ? (declaredSalesInvoices / realIncomingRevenue) * 100 : 0;

    return {
      offlineBookings,
      onlineBookings,
      numOffline,
      numOnline,
      realIncomingRevenue,
      officialProviderCosts,
      receiptAndTaxesCosts,
      totalWorkersCost,
      totalRealCosts,
      declaredSalesInvoices,
      numDeclaredInvoices,
      pendingDeclaredInvoices,
      netOperationBalance,
      profitMargin,
      declaredPercentage,
      pendingCost
    };
  }, [filteredFunds, filteredInvoices, selectedYear, selectedMonth]);

  // SVG Visual trends per month
  const trendsData = useMemo(() => {
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return monthNames.map((name, idx) => {
      const monthStr = String(idx + 1).padStart(2, '0');

      // 1) Real Reservation Incoming (Online + Offline) Sum
      let incRealVal = 0;
      funds.forEach(f => {
        if (f.fecha && f.fecha.includes('-')) {
          const parts = f.fecha.split('-');
          if (parts[0] === selectedYear && parts[1] === monthStr) {
            incRealVal += f.monto;
          }
        }
      });

      // 2) Real Costs (Entradas + worker payroll) Sum
      let expRealVal = 0;
      invoices.forEach(inv => {
        const { month, year } = parseInvoiceDate(inv.fecha);
        if (year === selectedYear && month === monthStr && inv.tipo === 'ENTRADA' && inv.estado !== 'Anulada') {
          expRealVal += inv.total_factura;
        }
      });
      const specKey = `${selectedYear}-${monthStr}`;
      const payrollVal = detailedCosts[specKey] || { empleadosSueldos: 0, seguridadSocialEmpresa: 0, autonomosOtros: 0, otrosCostes: 0 };
      const totalPayroll = (payrollVal.empleadosSueldos || 0) + 
                           (payrollVal.seguridadSocialEmpresa || 0) + 
                           (payrollVal.autonomosOtros || 0) + 
                           (payrollVal.otrosCostes || 0);
      expRealVal += totalPayroll;

      // 3) Declared Sales Invoices (Salidas - Customer asked) Sum
      let declaredVal = 0;
      invoices.forEach(inv => {
        const { month, year } = parseInvoiceDate(inv.fecha);
        if (year === selectedYear && month === monthStr && inv.tipo === 'SALIDA' && inv.estado !== 'Anulada') {
          declaredVal += inv.total_factura;
        }
      });

      return {
        label: name,
        realIncoming: Number(incRealVal.toFixed(2)),
        realCosts: Number(expRealVal.toFixed(2)),
        declaredSales: Number(declaredVal.toFixed(2))
      };
    });
  }, [invoices, funds, selectedYear]);

  // Max scale calculation for chart
  const maxChartVal = useMemo(() => {
    let max = 200;
    trendsData.forEach(t => {
      if (t.realIncoming > max) max = t.realIncoming;
      if (t.realCosts > max) max = t.realCosts;
      if (t.declaredSales > max) max = t.declaredSales;
    });
    return max > 200 ? max * 1.15 : 2000; // 15% top padding with dynamic fallback
  }, [trendsData]);

  // Dynamic visual feedback based on declared ratio
  const getTaxSafetyStatus = (percentage: number) => {
    if (percentage === 0) return {
      label: 'SÓLO CAJA REGISTRADA',
      color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
      description: 'Huéspedes particulares. Declaración directa por libro-diario global del hotel.',
      bulletColor: 'bg-indigo-500',
    };
    if (percentage > 0 && percentage < 25) return {
      label: 'DECLARACIÓN CONTROLADA',
      color: 'bg-teal-50 border-teal-200 text-teal-800',
      description: 'Facturas solicitadas por clientes de negocios. Ratio de facturación normal de hostal.',
      bulletColor: 'bg-teal-500',
    };
    if (percentage >= 25 && percentage <= 70) return {
      label: 'RATIO DE DECLARACIÓN ELEVADO',
      color: 'bg-amber-50 border-amber-200 text-amber-800',
      description: 'Muchos clientes han solicitado factura y se han emitido para compensar costes deducibles.',
      bulletColor: 'bg-amber-500',
    };
    return {
      label: 'DECLARACIÓN VOLUMÉTRICA CRÍTICA',
      color: 'bg-rose-50 border-rose-200 text-rose-800',
      description: 'Se están emitiendo facturas para casi el 100% de los ingresos. Verifique cuentas.',
      bulletColor: 'bg-rose-500',
    };
  };

  const taxSafety = getTaxSafetyStatus(stats.declaredPercentage);

  return (
    <div className="space-y-6 font-sans">
      
      {/* 1. TOP ELEGANT HERO PANEL */}
      <div className="relative overflow-hidden bg-slate-900 rounded-3xl border border-slate-950 shadow-xl p-6 sm:p-8">
        
        {/* Glow decorative graphics */}
        <div className="absolute top-0 right-0 -transtile translate-x-1/4 -translate-y-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -transtile -translate-x-1/4 translate-y-1/4 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-400/20 px-3 py-1 rounded-full text-[10px] text-indigo-300 font-extrabold tracking-widest uppercase">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Control de Ingresos Reales vs Documentos Deducibles
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight uppercase">
              Consola Financiera Profesional
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed font-light">
              Métricas consolidadas de cobro en efectivo, cobro con tarjeta en recepción y transferencias online de agencias, cruzados con la facturación que piden los clientes y gastos con o sin factura.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0 self-start lg:self-auto bg-slate-800/80 backdrop-blur-md p-3 rounded-2xl border border-slate-700/50 shadow-lg">
            {/* Year selector */}
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Período Fiscal</span>
              <div className="flex items-center bg-slate-700/60 hover:bg-slate-700 rounded-xl px-3 py-1.5 transition-all text-xs font-black text-white cursor-pointer select-none">
                <Calendar className="w-3.5 h-3.5 text-indigo-400 mr-2" />
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-transparent focus:outline-none cursor-pointer text-white font-mono"
                >
                  {years.map(y => (
                    <option key={y} value={y} className="bg-slate-800 text-white">{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Month Selector */}
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Filtrar por Mes</span>
              <div className="flex items-center bg-slate-700/60 hover:bg-slate-700 rounded-xl px-0 py-1.5 transition-all text-xs font-black text-white cursor-pointer select-none">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent px-3 focus:outline-none cursor-pointer text-white"
                >
                  {months.map(m => (
                    <option key={m.value} value={m.value} className="bg-slate-800 text-white">{m.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CLARIFYING OPERATIONAL NOTE & ACCORDION TUTORIAL */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
        <div 
          onClick={() => setShowTaxGuide(!showTaxGuide)}
          className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100 hover:bg-slate-100/50 cursor-pointer select-none transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black text-slate-800 uppercase tracking-wide block">Guía Práctica: ¿Cómo calcular y declarar ingresos y gastos del Hostal?</span>
              <p className="text-[10px] text-slate-500 font-medium">Haz clic aquí para {showTaxGuide ? 'contraer' : 'expandir'} las fórmulas de cálculo explicadas</p>
            </div>
          </div>
          <button className="text-slate-400 hover:text-slate-600 font-bold text-xs px-2.5 py-1 rounded-lg border border-slate-200 bg-white">
            {showTaxGuide ? 'Ocultar' : 'Entender'}
          </button>
        </div>

        {showTaxGuide && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-4 gap-5 bg-white text-xs leading-relaxed text-slate-600 divide-y md:divide-y-0 md:divide-x divide-slate-100 animate-fade-in">
            
            {/* Concepto 1 */}
            <div className="space-y-2 pt-4 md:pt-0">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-5 bg-emerald-500 rounded-full" />
                <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">1. Ingreso Real Completo</span>
              </div>
              <p className="font-light text-slate-600">
                Es la facturación real total del hostal. Se calcula de forma exacta sumando el <span className="font-semibold text-slate-800">Libro de Caja Registrado</span>:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-500 font-mono text-[10px]">
                <li><span className="font-semibold">Caja Física & TPV</span>: Cobros directos en el mostrador de recepción.</li>
                <li><span className="font-semibold">Banco/Online</span>: Transferencias bancarias de Booking.com o pagos con Bizum de clientes directos.</li>
              </ul>
              <div className="p-1.5 bg-slate-50 rounded-lg text-[10px] font-mono border border-slate-200">
                <span className="text-slate-800 font-semibold">Total Ingreso</span> = Efectivo + TPV + Bizum + Transferencias Bancarias de Reservas
              </div>
            </div>

            {/* Concepto 2 */}
            <div className="space-y-2 md:pl-5 pt-4 md:pt-0">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-5 bg-indigo-600 rounded-full" />
                <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">2. Facturas de Salidas</span>
              </div>
              <p className="font-light text-slate-600">
                Corresponde a las <span className="font-bold text-slate-800">Facturas Nominativas Oficiales</span> enviadas a clientes únicamente <span className="font-semibold text-indigo-700">cuando las piden para sus negocios o empresas</span>. No representan el total ganado por el hostal, sino solo la porción de ventas que requiere justificante oficial de la AEAT. 
              </p>
              <div className="p-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-bold">
                ⚠️ Un cliente que no es de negocios suele pagar sin pedir Factura Oficial. Se registra directo en el balance global.
              </div>
            </div>

            {/* Concepto 3 */}
            <div className="space-y-2 md:pl-5 pt-4 md:pt-0">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-5 bg-rose-500 rounded-full" />
                <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">3. Facturas de Entradas</span>
              </div>
              <p className="font-light text-slate-600">
                Gastos generados al pagar a proveedores de consumibles, lencería, reparaciones o servicios del hostal. Al contar con un emisor oficial, <span className="font-semibold text-slate-800">emiten una factura oficial con IVA desglosado</span>, lo que la hace perfectamente <span className="text-emerald-700 font-bold">deducible de IVA y de IRPF</span>.
              </p>
            </div>

            {/* Concepto 4 */}
            <div className="space-y-2 md:pl-5 pt-4 md:pt-0">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-5 bg-amber-500 rounded-full" />
                <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">4. Justificantes y Recibos</span>
              </div>
              <p className="font-light text-slate-600">
                Gastos como electricidad (Iberdrola), agua (Acosol), seguros sociales de trabajadores, cuota de autónomo o tasas municipales del <span className="font-bold text-slate-900">Ayuntamiento</span>. No se emite factura habitual, sino un <span className="font-bold text-amber-700">recibo de cargo bancario</span>. 
              </p>
              <div className="p-1.5 bg-blue-50 text-blue-800 border border-blue-100 rounded-lg text-[10px] font-mono leading-normal">
                Son gastos <span className="font-bold">deducibles de base</span> en la contabilidad del hostal aunque no tengan IVA deducible por carecer de factura.
              </div>
            </div>

          </div>
        )}
      </div>

      {/* 3. FOUR MASTER METRICS STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: INCOMING CAJA REVENUE */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-md relative overflow-hidden transition-all hover:translate-y-[-2px] hover:shadow-lg flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Ingreso de Caja</span>
              </div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight font-mono">
                {stats.realIncomingRevenue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </h3>
              <p className="text-[10px] text-slate-400 leading-normal font-medium">Libro de caja (TPV + Efectivo + Bizum + Online)</p>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-100/80 flex flex-col gap-2 text-[11px] text-slate-500">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Reservas Online (Agencias):</span>
              <span className="font-bold text-slate-800">{stats.onlineBookings.toLocaleString('es-ES')} €</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Cobro Directo (Físico):</span>
              <span className="font-bold text-slate-800">{stats.offlineBookings.toLocaleString('es-ES')} €</span>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-emerald-500" />
        </div>

        {/* Card 2: COSTRS & EXPENSES (TOTAL REAL EXPENDITURE) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-md relative overflow-hidden transition-all hover:translate-y-[-2px] hover:shadow-lg flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Egresos & Costes Reales</span>
              </div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight font-mono">
                {stats.totalRealCosts.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </h3>
              <p className="text-[10px] text-slate-400 leading-normal font-medium">Suma de Nóminas + Proveedores + Impuestos</p>
            </div>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100/80 flex flex-col gap-2 text-[11px] text-slate-500">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Nóminas Personal:</span>
              <span className="font-bold text-slate-800">{stats.totalWorkersCost.toLocaleString('es-ES')} €</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Factores & Recibos:</span>
              <span className="font-bold text-slate-800">
                {(stats.officialProviderCosts + stats.receiptAndTaxesCosts).toLocaleString('es-ES')} €
              </span>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-rose-500" />
        </div>

        {/* Card 3: PROFIT OPERATING BALANCE (NET VALUE) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-md relative overflow-hidden transition-all hover:translate-y-[-2px] hover:shadow-lg flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${stats.netOperationBalance >= 0 ? 'bg-indigo-600' : 'bg-red-500'}`} />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Beneficio Operativo</span>
              </div>
              <h3 className={`text-2xl font-black tracking-tight font-mono ${
                stats.netOperationBalance >= 0 ? 'text-indigo-600' : 'text-red-600'
              }`}>
                {stats.netOperationBalance.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </h3>
              <p className="text-[10px] text-slate-400 leading-normal font-medium">Ingreso total de caja - todos los costes del período</p>
            </div>
            <div className={`p-2.5 rounded-xl border ${
              stats.netOperationBalance >= 0 ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-red-50 text-red-600 border-red-200'
            }`}>
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100/80 flex flex-col gap-2 text-[11px] text-slate-500">
            <div className="flex items-center justify-between">
              <span>Margen Comercial Real:</span>
              <span className={`font-black px-2 py-0.5 rounded text-[10px] tracking-wide ${
                stats.profitMargin >= 30 ? 'bg-emerald-100 text-emerald-800' :
                stats.profitMargin >= 10 ? 'bg-indigo-100 text-indigo-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {stats.profitMargin.toFixed(1)}% {stats.profitMargin >= 0 ? 'Ganancia' : 'Pérdida'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Facturas Proveedor Pendientes:</span>
              <span className="font-bold text-amber-600">{stats.pendingCost.toLocaleString('es-ES')} €</span>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-indigo-600" />
        </div>

        {/* Card 4: DECLARED FACTURA SALIDAS PORTION */}
        <div className="bg-slate-900 border border-slate-950 text-white p-5 rounded-3xl shadow-lg relative overflow-hidden transition-all hover:translate-y-[-2px] hover:shadow-xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300">Salidas Declaradas</span>
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight font-mono">
                {stats.declaredSalesInvoices.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </h3>
              <p className="text-[10px] text-slate-400 leading-normal font-medium">Facturas emitidas registradas (Clientes que pidieron)</p>
            </div>
            <div className="p-2.5 bg-indigo-500/10 text-white rounded-xl border border-slate-700">
              <Receipt className="w-5 h-5 text-indigo-300" />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col gap-2 text-[11px] text-slate-400">
            <div className="flex items-center justify-between">
              <span>Tasa Real Declarado / Caja:</span>
              <span className="font-bold text-amber-400 font-mono">{stats.declaredPercentage.toFixed(1)} %</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Diferencia Particulares:</span>
              <span className="text-slate-200">
                {Math.max(0, stats.realIncomingRevenue - stats.declaredSalesInvoices).toLocaleString('es-ES')} €
              </span>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-amber-400" />
        </div>

      </div>

      {/* 4. CHANNELS TRACKER, DETAILED EXPENDITURES, AND HACIENDA DESK BLOCK */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* PANEL 1: RESERVATION BOOKINGS CANAL ANALYTICS */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between gap-5 transition-all hover:shadow-md">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Canales de Reservas</h4>
                <p className="text-[10px] text-slate-400 font-medium">Origen de los cobros en base al libro de fondos</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed font-light">
              Monto total de las reservas de huéspedes procedentes de agencias online (prepagos, transferencias) evaluados frente a pagos presenciales directos en el mostrador.
            </p>

            <div className="space-y-4">
              {/* online booking */}
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="font-extrabold text-slate-700">Online Bookings (Agencias)</span>
                  </div>
                  <span className="font-black text-slate-800 font-mono">{stats.onlineBookings.toLocaleString('es-ES')} €</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div 
                    className="h-2 bg-blue-500 rounded-full transition-all" 
                    style={{ width: `${stats.realIncomingRevenue > 0 ? (stats.onlineBookings / stats.realIncomingRevenue) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-400 font-semibold tracking-wide">
                  <span>Transferencia / Bizum / Reserva Web</span>
                  <span className="bg-blue-100/80 text-blue-800 px-1.5 py-0.5 rounded font-bold font-mono">{stats.numOnline} transacc.</span>
                </div>
              </div>

              {/* offline booking */}
              <div className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    <span className="font-extrabold text-slate-700">En Mostrador (Físico)</span>
                  </div>
                  <span className="font-black text-slate-800 font-mono">{stats.offlineBookings.toLocaleString('es-ES')} €</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div 
                    className="h-2 bg-indigo-600 rounded-full transition-all" 
                    style={{ width: `${stats.realIncomingRevenue > 0 ? (stats.offlineBookings / stats.realIncomingRevenue) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-400 font-semibold tracking-wide">
                  <span>TPV Datáfono / Caja en Metálico</span>
                  <span className="bg-indigo-50 text-indigo-800 px-1.5 py-0.5 rounded font-bold font-mono">{stats.numOffline} transacc.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-1 block mb-1">
              <Coins className="w-3.5 h-3.5 text-indigo-500" /> Balance Operativo de Reservas:
            </span>
            <p className="text-slate-600 font-light leading-normal">
              {stats.onlineBookings > stats.offlineBookings 
                ? 'Las reservas online por agencias de viaje con prepago dominan. Verifique las comisiones cobradas.'
                : 'La recepción física registra gran afluencia de pagos directos, lo cual maximiza el beneficio líquido neto.'
              }
            </p>
          </div>
        </div>

        {/* PANEL 2: DETAILED COSTS SEGREGATOR */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between gap-5 transition-all hover:shadow-md">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Estructura de Gastos</h4>
                <p className="text-[10px] text-slate-400 font-medium">Segmentación exacta de salidas financieras</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-light">
              Desglose analítico de los costes divididos por nóminas del personal del hostal, facturas con emisor comercial e impuestos o tasas bancarias (de los cuales se obtiene recibo).
            </p>

            <div className="space-y-3 pt-1">
              {/* Payroll */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-500" /> Nóminas
                  </span>
                  <span className="font-bold text-slate-800 font-mono">{stats.totalWorkersCost.toLocaleString('es-ES')} €</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div 
                    className="h-1.5 bg-slate-500 rounded-full transition-all" 
                    style={{ width: `${stats.totalRealCosts > 0 ? (stats.totalWorkersCost / stats.totalRealCosts) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Providers */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Facturas Proveedor
                  </span>
                  <span className="font-bold text-slate-800 font-mono">{stats.officialProviderCosts.toLocaleString('es-ES')} €</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div 
                    className="h-1.5 bg-rose-500 rounded-full transition-all" 
                    style={{ width: `${stats.totalRealCosts > 0 ? (stats.officialProviderCosts / stats.totalRealCosts) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Taxes/Receipts */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Justificantes/Impuestos
                  </span>
                  <span className="font-bold text-slate-800 font-mono">{stats.receiptAndTaxesCosts.toLocaleString('es-ES')} €</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div 
                    className="h-1.5 bg-amber-400 rounded-full transition-all" 
                    style={{ width: `${stats.totalRealCosts > 0 ? (stats.receiptAndTaxesCosts / stats.totalRealCosts) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-xs">
            <span className="font-bold text-amber-900 block mb-1">⚠️ Observación sobre Ayuntamientos:</span>
            <p className="text-amber-800 font-medium leading-normal">
              Ayuntamientos, Agencia Tributaria o bancos no emiten facturas, sólo justificantes contables de cargo en cuenta. Al no tener IVA no se declaran en el modelo 303, pero se deducen totalmente de gastos fijos.
            </p>
          </div>
        </div>

        {/* PANEL 3: HACIENDA DECLARED VS REAL TAX CHECK CONSOLE */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between gap-5 transition-all hover:shadow-md">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-slate-900 text-amber-400 rounded-xl">
                <Landmark className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Hacienda Tax Safety Console</h4>
                <p className="text-[10px] text-slate-400 font-medium">Control preventivo frente a inspecciones fiscales</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-light">
              Mide si las facturas de salidas emitidas (cuando el cliente pide factura) se corresponden correctamente con su facturación declarable o si existe discrepancia.
            </p>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center space-y-3">
              <div className="relative flex items-center justify-center">
                
                {/* SVG circular dial gauge */}
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle cx="48" cy="48" r="38" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                  <circle cx="48" cy="48" r="38" stroke="#4f46e5" strokeWidth="8" fill="transparent"
                          strokeDasharray={238.76}
                          strokeDashoffset={238.76 - (238.76 * Math.min(100, stats.declaredPercentage)) / 100}
                          className="transition-all duration-500 ease-out" />
                </svg>

                <div className="absolute text-center">
                  <span className="text-md font-black text-slate-800 font-mono block">{stats.declaredPercentage.toFixed(1)}%</span>
                  <span className="text-[7px] text-slate-400 font-extrabold uppercase tracking-wider block">Facturado</span>
                </div>
              </div>

              <div className="text-center space-y-1">
                <span className="text-[11px] font-black text-slate-800">
                  Emitido Oficial: {stats.declaredSalesInvoices.toLocaleString('es-ES')} €
                </span>
                <p className="text-[9px] text-slate-400 font-semibold max-w-[190px] mx-auto leading-normal">
                  Sobre {stats.realIncomingRevenue.toLocaleString('es-ES')} € totales del libro de caja.
                </p>
              </div>
            </div>
          </div>

          {/* Dynamic tax check badge */}
          <div className={`p-3 rounded-2xl border ${taxSafety.color} text-xs space-y-1`}>
            <div className="flex items-center gap-1.5 font-black uppercase tracking-wider text-[10px]">
              <span className={`w-2 h-2 rounded-full ${taxSafety.bulletColor}`} />
              {taxSafety.label}
            </div>
            <p className="font-light leading-normal leading-4 text-slate-700">
              {taxSafety.description}
            </p>
          </div>
        </div>

      </div>

      {/* 5. SELECCIÓN DE GRÁFICO HISTÓRICO COMPARATIVO */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="space-y-1">
            <span className="p-1 px-2 rounded bg-indigo-50 text-[9px] text-indigo-700 font-black uppercase tracking-wider border border-indigo-200">
              EVOLUCIÓN TEMPORAL
            </span>
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mt-1.5">Historias & Flujos Mensuales ({selectedYear})</h4>
            <p className="text-[11px] text-slate-500">
              Compare visualmente los tres pilares del negocio para cada mes. Pase el puntero sobre cada columna para ver las cifras exactas.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-xs font-bold bg-slate-50 p-2 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-slate-600 font-medium text-[11px]">Ingreso Real (Caja)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-500" />
              <span className="text-slate-600 font-medium text-[11px]">Coste Real (Gastos+Nóminas)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-600" />
              <span className="text-slate-600 font-medium text-[11px]">Emitidas (Bajo Petición)</span>
            </div>
          </div>
        </div>

        {/* Scaled Multi Bar Charts SVG representation */}
        <div className="relative h-64 w-full bg-slate-50/50 p-4 rounded-2xl border border-slate-200">
          <svg className="w-full h-full" viewBox="0 0 700 240" preserveAspectRatio="none">
            {/* Grid Lines */}
            <line x1="35" y1="20" x2="685" y2="20" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="35" y1="65" x2="685" y2="65" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="35" y1="110" x2="685" y2="110" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
            <line x1="35" y1="155" x2="685" y2="155" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="35" y1="200" x2="685" y2="200" stroke="#cbd5e1" strokeWidth="1.5" />

            {/* Left ticks */}
            <text x="5" y="24" fill="#64748b" fontSize="8" fontWeight="bold" className="font-mono">{(maxChartVal).toFixed(0)}€</text>
            <text x="5" y="114" fill="#64748b" fontSize="8" fontWeight="bold" className="font-mono">{(maxChartVal / 2).toFixed(0)}€</text>
            <text x="5" y="204" fill="#64748b" fontSize="8" fontWeight="bold" className="font-mono">0€</text>

            {/* Render Bars */}
            {trendsData.map((item, index) => {
              const totalMonths = 12;
              const columnWidth = (620 / totalMonths);
              const startX = 45 + (index * columnWidth);

              // Height scaled to maxChartVal
              const scaleHeight = (val: number) => (val / maxChartVal) * 180;

              const incHeight = scaleHeight(item.realIncoming);
              const costHeight = scaleHeight(item.realCosts);
              const decHeight = scaleHeight(item.declaredSales);

              const barW = Math.max(columnWidth * 0.22, 6);

              return (
                <g key={item.label} className="group cursor-pointer">
                  
                  {/* Real Incoming (Green) */}
                  {item.realIncoming > 0 && (
                    <rect
                      x={startX}
                      y={200 - incHeight}
                      width={barW}
                      height={incHeight}
                      fill="#10b981"
                      rx="2"
                      className="transition-all hover:opacity-85 duration-200"
                    />
                  )}

                  {/* Real Costs (Rose) */}
                  {item.realCosts > 0 && (
                    <rect
                      x={startX + barW + 2}
                      y={200 - costHeight}
                      width={barW}
                      height={costHeight}
                      fill="#f43f5e"
                      rx="2"
                      className="transition-all hover:opacity-85 duration-200"
                    />
                  )}

                  {/* Declared Sales (Indigo) */}
                  {item.declaredSales > 0 && (
                    <rect
                      x={startX + (barW * 2) + 4}
                      y={200 - decHeight}
                      width={barW}
                      height={decHeight}
                      fill="#4f46e5"
                      rx="2"
                      className="transition-all hover:opacity-85 duration-200"
                    />
                  )}

                  {/* Tooltip trigger layer */}
                  <rect
                    x={startX - 2}
                    y={10}
                    width={columnWidth - 4}
                    height={210}
                    fill="transparent"
                    className="hover:fill-slate-500/5 transition-all duration-150"
                  >
                    <title>{`
Mes: ${item.label}
---------------------------------
Ingresos reales (Caja): ${item.realIncoming.toLocaleString('es-ES')} €
Costes reales (Deducibles + Nóminas): ${item.realCosts.toLocaleString('es-ES')} €
Salidas emetidas (Facturas oficiales): ${item.declaredSales.toLocaleString('es-ES')} €
                    `}</title>
                  </rect>

                  {/* Month Label */}
                  <text
                    x={startX + (barW * 1.5) + 2}
                    y="218"
                    fill="#334155"
                    fontSize="9"
                    fontWeight="extrabold"
                    textAnchor="middle"
                  >
                    {item.label}
                  </text>
                  
                  {/* Value quick preview popup under hover indicator */}
                  {item.realIncoming > 0 && (
                    <text
                      x={startX + (barW * 1.5)}
                      y={Math.max(15, 200 - Math.max(incHeight, costHeight, decHeight) - 8)}
                      fill="#1e1b4b"
                      fontSize="7"
                      fontWeight="black"
                      textAnchor="middle"
                      className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none font-mono tracking-tighter"
                    >
                      +{item.realIncoming.toFixed(0)}€
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

    </div>
  );
}
