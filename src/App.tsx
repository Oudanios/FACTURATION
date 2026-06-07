/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Invoice, UserAccount, UserRole, ManualBookingFund, DetailedCosts, AppPermissionsConfig } from './types';
import { INITIAL_INVOICES, USER_ACCOUNTS, CATEGORIES, INITIAL_FUNDS, DEFAULT_PERMISSIONS } from './data';
import { Lang, TRANSLATIONS } from './translations';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import InvoiceManager from './components/InvoiceManager';
import ClientFacturation from './components/ClientFacturation';
import AdminPanel from './components/AdminPanel';
import MonthlyRecap from './components/MonthlyRecap';
import CompanyCosts from './components/CompanyCosts';
import { 
  Hotel, LogOut, LayoutDashboard, FileSpreadsheet, 
  Receipt, Settings, User, Calendar, Flame, Clock, CircleDollarSign 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Global Language State
  const [lang, setLang] = useState<Lang>(() => {
    const cached = localStorage.getItem('hotel_lang');
    return (cached as Lang) || 'es';
  });

  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const cached = localStorage.getItem('hotel_active_session');
    return cached ? JSON.parse(cached) : null;
  });

  // Active Tab State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'registry' | 'billing' | 'costs' | 'recap' | 'admin'>('dashboard');

  // Detailed Costs state per month
  const [detailedCosts, setDetailedCosts] = useState<{ [month: string]: DetailedCosts }>(() => {
    const cached = localStorage.getItem('hostal_detailed_monthly_costs');
    return cached ? JSON.parse(cached) : {};
  });

  // Permissions configuration state per role
  const [rolePermissions, setRolePermissions] = useState<AppPermissionsConfig>(() => {
    const cached = localStorage.getItem('hotel_role_permissions_config');
    return cached ? JSON.parse(cached) : DEFAULT_PERMISSIONS;
  });

  useEffect(() => {
    localStorage.setItem('hotel_role_permissions_config', JSON.stringify(rolePermissions));
  }, [rolePermissions]);


  // Invoices Master Records State
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const cached = localStorage.getItem('hotel_invoices_registry');
    return cached ? JSON.parse(cached) : INITIAL_INVOICES;
  });

  // Categories List State
  const [categoriesList, setCategoriesList] = useState(() => {
    const cached = localStorage.getItem('hotel_custom_categories');
    return cached ? JSON.parse(cached) : CATEGORIES;
  });

  // Team users State
  const [allUsers, setAllUsers] = useState<UserAccount[]>(() => {
    const cached = localStorage.getItem('hotel_all_users_accounts');
    return cached ? JSON.parse(cached) : USER_ACCOUNTS;
  });

  // Manual Booking & received Funds state
  const [funds, setFunds] = useState<ManualBookingFund[]>(() => {
    const cached = localStorage.getItem('hotel_manual_booking_funds');
    return cached ? JSON.parse(cached) : INITIAL_FUNDS;
  });

  // Dynamic cost concepts menu state defined by Admin
  const [costConcepts, setCostConcepts] = useState<string[]>(() => {
    const cached = localStorage.getItem('hostal_cost_concepts_menu');
    if (cached) return JSON.parse(cached);
    return [
      "Suministro Luz Iberdrola",
      "Consumo Agua Acosol S.A.",
      "Fibra Óptica Vodafone",
      "Renta Alquiler Edificio",
      "Seguro Multirriesgo Mapfre",
      "Limpieza Industrial Lavandería",
      "Mantenimiento Técnico Otis Ascensores",
      "Comisión Booking.com Ads",
      "Tasas Basura Ayuntamiento",
      "Material de Mantenimiento Hostal"
    ];
  });

  // Time Tracker
  const [timeStr, setTimeStr] = useState('');

  // Synchronize localStorage
  useEffect(() => {
    localStorage.setItem('hotel_invoices_registry', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('hotel_custom_categories', JSON.stringify(categoriesList));
  }, [categoriesList]);

  useEffect(() => {
    localStorage.setItem('hotel_all_users_accounts', JSON.stringify(allUsers));
  }, [allUsers]);

  useEffect(() => {
    localStorage.setItem('hotel_manual_booking_funds', JSON.stringify(funds));
  }, [funds]);

  useEffect(() => {
    localStorage.setItem('hostal_detailed_monthly_costs', JSON.stringify(detailedCosts));
  }, [detailedCosts]);

  useEffect(() => {
    localStorage.setItem('hostal_cost_concepts_menu', JSON.stringify(costConcepts));
  }, [costConcepts]);

  useEffect(() => {
    localStorage.setItem('hotel_lang', lang);
  }, [lang]);

  // Handle live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Login handler
  const handleLogin = (user: UserAccount) => {
    setCurrentUser(user);
    localStorage.setItem('hotel_active_session', JSON.stringify(user));
    // Default standard redirect depending on role
    if (user.role === 'VIEWER') {
      setActiveTab('dashboard');
    } else {
      setActiveTab('dashboard');
    }
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('hotel_active_session');
  };

  // -- CRUD handlers on Invoices --
  const handleAddInvoice = (newInv: Invoice) => {
    setInvoices(prev => [newInv, ...prev]);
  };

  const handleUpdateInvoice = (updatedInv: Invoice) => {
    setInvoices(prev => prev.map(item => item.id === updatedInv.id ? updatedInv : item));
  };

  const handleDeleteInvoice = (id: string) => {
    setInvoices(prev => prev.filter(item => item.id !== id));
  };

  // Register client compiled invoice as Outflow (SALIDA)
  const handleRegisterAsSalida = (newInv: Invoice) => {
    // Generate true index
    const maxOrigen = invoices.reduce((max, inv) => (inv.n_origen > max ? inv.n_origen : max), 0);
    const invoicePreparedProduct = {
      ...newInv,
      n_origen: maxOrigen + 1
    };
    handleAddInvoice(invoicePreparedProduct);
  };

  // -- Admin controls callbacks --
  const handleAddUser = (newUser: UserAccount) => {
    setAllUsers(prev => [...prev, newUser]);
  };

  const handleDeleteUser = (username: string) => {
    setAllUsers(prev => prev.filter(u => u.username !== username));
  };

  const handleAddCategory = (tipo: 'ENTRADA' | 'SALIDA', newCat: string) => {
    setCategoriesList((prev: any) => ({
      ...prev,
      [tipo]: [...prev[tipo], newCat].filter((v, i, self) => self.indexOf(v) === i)
    }));
  };

  const handleRemoveCategory = (tipo: 'ENTRADA' | 'SALIDA', catToRemove: string) => {
    setCategoriesList((prev: any) => ({
      ...prev,
      [tipo]: prev[tipo].filter((c: string) => c !== catToRemove)
    }));
  };

  // -- Dynamic Cost Concepts handlers --
  const handleAddCostConcept = (newConcept: string) => {
    setCostConcepts(prev => [...prev, newConcept].filter((v, i, self) => self.indexOf(v) === i));
  };

  const handleRemoveCostConcept = (conceptToRemove: string) => {
    setCostConcepts(prev => prev.filter(c => c !== conceptToRemove));
  };

  // Unified backup restores
  const handleImportAllData = (backup: {
    invoices?: Invoice[];
    funds?: ManualBookingFund[];
    detailedCosts?: { [month: string]: DetailedCosts };
    categoriesList?: { ENTRADA: string[]; SALIDA: string[] };
    costConcepts?: string[];
  }) => {
    if (backup.invoices) {
      setInvoices(backup.invoices);
      localStorage.setItem('hotel_invoices_registry', JSON.stringify(backup.invoices));
    }
    if (backup.funds) {
      setFunds(backup.funds);
      localStorage.setItem('hotel_manual_booking_funds', JSON.stringify(backup.funds));
    }
    if (backup.detailedCosts) {
      setDetailedCosts(backup.detailedCosts);
      localStorage.setItem('hostal_detailed_monthly_costs', JSON.stringify(backup.detailedCosts));
    }
    if (backup.categoriesList) {
      setCategoriesList(backup.categoriesList);
      localStorage.setItem('hotel_custom_categories', JSON.stringify(backup.categoriesList));
    }
    if (backup.costConcepts) {
      setCostConcepts(backup.costConcepts);
      localStorage.setItem('hostal_cost_concepts_menu', JSON.stringify(backup.costConcepts));
    }
  };

  // -- Manual funds handlers --
  const handleAddFund = (newFund: ManualBookingFund) => {
    setFunds(prev => [newFund, ...prev]);
  };

  const handleDeleteFund = (id: string) => {
    setFunds(prev => prev.filter(f => f.id !== id));
  };

  // Danger override setting - restoring to original CSV format
  const handleRestoreDefaults = () => {
    setInvoices(INITIAL_INVOICES);
    setCategoriesList(CATEGORIES);
    setAllUsers(USER_ACCOUNTS);
    setFunds(INITIAL_FUNDS);
    localStorage.setItem('hotel_invoices_registry', JSON.stringify(INITIAL_INVOICES));
    localStorage.setItem('hotel_custom_categories', JSON.stringify(CATEGORIES));
    localStorage.setItem('hotel_all_users_accounts', JSON.stringify(USER_ACCOUNTS));
    localStorage.setItem('hotel_manual_booking_funds', JSON.stringify(INITIAL_FUNDS));
  };

  // ── Import bookings from SERAMAR database via API ──────────────────────────
  const [importingSeramar, setImportingSeramar] = useState(false);
  const [importSeramarStatus, setImportSeramarStatus] = useState<string | null>(null);

  const handleImportFromSeramar = async () => {
    if (!currentUser || currentUser.role !== 'ADMIN') return;
    setImportingSeramar(true);
    setImportSeramarStatus(null);
    try {
      const res = await fetch('https://serramaradmin.site/api/public/bookings?type=cash,tpv');
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error de servidor' }));
        setImportSeramarStatus(`Error: ${err.error || res.statusText}`);
        return;
      }
      const data: any[] = await res.json();
      if (data.length === 0) {
        setImportSeramarStatus('No se encontraron reservas nuevas en SERAMAR.');
        return;
      }
      // Merge — avoid duplicates by id
      setFunds(prev => {
        const existingIds = new Set(prev.map(f => f.id));
        const newFunds = data.filter(f => !existingIds.has(f.id));
        const merged = [...newFunds, ...prev];
        localStorage.setItem('hotel_manual_booking_funds', JSON.stringify(merged));
        return merged;
      });
      setImportSeramarStatus(`✓ ${data.length} reservas importadas de SERAMAR.`);
    } catch {
      setImportSeramarStatus('No se pudo conectar con la API. Comprueba que el servidor está activo.');
    } finally {
      setImportingSeramar(false);
    }
  };

  const activeRoleLabel = useMemo(() => {
    if (!currentUser) return '';
    switch (currentUser.role) {
      case 'ADMIN': return 'Director Ejecutivo (Admin)';
      case 'MANAGER': return 'Gerente Operativo (Manager)';
      case 'USER': return 'Operador Auxiliar (User)';
      default: return 'Auditor Externo (Viewer)';
    }
  }, [currentUser]);

  const activeRoleBadgeStyle = useMemo(() => {
    if (!currentUser) return '';
    switch (currentUser.role) {
      case 'ADMIN': return 'bg-rose-100 text-rose-700 border border-rose-200';
      case 'MANAGER': return 'bg-amber-100 text-amber-700 border border-amber-200';
      case 'USER': return 'bg-teal-100 text-teal-700 border border-teal-200';
      default: return 'bg-slate-100 text-slate-600 border border-slate-200';
    }
  }, [currentUser]);

  // If there's no auth session active, render Login
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLogin} lang={lang} onLangChange={setLang} />;
  }

  const t = TRANSLATIONS[lang];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col antialiased selection:bg-indigo-100 selection:text-indigo-800">
      
      {/* PROFESSIONAL UPPER HEADER RAIL */}
      <header className="bg-slate-900 text-white border-b border-slate-950 px-4 sm:px-6 py-4 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Logo and branding title */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md cursor-default">
              <Hotel className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wider uppercase leading-none">
                {t.hostalTitle}
              </h1>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                {t.hostalSubtitle}
              </span>
            </div>
          </div>

          {/* Dynamic real-time metrics & helpers in head */}
          <div className="flex items-center gap-4 text-xs text-slate-300">
            {/* Header Language selection */}
            <div className="flex items-center bg-slate-950 px-1.5 py-0.5 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setLang('es')}
                className={`px-2 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                  lang === 'es' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                🇪🇸 ES
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                  lang === 'en' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                🇺🇸 EN
              </button>
              <button
                type="button"
                onClick={() => setLang('fr')}
                className={`px-2 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                  lang === 'fr' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                🇫🇷 FR
              </button>
            </div>

            <div className="hidden lg:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 font-mediumSB">
              <Flame className="w-4 h-4 text-orange-400 font-extrabold" />
              <span>{t.cajaDeHoy}</span>
            </div>

            <div className="hidden md:flex items-center gap-2 text-slate-400">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span className="font-mono tracking-wider text-slate-200 font-semibold">{timeStr || '18:59'} {t.clockPrefix}</span>
            </div>
          </div>

          {/* User badge and Log Out */}
          <div className="flex items-center gap-3.5 pl-4 border-l border-slate-800/85">
            <div className="text-right">
              <span className="text-slate-100 font-extrabold text-xs block truncate max-w-[130px]" title={currentUser.name}>
                {currentUser.name}
              </span>
              <span className={`px-2 py-0.2 rounded border text-[9px] font-black inline-block mt-0.5 tracking-wider ${activeRoleBadgeStyle}`}>
                {currentUser.role}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="p-2.5 bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-450 border border-slate-800 hover:border-rose-900/40 rounded-xl transition-all cursor-pointer"
              title={t.logoutTitle}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* TABS SELECTOR CONTAINER GRID */}
      <nav className="bg-white border-b border-slate-200 py-1.5 px-4 sticky top-[72px] z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex overflow-x-auto whitespace-nowrap gap-1.5 text-xs font-semibold">
          {/* TAB 1: Dashboard */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100 font-bold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            {t.tabDashboard}
          </button>

          {/* TAB 2: Book Tracking Entry/Exits */}
          <button
            onClick={() => setActiveTab('registry')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'registry'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            {t.tabRegistry}
          </button>

          {/* TAB 3: Client workspace */}
          <button
            onClick={() => setActiveTab('billing')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'billing'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-4 h-4" />
            {t.tabBilling}
          </button>

          {/* TAB 3.5: Company Costs workspace */}
          <button
            onClick={() => setActiveTab('costs')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'costs'
                ? 'bg-indigo-600 text-white shadow-sm font-bold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 text-rose-500" />
            {t.tabCosts}
          </button>

          {/* TAB 4: Monthly manual funds recap & audit (TPV, Cash & Others) */}
          <button
            onClick={() => setActiveTab('recap')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'recap'
                ? 'bg-indigo-600 text-white shadow-sm font-bold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <CircleDollarSign className="w-4 h-4" />
            {t.tabRecap}
          </button>

          {/* TAB 5: Admin Control Panel */}
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            {t.tabAdmin}
            {currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPPORT' && <span className="text-[9px] uppercase font-bold text-slate-400">🔒 Lock</span>}
          </button>
        </div>
      </nav>

      {/* CORE FRAMEWORK WORKSPACE */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Banner notification depending on Viewer mode */}
        {currentUser.role === 'VIEWER' && (
          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-800 leading-normal font-semibold flex items-center gap-2">
            <span>🛡️</span>
            <span>{t.viewerWarning}</span>
          </div>
        )}

        {/* Tab switcher renderer */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 7 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -7 }}
            transition={{ duration: 0.16 }}
            className="focus:outline-none"
          >
            {activeTab === 'dashboard' && (
              <Dashboard invoices={invoices} funds={funds} lang={lang} detailedCosts={detailedCosts} />
            )}

            {activeTab === 'registry' && (
              <InvoiceManager
                invoices={invoices}
                currentUser={currentUser}
                onAddInvoice={handleAddInvoice}
                onUpdateInvoice={handleUpdateInvoice}
                onDeleteInvoice={handleDeleteInvoice}
                onFacturaSelectForBill={() => setActiveTab('billing')}
                lang={lang}
              />
            )}

            {activeTab === 'billing' && (
              <ClientFacturation
                currentUser={currentUser}
                onRegisterAsSalida={handleRegisterAsSalida}
                onRedirectToRegistry={() => setActiveTab('registry')}
                lang={lang}
              />
            )}

            {activeTab === 'costs' && (
              <CompanyCosts
                currentUser={currentUser}
                detailedCosts={detailedCosts}
                onUpdateDetailedCosts={setDetailedCosts}
                costConcepts={costConcepts}
                lang={lang}
              />
            )}

            {activeTab === 'recap' && (
              <MonthlyRecap
                currentUser={currentUser}
                invoices={invoices}
                funds={funds}
                onAddFund={handleAddFund}
                onDeleteFund={handleDeleteFund}
                lang={lang}
                detailedCosts={detailedCosts}
                onUpdateDetailedCosts={setDetailedCosts}
                userPermissions={rolePermissions[currentUser.role]}
                onRedirectToCosts={() => setActiveTab('costs')}
              />
            )}

            {activeTab === 'admin' && (
              <AdminPanel
                currentUser={currentUser}
                allUsers={allUsers}
                categories={categoriesList}
                onAddUser={handleAddUser}
                onDeleteUser={handleDeleteUser}
                onAddCategory={handleAddCategory}
                onRemoveCategory={handleRemoveCategory}
                onRestoreDefaults={handleRestoreDefaults}
                rolePermissions={rolePermissions}
                onUpdateRolePermissions={setRolePermissions}
                lang={lang}
                invoices={invoices}
                funds={funds}
                detailedCosts={detailedCosts}
                costConcepts={costConcepts}
                onAddCostConcept={handleAddCostConcept}
                onRemoveCostConcept={handleRemoveCostConcept}
                onImportAllData={handleImportAllData}
                onImportFromSeramar={handleImportFromSeramar}
                importingSeramar={importingSeramar}
                importSeramarStatus={importSeramarStatus}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ELEGANT DISCRETE FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 text-center mt-12 text-[11px] text-slate-500 tracking-wide font-sans">
        <p className="font-semibold text-slate-500">
          Hostal Serramar Facturation Engine v2.0
        </p>
        <p className="mt-1 text-slate-400">
          {t.footerText}
        </p>
      </footer>

    </div>
  );
}
