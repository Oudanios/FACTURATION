/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { DetailedCosts, EmployeeCost, OverheadCost, UserAccount } from '../types';
import { 
  Users, Receipt, Plus, Trash2, Calendar, ClipboardList, 
  TrendingDown, DollarSign, Wallet, Lightbulb, Landmark, AlertCircle, ShoppingBag,
  Printer, FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CompanyCostsProps {
  currentUser: UserAccount;
  detailedCosts: { [month: string]: DetailedCosts };
  onUpdateDetailedCosts: React.Dispatch<React.SetStateAction<{ [month: string]: DetailedCosts }>>;
  lang: 'es' | 'en' | 'fr';
  costConcepts?: string[];
}

export default function CompanyCosts({
  currentUser,
  detailedCosts,
  onUpdateDetailedCosts,
  lang,
  costConcepts = []
}: CompanyCostsProps) {
  // Available Months for fast navigation matching other tabs
  const availableMonths = [
    { label: lang === 'es' ? 'Junio 2026' : lang === 'fr' ? 'Juin 2026' : 'June 2026', value: '2026-06' },
    { label: lang === 'es' ? 'Mayo 2026' : lang === 'fr' ? 'Mai 2026' : 'May 2026', value: '2026-05' },
    { label: lang === 'es' ? 'Abril 2026' : lang === 'fr' ? 'Avril 2026' : 'April 2026', value: '2026-04' },
    { label: lang === 'es' ? 'Marzo 2026' : lang === 'fr' ? 'Mars 2026' : 'March 2026', value: '2026-03' },
    { label: lang === 'es' ? 'Febrero 2026' : lang === 'fr' ? 'Février 2026' : 'February 2026', value: '2026-02' },
  ];

  const [selectedMonth, setSelectedMonth] = useState('2026-06');

  // Multi-language strings
  const labels = {
    es: {
      title: "Costes y Operaciones de Empresa",
      subtitle: "Gestión centralizada de personal, suministros directos (luz, agua, internet) y gastos operativos del Hostal.",
      titlePersonnel: "1. Costes de Personal (Fichas de Trabajadores)",
      descPersonnel: "Añade cada empleado individual para calcular automáticamente el neto y su seguridad social.",
      titleOverheads: "2. Gastos Directos y Suministros (Luz, Agua, Internet, Rentas...)",
      descOverheads: "Registre de forma directa los costes fijos o variables mensuales de mantenimiento.",
      presetsTitle: "Acceso Rápido: Cargar Facturas de Suministros",
      addEmployeeBtn: "Añadir Empleado",
      addOverheadBtn: "Añadir Coste / Factura",
      thName: "Empleado / Nombre",
      thRole: "Cargo / Función",
      thNetSalary: "Sueldo Líquido (Neto)",
      thSS: "Segg. Social Empresa",
      thTotal: "Total Coste",
      thActions: "Acción",
      thDate: "Fecha",
      thCategory: "Categoría",
      thConcept: "Concepto / Detalle",
      thAmount: "Monto",
      totalPersonnelCost: "Total Coste Personal",
      totalOverheadsCost: "Total Gastos de Gestión",
      totalSum: "Total Gastos de Explotación",
      legacyNotice: "Tiene cargado un valor base aproximado para este mes:",
      useDetailedBreakdown: "Activar desglose detallado para este mes",
      noEmployees: "No se han añadido empleados detallados para este mes.",
      noOverheads: "No se han añadido suministros detallados para este mes.",
      restricted: "Acceso restringido: Su rol no tiene permisos para modificar costos.",
      placeholderEmployeeName: "Ej. María Rosa",
      placeholderEmployeeRole: "Ej. Lencera y Recepción",
      electricity: "Electricidad (Luz)",
      water: "Consumo de Agua",
      internet: "Fibra Internet / Conectividad",
      rent: "Renta de Alquiler",
      insurance: "Seguro de Hostal",
      taxes: "Tasas Locales / Impuestos",
      marketing: "Publicidad / Booking Ads",
      other: "Otros Suministros"
    },
    en: {
      title: "Company Costs & Overheads",
      subtitle: "Centralized management of staffing payroll, direct supplies (electricity, water, broadband / internet), and monthly operating costs.",
      titlePersonnel: "1. Staff Costs (Employee Payroll Sheets)",
      descPersonnel: "Add each employee individually to calculate net wages and employer corporate tax contributions automatically.",
      titleOverheads: "2. Direct Expenses & Utilities (Luz, Agua, Internet, Rent...)",
      descOverheads: "Duly record fixed assets or variable recurring utility expenses on this digital catalog.",
      presetsTitle: "Quick Entry: Add Utility Invoices Directly",
      addEmployeeBtn: "Add Employee Cost",
      addOverheadBtn: "Add Operational Cost",
      thName: "Employee Name",
      thRole: "Job Title",
      thNetSalary: "Net Pocket Salary",
      thSS: "Employer Social Security",
      thTotal: "Total Cost",
      thActions: "Action",
      thDate: "Date",
      thCategory: "Category",
      thConcept: "Memo / Description",
      thAmount: "Amount",
      totalPersonnelCost: "Total Staff Cost",
      totalOverheadsCost: "Total Overhead Cost",
      totalSum: "Total Operating Cost",
      legacyNotice: "A baseline approximate value is imported for this month:",
      useDetailedBreakdown: "Activate itemized detailed costs for this month",
      noEmployees: "No detailed employees registered yet for this month.",
      noOverheads: "No detailed utility invoices registered yet for this month.",
      restricted: "Restricted: Your role does not carry permissions to configure overhead costs.",
      placeholderEmployeeName: "e.g. Mary Rose",
      placeholderEmployeeRole: "e.g. Cleanning & Receptionist",
      electricity: "Electricity Power",
      water: "Water Supply",
      internet: "Broadband / Router Internet",
      rent: "Building Rent",
      insurance: "Hotel Insurance",
      taxes: "Local Municipal Fees",
      marketing: "Marketing & Bookings Ads",
      other: "Other Outflow Items"
    },
    fr: {
      title: "Coûts de l'Établissement",
      subtitle: "Gestion centralisée du personnel, des services publics (électricité, eau, internet) et des charges d'exploitation de l'hôtel.",
      titlePersonnel: "1. Coûts de Personnel (Fiche par Employé)",
      descPersonnel: "Ajoutez chaque salarié individuellement pour calculer automatiquement le net et la sécurité sociale patronale.",
      titleOverheads: "2. Charges d'Exploitation et Consommations (Lumière, Eau, Internet...)",
      descOverheads: "Suivez directement les charges fixes ou variables liées à l'activité de l'hôtel.",
      presetsTitle: "Raccourcis : Saisir des Fournitures Fixes",
      addEmployeeBtn: "Ajouter Salrié",
      addOverheadBtn: "Ajouter un Coût",
      thName: "Nom du Salarié",
      thRole: "Poste occupé",
      thNetSalary: "Salaire Net Direct",
      thSS: "Séc. Sociale Patronale",
      thTotal: "Coût Total",
      thActions: "Actions",
      thDate: "Date",
      thCategory: "Catégorie",
      thConcept: "Détail / Concept",
      thAmount: "Montant",
      totalPersonnelCost: "Total Frais Personnel",
      totalOverheadsCost: "Total Charges Générales",
      totalSum: "Total des Dépenses Directes",
      legacyNotice: "Une valeur par défaut est définie pour ce mois-ci :",
      useDetailedBreakdown: "Activer le détail des écritures de coûts",
      noEmployees: "Aucun employé saisi en détail pour ce mois.",
      noOverheads: "Aucune fourniture enregistrée ce mois-ci.",
      restricted: "Accès limité: Vous n'avez pas l'autorisation de modifier les coûts.",
      placeholderEmployeeName: "Ex. Marie Rose",
      placeholderEmployeeRole: "Ex. Réception et Blanchisserie",
      electricity: "Électricité",
      water: "Fourniture d'Eau",
      internet: "Réseau Fibre / Internet",
      rent: "Loyer d'Exploitation",
      insurance: "Assurance Hôtel",
      taxes: "Impôts et Taxes Locaux",
      marketing: "Publicité / Booking Ads",
      other: "Autres Fournitures"
    }
  };

  const t = labels[lang];

  // Role based write permissions
  const canManageCosts = currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER' || currentUser.role === 'SUPPORT';

  // Extract current month's detailed costs or fallback to empty structure
  const currentMonthlyData = useMemo(() => {
    return detailedCosts[selectedMonth] || {
      empleadosSueldos: 0,
      seguridadSocialEmpresa: 0,
      autonomosOtros: 0,
      otrosCostes: 0,
      suministrosDirectos: 0,
      segurosHotel: 0,
      tasasImpuestos: 0,
      customCosts: [],
      employees: [],
      overheads: []
    };
  }, [detailedCosts, selectedMonth]);

  // Track state for Employee fields
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState('');
  const [empNet, setEmpNet] = useState('');
  const [empSS, setEmpSS] = useState('');

  // Track state for Overhead fields
  const [ovDate, setOvDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [ovCategory, setOvCategory] = useState<OverheadCost['category']>('Internet');
  const [ovLabel, setOvLabel] = useState('');
  const [ovAmount, setOvAmount] = useState('');
  
  // Custom states for dynamic concept menu selection
  const [selectedConcept, setSelectedConcept] = useState('');
  const [ovMemo, setOvMemo] = useState('');

  // Always start in detailed itemized mode — smarter default for every month
  const [isDetailedActive, setIsDetailedActive] = useState(true);

  // Keep detailed mode when changing months (legacy mode remains accessible via toggle)
  React.useEffect(() => {
    setIsDetailedActive(true);
  }, [selectedMonth]);

  // Set default selected concept based on Admin configuration
  React.useEffect(() => {
    if (costConcepts && costConcepts.length > 0) {
      setSelectedConcept(costConcepts[0]);
    } else {
      setSelectedConcept('PERSONALIZADO');
    }
  }, [costConcepts]);

  // Aggregate itemized personnel costs
  const personnelTotals = useMemo(() => {
    const list = currentMonthlyData.employees || [];
    const net = list.reduce((sum, e) => sum + e.netSalary, 0);
    const ss = list.reduce((sum, e) => sum + e.socialSecurity, 0);
    return {
      net,
      ss,
      total: net + ss
    };
  }, [currentMonthlyData.employees]);

  // Aggregate itemized overheads costs
  const overheadTotals = useMemo(() => {
    const list = currentMonthlyData.overheads || [];
    let internet = 0;
    let electricity = 0;
    let water = 0;
    let rent = 0;
    let insurance = 0;
    let taxes = 0;
    let marketing = 0;
    let other = 0;

    list.forEach(o => {
      const amt = o.amount;
      if (o.category === 'Internet') internet += amt;
      else if (o.category === 'Electricity') electricity += amt;
      else if (o.category === 'Water') water += amt;
      else if (o.category === 'Rent') rent += amt;
      else if (o.category === 'Insurance') insurance += amt;
      else if (o.category === 'Taxes') taxes += amt;
      else if (o.category === 'Marketing') marketing += amt;
      else other += amt;
    });

    const total = internet + electricity + water + rent + insurance + taxes + marketing + other;
    return {
      internet, electricity, water, rent, insurance, taxes, marketing, other, total
    };
  }, [currentMonthlyData.overheads]);

  // Master accounting calculation
  const calculatedGrandTotal = useMemo(() => {
    if (isDetailedActive) {
      // Sum computed detailed elements plus autonomic and custom items
      const autonomesValue = currentMonthlyData.autonomosOtros || 0;
      const customItemsSum = (currentMonthlyData.customCosts || []).reduce((sum, c) => sum + c.amount, 0);
      return personnelTotals.total + overheadTotals.total + autonomesValue + customItemsSum;
    } else {
      // Return historical simple layout totals
      const customItemsSum = (currentMonthlyData.customCosts || []).reduce((sum, c) => sum + c.amount, 0);
      return (
        (currentMonthlyData.empleadosSueldos || 0) +
        (currentMonthlyData.seguridadSocialEmpresa || 0) +
        (currentMonthlyData.autonomosOtros || 0) +
        (currentMonthlyData.otrosCostes || 0) +
        (currentMonthlyData.suministrosDirectos || 0) +
        (currentMonthlyData.segurosHotel || 0) +
        (currentMonthlyData.tasasImpuestos || 0) +
        customItemsSum
      );
    }
  }, [isDetailedActive, currentMonthlyData, personnelTotals, overheadTotals]);

  // Handler to add a personnel cost entry
  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageCosts) return;
    const net = parseFloat(empNet);
    const ss = parseFloat(empSS);
    if (!empName.trim() || isNaN(net) || isNaN(ss)) return;

    const newEmp: EmployeeCost = {
      id: "EMP-" + Date.now().toString(36).toUpperCase(),
      name: empName.trim(),
      role: empRole.trim() || "Staff",
      netSalary: net,
      socialSecurity: ss
    };

    onUpdateDetailedCosts(prev => {
      const current = prev[selectedMonth] || {
        empleadosSueldos: 0,
        seguridadSocialEmpresa: 0,
        autonomosOtros: 0,
        otrosCostes: 0,
        suministrosDirectos: 0,
        segurosHotel: 0,
        tasasImpuestos: 0,
        customCosts: [],
        employees: [],
        overheads: []
      };

      const updatedEmployees = [...(current.employees || []), newEmp];
      
      // Keep compatible with simple fields
      const sumNet = updatedEmployees.reduce((sum, emp) => sum + emp.netSalary, 0);
      const sumSS = updatedEmployees.reduce((sum, emp) => sum + emp.socialSecurity, 0);

      const nextMonthData: DetailedCosts = {
        ...current,
        employees: updatedEmployees,
        empleadosSueldos: sumNet,
        seguridadSocialEmpresa: sumSS
      };

      return {
        ...prev,
        [selectedMonth]: nextMonthData
      };
    });

    // Clear forms
    setEmpName('');
    setEmpRole('');
    setEmpNet('');
    setEmpSS('');
    setIsDetailedActive(true);
  };

  // Handler to remove a personnel cost entry
  const handleRemoveEmployee = (id: string) => {
    if (!canManageCosts) return;

    onUpdateDetailedCosts(prev => {
      const current = prev[selectedMonth];
      if (!current || !current.employees) return prev;

      const updatedEmployees = current.employees.filter(e => e.id !== id);
      const sumNet = updatedEmployees.reduce((sum, emp) => sum + emp.netSalary, 0);
      const sumSS = updatedEmployees.reduce((sum, emp) => sum + emp.socialSecurity, 0);

      return {
        ...prev,
        [selectedMonth]: {
          ...current,
          employees: updatedEmployees,
          empleadosSueldos: sumNet,
          seguridadSocialEmpresa: sumSS
        }
      };
    });
  };

  // Handler to add an overhead cost entry
  const handleAddOverhead = (category: OverheadCost['category'], labelName: string, amtVal: number) => {
    if (!canManageCosts) return;
    if (isNaN(amtVal) || amtVal <= 0) return;

    const newOv: OverheadCost = {
      id: "OVH-" + Math.random().toString(36).substring(2, 9).toUpperCase(),
      category,
      label: labelName.trim() || category,
      amount: amtVal,
      date: ovDate
    };

    onUpdateDetailedCosts(prev => {
      const current = prev[selectedMonth] || {
        empleadosSueldos: 0,
        seguridadSocialEmpresa: 0,
        autonomosOtros: 0,
        otrosCostes: 0,
        suministrosDirectos: 0,
        segurosHotel: 0,
        tasasImpuestos: 0,
        customCosts: [],
        employees: [],
        overheads: []
      };

      const updatedOverheads = [...(current.overheads || []), newOv];

      // Re-map legacy fields from ZERO using all updatedOverheads — avoids double-counting
      let sumSuministros = 0, sumSeguros = 0, sumTasas = 0, sumOtros = 0;

      updatedOverheads.forEach(o => {
        if (o.category === 'Internet' || o.category === 'Electricity' || o.category === 'Water') {
          sumSuministros += o.amount;
        } else if (o.category === 'Insurance') {
          sumSeguros += o.amount;
        } else if (o.category === 'Taxes') {
          sumTasas += o.amount;
        } else {
          sumOtros += o.amount;
        }
      });

      return {
        ...prev,
        [selectedMonth]: {
          ...current,
          overheads: updatedOverheads,
          suministrosDirectos: sumSuministros,
          segurosHotel: sumSeguros,
          tasasImpuestos: sumTasas,
          otrosCostes: sumOtros
        }
      };
    });

    setOvLabel('');
    setOvAmount('');
    setIsDetailedActive(true);
  };

  // Handler to remove an overhead cost entry
  const handleRemoveOverhead = (id: string) => {
    if (!canManageCosts) return;

    onUpdateDetailedCosts(prev => {
      const current = prev[selectedMonth];
      if (!current || !current.overheads) return prev;

      const updatedOverheads = current.overheads.filter(o => o.id !== id);

      // Recalculate all legacy fields from ZERO using only remaining overheads — fixes stale values
      let sumSuministros = 0, sumSeguros = 0, sumTasas = 0, sumOtros = 0;

      updatedOverheads.forEach(o => {
        if (o.category === 'Internet' || o.category === 'Electricity' || o.category === 'Water') {
          sumSuministros += o.amount;
        } else if (o.category === 'Insurance') {
          sumSeguros += o.amount;
        } else if (o.category === 'Taxes') {
          sumTasas += o.amount;
        } else {
          sumOtros += o.amount;
        }
      });

      return {
        ...prev,
        [selectedMonth]: {
          ...current,
          overheads: updatedOverheads,
          suministrosDirectos: sumSuministros,
          segurosHotel: sumSeguros,
          tasasImpuestos: sumTasas,
          otrosCostes: sumOtros
        }
      };
    });
  };

  // Legacy manual slider/input triggers
  const handleUpdateLegacyField = (field: keyof DetailedCosts, value: number) => {
    if (!canManageCosts) return;
    onUpdateDetailedCosts(prev => {
      const current = prev[selectedMonth] || {
        empleadosSueldos: 0,
        seguridadSocialEmpresa: 0,
        autonomosOtros: 0,
        otrosCostes: 0,
        suministrosDirectos: 0,
        segurosHotel: 0,
        tasasImpuestos: 0,
        customCosts: [],
        employees: [],
        overheads: []
      };

      return {
        ...prev,
        [selectedMonth]: {
          ...current,
          [field]: value
        }
      };
    });
  };

  const handleExportCostsCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'CONCEPTO,DESCRIPCION,CATEGORIA,FECHA_DETALLE,MONTO_EUR\n';
    
    // Employees
    const emps = currentMonthlyData.employees || [];
    emps.forEach(e => {
      csvContent += `Personal - ${e.name.replace(/,/g, '')},Sueldo Neto,Sueldos,${e.role.replace(/,/g, '')},${e.netSalary}\n`;
      csvContent += `Segg. Social - ${e.name.replace(/,/g, '')},Seguridad Social Empresa,Seguridad Social,${e.role.replace(/,/g, '')},${e.socialSecurity}\n`;
    });
    
    // Overheads
    const ovs = currentMonthlyData.overheads || [];
    ovs.forEach(o => {
      csvContent += `Suministro - ${o.label.replace(/,/g, '')},Pago Directo,${o.category},${o.date},${o.amount}\n`;
    });
    
    // Autonòmos
    csvContent += `Autónomos Directo,Fijo Autónomos Mutua,Autonómos,Fijo,${currentMonthlyData.autonomosOtros || 0}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_gastos_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintCostsReport = () => {
    const hi = { company: 'SUN SERRAMAR SL', cif: 'B21902432', address: 'CALLE LAS FLORES, 5, 29631 BENALMADINA, MALAGA', email: 'SERRAMAR2906@GMAIL.COM', tel: '+34 652442604' };
    const today = new Date().toLocaleDateString('es-ES');
    const monthLabel = availableMonths.find(m => m.value === selectedMonth)?.label || selectedMonth;
    const emps = currentMonthlyData.employees || [];
    const ovs = currentMonthlyData.overheads || [];
    const empRows = emps.map(e => `<tr><td>${e.name}</td><td>${e.role}</td><td class="num">${e.netSalary.toFixed(2)} €</td><td class="num">${e.socialSecurity.toFixed(2)} €</td><td class="num"><strong>${(e.netSalary + e.socialSecurity).toFixed(2)} €</strong></td></tr>`).join('');
    const ovRows = ovs.map(o => `<tr><td>${o.category}</td><td>${o.label}</td><td>${o.date||''}</td><td class="num">${o.amount.toFixed(2)} €</td></tr>`).join('');
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Costes - '+monthLabel+'</title><style>body{font-family:Segoe UI,Arial,sans-serif;font-size:10pt;color:#1e293b;padding:30px 40px;max-width:210mm;margin:0 auto}h1{font-size:16pt;border-bottom:2px solid #1e293b;padding-bottom:6px;margin-bottom:4px}.meta{font-size:7pt;color:#64748b;margin-bottom:16px}h2{font-size:11pt;margin:16px 0 8px;padding-bottom:4px;border-bottom:1px solid #cbd5e1}table{width:100%;border-collapse:collapse;font-size:8.5pt;margin-bottom:12px}th{background:#f1f5f9;padding:5px 6px;border:1px solid #cbd5e1;text-align:left;font-size:7.5pt;text-transform:uppercase}td{padding:4px 6px;border:1px solid #e2e8f0}.num{text-align:right;font-family:Consolas,monospace}.total td{font-weight:800;font-size:9pt;border-top:2px solid #1e293b;background:#f8fafc}.footer{margin-top:20px;font-size:7pt;color:#94a3b8;text-align:center;border-top:1px solid #e2e8f0;padding-top:8px}@media print{body{padding:0}}</style></head><body><h1>COSTES DE EXPLOTACION</h1><div class="meta"><strong>'+hi.company+'</strong> | CIF: '+hi.cif+' | '+hi.address+' | Periodo: '+monthLabel+' | Generado: '+today+'</div><h2>1. PERSONAL</h2><table><thead><tr><th>Empleado</th><th>Cargo</th><th class="num">Sueldo Neto</th><th class="num">Seg. Social</th><th class="num">Total Coste</th></tr></thead><tbody>'+empRows+'</tbody><tfoot><tr class="total"><td colspan="4"><strong>TOTAL PERSONAL</strong></td><td class="num"><strong>'+personnelTotals.total.toFixed(2)+' €</strong></td></tr></tfoot></table><h2>2. SUMINISTROS Y GASTOS</h2><table><thead><tr><th>Categoria</th><th>Concepto</th><th>Fecha</th><th class="num">Monto</th></tr></thead><tbody>'+ovRows+'</tbody><tfoot><tr class="total"><td colspan="3"><strong>TOTAL SUMINISTROS</strong></td><td class="num"><strong>'+overheadTotals.total.toFixed(2)+' €</strong></td></tr></tfoot></table><h2>3. RESUMEN</h2><table><tr><td>Coste Personal</td><td class="num">'+personnelTotals.total.toFixed(2)+' €</td></tr><tr><td>Suministros</td><td class="num">'+overheadTotals.total.toFixed(2)+' €</td></tr><tr><td>Autonomos</td><td class="num">'+(currentMonthlyData.autonomosOtros||0).toFixed(2)+' €</td></tr>' + ((currentMonthlyData.customCosts||[]).map((c:any) => '<tr><td>'+c.label+'</td><td class="num">'+c.amount.toFixed(2)+' €</td></tr>').join('')) + '<tr class="total"><td><strong>TOTAL GASTOS</strong></td><td class="num"><strong>'+calculatedGrandTotal.toFixed(2)+' €</strong></td></tr></table><div class="footer">'+hi.company+' | '+hi.cif+' | '+hi.address+' | Documento generado: '+today+'</div></body></html>');
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div className="space-y-6">
      
      {/* PROFESSIONAL TITLE CONTAINER */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-rose-950/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-2xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 text-rose-350 text-xs font-black uppercase tracking-wider mb-2">
              <TrendingDown className="w-4 h-4 text-rose-400" />
              <span>Hostal Serramar • {t.title}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-2">
              Contabilidad de Gastos de Explotación
            </h2>
            <p className="text-slate-300 text-xs font-medium max-w-2xl leading-relaxed">
              {t.subtitle} Registre comisiones, mensualidades por alquiler, nóminas brutas o recibos bancarios de suministros que afectan al beneficio bruto neto de la empresa de forma independiente.
            </p>
          </div>

          {/* Month Navigator */}
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/10 shrink-0 w-full md:w-auto">
            <span className="block text-[9px] uppercase font-bold text-rose-300 tracking-wider mb-2">PERIODO DE COSTES ACTIVO</span>
            <div className="flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-rose-400 shrink-0" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-white font-extrabold text-sm focus:outline-none cursor-pointer pr-4"
              >
                {availableMonths.map(m => (
                  <option key={m.value} value={m.value} className="bg-slate-900 text-white font-bold">
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Global summary count */}
        <div className="border-t border-white/10 mt-6 pt-4 flex flex-wrap justify-between items-center text-xs text-rose-250 gap-4">
          <div className="flex items-center gap-5">
            <div>
              <span className="text-[9px] text-slate-400 block font-bold">FECHA REGISTRO</span>
              <span className="font-semibold text-white uppercase tracking-wider">{selectedMonth}</span>
            </div>
            <div className="h-8 w-px bg-white/10 hidden sm:block" />
            <div>
              <span className="text-[9px] text-slate-400 block font-bold">{t.totalSum} ({selectedMonth})</span>
              <span className="text-lg font-black text-rose-400 font-mono">
                {calculatedGrandTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </span>
            </div>
          </div>
          
          {/* Legacy vs Detailed Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold text-slate-300 uppercase tracking-wide">
              {t.useDetailedBreakdown}
            </span>
            <button
              onClick={() => {
                if (canManageCosts) {
                  setIsDetailedActive(!isDetailedActive);
                }
              }}
              disabled={!canManageCosts}
              className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${
                isDetailedActive ? 'bg-rose-600' : 'bg-slate-650'
              }`}
            >
              <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${isDetailedActive ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* GATED REPORTING BAR */}
      <div className="bg-slate-100/80 p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
        <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
          <ClipboardList className="w-4 h-4 text-slate-600" />
          {lang === 'es' ? 'Consola de Reportes' : 'Reporting Console'}
        </span>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {currentUser.role === 'ADMIN' ? (
            <>
              <button
                onClick={handlePrintCostsReport}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                title="Generar impresión de gastos"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-600" />
                {lang === 'es' ? 'Imprimir Gastos' : 'Print Expenses'}
              </button>
              <button
                onClick={handleExportCostsCSV}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                title="Exportar base de gastos detallada"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                {lang === 'es' ? 'Exportar CSV' : 'Export CSV'}
              </button>
            </>
          ) : (
            <>
              <button
                disabled
                className="px-3 py-1.5 bg-slate-50 text-slate-400 border border-slate-200 rounded-lg text-xs font-bold opacity-60 cursor-not-allowed flex items-center gap-1.5"
                title="Solo el Administrador de Hotel puede imprimir informes"
              >
                🔒 {lang === 'es' ? 'Imprimir Gastos' : 'Print Expenses'}
              </button>
              <button
                disabled
                className="px-3 py-1.5 bg-slate-50 text-slate-400 border border-slate-200 rounded-lg text-xs font-bold opacity-60 cursor-not-allowed flex items-center gap-1.5"
                title="Solo el Administrador de Hotel puede exportar reportes"
              >
                🔒 {lang === 'es' ? 'Exportar CSV' : 'Export CSV'}
              </button>
            </>
          )}
        </div>
      </div>

      {!canManageCosts && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 text-left">
          <AlertCircle className="w-5 h-5 text-amber-650 shrink-0" />
          <span>{t.restricted}</span>
        </div>
      )}

      {/* RENDER DUAL SPLIT INTERFACE */}
      {isDetailedActive ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* STAFF WAGES COMPONENT */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start pb-4 border-b border-slate-150 mb-4">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-500" />
                    {t.titlePersonnel}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">{t.descPersonnel}</p>
                </div>
                <span className="text-xs bg-slate-100 font-mono font-black text-slate-700 px-2 py-1 rounded-lg">
                  {personnelTotals.total.toLocaleString('es-ES')} €
                </span>
              </div>

              {/* Add form */}
              {canManageCosts && (
                <form onSubmit={handleAddEmployee} className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-3 text-left mb-6">
                  <div className="text-[10px] font-black text-indigo-700 uppercase tracking-wider mb-1">
                    [+] Nuevo registro de nómina
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">{t.thName}</label>
                      <input
                        type="text"
                        required
                        value={empName}
                        onChange={(e) => setEmpName(e.target.value)}
                        placeholder={t.placeholderEmployeeName}
                        className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">{t.thRole}</label>
                      <input
                        type="text"
                        value={empRole}
                        onChange={(e) => setEmpRole(e.target.value)}
                        placeholder={t.placeholderEmployeeRole}
                        className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">{t.thNetSalary} (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={empNet}
                        onChange={(e) => setEmpNet(e.target.value)}
                        placeholder="1600.00"
                        className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">{t.thSS} (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={empSS}
                        onChange={(e) => setEmpSS(e.target.value)}
                        placeholder="550.00"
                        className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg text-xs transition-all pointer-events-auto cursor-pointer shadow-sm hover:shadow"
                  >
                    {t.addEmployeeBtn}
                  </button>
                </form>
              )}

              {/* Workers list */}
              <div className="overflow-x-auto">
                {(!currentMonthlyData.employees || currentMonthlyData.employees.length === 0) ? (
                  <p className="text-slate-400 text-xs italic text-center py-6">{t.noEmployees}</p>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-150 text-slate-450 uppercase text-[9px] font-black tracking-wider">
                        <th className="py-2">{t.thName}</th>
                        <th className="py-2">{t.thRole}</th>
                        <th className="py-2 text-right">{t.thNetSalary}</th>
                        <th className="py-2 text-right">{t.thSS}</th>
                        <th className="py-2 text-right">{t.thTotal}</th>
                        <th className="py-2 text-center">{t.thActions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {currentMonthlyData.employees.map(emp => (
                        <tr key={emp.id} className="hover:bg-slate-50/50">
                          <td className="py-2 p-1 font-bold text-slate-800">{emp.name}</td>
                          <td className="py-2 text-slate-500">{emp.role}</td>
                          <td className="py-2 text-right font-mono text-slate-800">{emp.netSalary.toFixed(2)} €</td>
                          <td className="py-2 text-right font-mono text-slate-500">{emp.socialSecurity.toFixed(2)} €</td>
                          <td className="py-2 text-right font-mono font-bold text-indigo-700">{(emp.netSalary + emp.socialSecurity).toFixed(2)} €</td>
                          <td className="py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveEmployee(emp.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50"
                              disabled={!canManageCosts}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Direct self-employed base toggle cost */}
            <div className="bg-slate-50 p-4 border border-slate-150 rounded-xl mt-4 text-left">
              <span className="block text-[9px] uppercase font-bold text-slate-400">Autónomos y Dirección</span>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-slate-600 font-bold">{lang === 'es' ? 'Fijo Autónomos Mutua:' : 'Autonomics Direct Outflow:'}</span>
                <div className="relative w-32">
                  <span className="absolute left-2 top-1.5 text-[9px] font-mono text-slate-400">€</span>
                  <input
                    type="number"
                    disabled={!canManageCosts}
                    value={currentMonthlyData.autonomosOtros || ''}
                    placeholder="300"
                    onChange={(e) => handleUpdateLegacyField('autonomosOtros', parseFloat(e.target.value) || 0)}
                    className="w-full pl-5 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-extrabold text-slate-800 text-right focus:outline-none"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* OVERHEAD UTILITIES AND DIRECT INVOICES */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start pb-4 border-b border-slate-150 mb-4">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-rose-500" />
                    {t.titleOverheads}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">{t.descOverheads}</p>
                </div>
                <span className="text-xs bg-slate-100 font-mono font-black text-slate-700 px-2 py-1 rounded-lg">
                  {overheadTotals.total.toLocaleString('es-ES')} €
                </span>
              </div>

              {/* Quick Preset Buttons for Suministros */}
              {canManageCosts && (
                <div className="space-y-2 mb-4 text-left">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase">{t.presetsTitle}</label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAddOverhead('Internet', 'Fibra Óptica Vodafone Serramar', 59.90)}
                      className="px-2 py-1 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-150 text-indigo-700 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer"
                      title="Agregar: Fibra Óptica 59.90€"
                    >
                      📡 +Internet (59.90€)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddOverhead('Electricity', 'Recibo Iberdrola Luz Hostal', 385.00)}
                      className="px-2 py-1 bg-yellow-50/50 hover:bg-yellow-50 border border-yellow-250 text-yellow-700 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer"
                      title="Agregar: Luz Iberdrola 385.00€"
                    >
                      ⚡ +Luz Iberdrola (385€)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddOverhead('Water', 'Recibo Agua Acosol S.A.', 120.00)}
                      className="px-2 py-1 bg-blue-50/50 hover:bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer"
                      title="Agregar: Agua Acosol 120.00€"
                    >
                      💧 +Agua Acosol (120€)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddOverhead('Rent', 'Pago Alquiler Local Inmobiliaria', 1200.00)}
                      className="px-2 py-1 bg-teal-50/50 hover:bg-teal-50 border border-teal-200 text-teal-700 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer"
                      title="Agregar: Alquiler 1200.00€"
                    >
                      🏢 +Alquiler (1200€)
                    </button>
                  </div>
                </div>
              )}

              {/* Add form */}
              {canManageCosts && (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    let finalLabel = ovLabel;
                    if (selectedConcept && selectedConcept !== 'PERSONALIZADO') {
                      finalLabel = selectedConcept + (ovMemo.trim() ? ` (${ovMemo.trim()})` : '');
                    } else {
                      finalLabel = ovLabel.trim() || 'Gasto General';
                    }
                    handleAddOverhead(ovCategory, finalLabel, parseFloat(ovAmount));
                    setOvMemo('');
                    setOvLabel('');
                  }} 
                  className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-3 text-left mb-6"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">{t.thCategory}</label>
                      <select
                        value={ovCategory}
                        onChange={(e: any) => setOvCategory(e.target.value)}
                        className="w-full mt-1 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer focus:outline-none"
                      >
                        <option value="Internet">{t.internet}</option>
                        <option value="Electricity">{t.electricity}</option>
                        <option value="Water">{t.water}</option>
                        <option value="Rent">{t.rent}</option>
                        <option value="Insurance">{t.insurance}</option>
                        <option value="Taxes">{t.taxes}</option>
                        <option value="Marketing">{t.marketing}</option>
                        <option value="Other">{t.other}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">
                        {lang === 'es' ? 'Concepto Predefinido' : 'Predefined Concept'}
                      </label>
                      <select
                        value={selectedConcept}
                        onChange={(e) => setSelectedConcept(e.target.value)}
                        className="w-full mt-1 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer focus:outline-none"
                      >
                        {costConcepts.map((cp) => (
                          <option key={cp} value={cp}>{cp}</option>
                        ))}
                        <option value="PERSONALIZADO">✍️ {lang === 'es' ? 'Otro / Entrada Manual' : 'Custom / Manual Entry'}</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-1">
                    {selectedConcept === 'PERSONALIZADO' ? (
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase">{t.thConcept}</label>
                        <input
                          type="text"
                          required
                          value={ovLabel}
                          placeholder={lang === 'es' ? "Ej. Suministro Luz Mayo" : "e.g. Electricity Supply May"}
                          onChange={(e) => setOvLabel(e.target.value)}
                          className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase">
                          {lang === 'es' ? 'Referencia o Detalle Extra (Opcional)' : 'Reference or Memo Detail (Optional)'}
                        </label>
                        <input
                          type="text"
                          value={ovMemo}
                          placeholder={lang === 'es' ? "Ej. Factura #4901 o Mes de Junio" : "e.g. Invoice #4901 or June"}
                          onChange={(e) => setOvMemo(e.target.value)}
                          className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">{t.thDate}</label>
                      <input
                        type="date"
                        required
                        value={ovDate}
                        onChange={(e) => setOvDate(e.target.value)}
                        className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">{t.thAmount} (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={ovAmount}
                        placeholder="180.00"
                        onChange={(e) => setOvAmount(e.target.value)}
                        className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg text-xs transition-all pointer-events-auto cursor-pointer shadow-sm hover:shadow"
                  >
                    {t.addOverheadBtn}
                  </button>
                </form>
              )}

              {/* Overheads list */}
              <div className="overflow-x-auto">
                {(!currentMonthlyData.overheads || currentMonthlyData.overheads.length === 0) ? (
                  <p className="text-slate-400 text-xs italic text-center py-6">{t.noOverheads}</p>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-150 text-slate-450 uppercase text-[9px] font-black tracking-wider">
                        <th className="py-2">{t.thCategory}</th>
                        <th className="py-2">{t.thConcept}</th>
                        <th className="py-2 text-right">{t.thAmount}</th>
                        <th className="py-2 text-center">{t.thActions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {currentMonthlyData.overheads.map(ov => (
                        <tr key={ov.id} className="hover:bg-slate-50/50">
                          <td className="py-2 font-bold text-slate-800">
                            {ov.category === 'Internet' && '📡 Internet'}
                            {ov.category === 'Electricity' && '⚡ Luz'}
                            {ov.category === 'Water' && '💧 Agua'}
                            {ov.category === 'Rent' && '🏢 Alquiler'}
                            {ov.category === 'Insurance' && '🛡️ Seguro'}
                            {ov.category === 'Taxes' && ' Landmark Impuesto'}
                            {ov.category === 'Marketing' && '📢 Ads'}
                            {ov.category === 'Other' && '🛍️ Otros'}
                          </td>
                          <td className="py-2 text-slate-500 italic max-w-[150px] truncate" title={ov.label}>{ov.label}</td>
                          <td className="py-2 text-right font-mono font-black text-rose-700">-{ov.amount.toFixed(2)} €</td>
                          <td className="py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveOverhead(ov.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50"
                              disabled={!canManageCosts}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Quick stats grid breakdown */}
            <div className="bg-slate-50 p-4 border border-slate-150 rounded-xl mt-4 grid grid-cols-3 gap-3 text-left">
              <div>
                <span className="text-[9px] text-slate-400 font-bold block uppercase">{lang === 'es' ? 'SUMINISTROS' : 'UTILITIES'}</span>
                <span className="text-xs font-bold font-mono text-slate-700">{(overheadTotals.internet + overheadTotals.electricity + overheadTotals.water).toFixed(2)} €</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 font-bold block uppercase">{lang === 'es' ? 'ALQUILER / RENT' : 'RENT'}</span>
                <span className="text-xs font-bold font-mono text-slate-700">{overheadTotals.rent.toFixed(2)} €</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 font-bold block uppercase">{lang === 'es' ? 'SEGUROS & TASAS' : 'INS&TAX'}</span>
                <span className="text-xs font-bold font-mono text-slate-700">{(overheadTotals.insurance + overheadTotals.taxes).toFixed(2)} €</span>
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* LEGACY EDITING CARD FOR COMPATIBILITY */
        <div className="bg-white p-6 rounded-2xl border border-slate-200 text-left max-w-4xl mx-auto space-y-6 shadow-xs">
          <div>
            <span className="p-1 px-2 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 text-[10px] font-black uppercase tracking-wider">
              {t.legacyNotice}
            </span>
            <p className="mt-2 text-xs text-slate-500 leading-normal">
              Está visualizando el modo simple manual de fin de mes. En esta modalidad puede arrastrar y definir los costes operativos agregados de una sola vez para cuadrar cuentas rápidas sin agregar personal de plantilla ni suministros detallados.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Sueldos */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Neto Sueldos Empleados</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1.5 text-xs text-slate-400">€</span>
                <input
                  type="number"
                  disabled={!canManageCosts}
                  value={currentMonthlyData.empleadosSueldos || ''}
                  onChange={(e) => handleUpdateLegacyField('empleadosSueldos', parseFloat(e.target.value) || 0)}
                  className="w-full pl-6 pr-3 py-1.5 bg-slate-5 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                />
              </div>
            </div>

            {/* Seguridad Social */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Seguridad Social Directa</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1.5 text-xs text-slate-400">€</span>
                <input
                  type="number"
                  disabled={!canManageCosts}
                  value={currentMonthlyData.seguridadSocialEmpresa || ''}
                  onChange={(e) => handleUpdateLegacyField('seguridadSocialEmpresa', parseFloat(e.target.value) || 0)}
                  className="w-full pl-6 pr-3 py-1.5 bg-slate-5 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                />
              </div>
            </div>

            {/* Autónomos */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Autónomos y Dirección</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1.5 text-xs text-slate-400">€</span>
                <input
                  type="number"
                  disabled={!canManageCosts}
                  value={currentMonthlyData.autonomosOtros || ''}
                  onChange={(e) => handleUpdateLegacyField('autonomosOtros', parseFloat(e.target.value) || 0)}
                  className="w-full pl-6 pr-3 py-1.5 bg-slate-5 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                />
              </div>
            </div>

            {/* Suministros (Luz, agua, gas) */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Suministros (Agua / Luz)</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1.5 text-xs text-slate-400">€</span>
                <input
                  type="number"
                  disabled={!canManageCosts}
                  value={currentMonthlyData.suministrosDirectos || ''}
                  onChange={(e) => handleUpdateLegacyField('suministrosDirectos', parseFloat(e.target.value) || 0)}
                  className="w-full pl-6 pr-3 py-1.5 bg-slate-5 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                />
              </div>
            </div>

            {/* Seguros Hotel */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Seguros Mutuas Comercial</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1.5 text-xs text-slate-400">€</span>
                <input
                  type="number"
                  disabled={!canManageCosts}
                  value={currentMonthlyData.segurosHotel || ''}
                  onChange={(e) => handleUpdateLegacyField('segurosHotel', parseFloat(e.target.value) || 0)}
                  className="w-full pl-6 pr-3 py-1.5 bg-slate-5 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                />
              </div>
            </div>

            {/* Tasas e Impuestos */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Tasas e Impuestos Municipales</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1.5 text-xs text-slate-400">€</span>
                <input
                  type="number"
                  disabled={!canManageCosts}
                  value={currentMonthlyData.tasasImpuestos || ''}
                  onChange={(e) => handleUpdateLegacyField('tasasImpuestos', parseFloat(e.target.value) || 0)}
                  className="w-full pl-6 pr-3 py-1.5 bg-slate-5 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-center">
            <button
               type="button"
               disabled={!canManageCosts}
               onClick={() => setIsDetailedActive(true)}
               className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs hover:shadow transition-all cursor-pointer"
            >
              🚀 {lang === 'es' ? 'Activar Desglose Detallado Ahora' : 'Enable Itemized Detailed Cost Layout Now'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
