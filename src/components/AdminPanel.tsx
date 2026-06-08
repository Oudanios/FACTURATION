/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { UserAccount, UserRole, AppPermissionsConfig, RolePermissions, Invoice, ManualBookingFund, DetailedCosts } from '../types';
import { USER_ACCOUNTS } from '../data';
import { 
  ShieldAlert, UserPlus, Trash, Plus, Check, Settings, 
  Database, HelpCircle, HardDriveDownload, AlertOctagon, RefreshCcw, Shield, Key,
  FileSpreadsheet, ClipboardList, RefreshCw
} from 'lucide-react';
import { Lang, TRANSLATIONS } from '../translations';

interface AdminPanelProps {
  currentUser: UserAccount;
  allUsers: UserAccount[];
  categories: { ENTRADA: string[]; SALIDA: string[] };
  onAddUser: (user: UserAccount) => void;
  onDeleteUser: (username: string) => void;
  onAddCategory: (tipo: 'ENTRADA' | 'SALIDA', newCat: string) => void;
  onRemoveCategory: (tipo: 'ENTRADA' | 'SALIDA', catToRemove: string) => void;
  onRestoreDefaults: () => void;
  rolePermissions: AppPermissionsConfig;
  onUpdateRolePermissions: React.Dispatch<React.SetStateAction<AppPermissionsConfig>>;
  lang: Lang;
  // Dynamic exports / imports & cost concepts menu:
  invoices?: Invoice[];
  funds?: ManualBookingFund[];
  detailedCosts?: { [month: string]: DetailedCosts };
  costConcepts?: string[];
  onAddCostConcept?: (newConcept: string) => void;
  onRemoveCostConcept?: (conceptToRemove: string) => void;
  onImportAllData?: (backup: any) => void;
  onImportFromSeramar?: () => void;
  importingSeramar?: boolean;
  importSeramarStatus?: string | null;
}

export default function AdminPanel({
  currentUser,
  allUsers,
  categories,
  onAddUser,
  onDeleteUser,
  onAddCategory,
  onRemoveCategory,
  onRestoreDefaults,
  rolePermissions,
  onUpdateRolePermissions,
  lang,
  invoices = [],
  funds = [],
  detailedCosts = {},
  costConcepts = [],
  onAddCostConcept,
  onRemoveCostConcept,
  onImportAllData,
  onImportFromSeramar,
  importingSeramar = false,
  importSeramarStatus = null
}: AdminPanelProps) {
  const t = TRANSLATIONS[lang];
  
  // Guard access screen if neither ADMIN nor SUPPORT is logged in
  const hasAccess = currentUser.role === 'ADMIN' || currentUser.role === 'SUPPORT';
  const isAdmin = currentUser.role === 'ADMIN';

  // Extract precise granular rights permissions
  const permissions: Partial<RolePermissions> = rolePermissions[currentUser.role] || {
    manageManualFunds: isAdmin,
    manageDetailedCosts: isAdmin,
    editUsers: isAdmin,
    deleteUsers: isAdmin,
    configSystem: isAdmin
  };

  const canEditUsers = isAdmin || !!permissions.editUsers;
  const canDeleteUsers = isAdmin || !!permissions.deleteUsers;
  const canConfigSystem = isAdmin || !!permissions.configSystem;

  // Form State for new user
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('USER');
  const [newPassword, setNewPassword] = useState('');
  const [userSuccessMessage, setUserSuccessMessage] = useState('');

  // Form State for new category
  const [catType, setCatType] = useState<'ENTRADA' | 'SALIDA'>('ENTRADA');
  const [newCategoryName, setNewCategoryName] = useState('');

  // Form State for dynamic concept menu
  const [newCostConceptName, setNewCostConceptName] = useState('');
  const [backupImportError, setBackupImportError] = useState('');
  const [backupImportSuccess, setBackupImportSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings State
  const [hotelTitle, setHotelTitle] = useState('Hostal Serramar Benalmádena');
  const [defaultIva, setDefaultIva] = useState(10);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Handle adding user
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditUsers) {
      alert(lang === 'es' ? 'Acceso denegado: No tiene permisos suficientes para crear empleados.' : lang === 'fr' ? 'Accès refusé: permissions insuffisantes.' : 'Access denied: Insufficient privileges.');
      return;
    }

    if (!newUsername.trim() || !newPassword.trim() || !newName.trim()) {
      alert(lang === 'es' ? 'Por favor llene todos los campos' : lang === 'fr' ? 'Veuillez remplir tous les champs' : 'Please fill all fields');
      return;
    }

    const exists = allUsers.some(u => u.username.toLowerCase() === newUsername.toLowerCase());
    if (exists) {
      alert(lang === 'es' ? 'Ese nombre de usuario ya se encuentra registrado.' : lang === 'fr' ? "Cet utilisateur existe déjà." : 'That username is already registered.');
      return;
    }

    const newUser: UserAccount = {
      username: newUsername.trim().toLowerCase(),
      name: newName.trim(),
      role: newRole,
      password: newPassword
    };

    onAddUser(newUser);
    setUserSuccessMessage(lang === 'es' ? `El empleado ${newName} ha sido registrado como ${newRole}.` : lang === 'fr' ? `L’employé ${newName} a été enregistré comme ${newRole}.` : `Employee ${newName} registered as ${newRole}.`);
    
    // reset form fields
    setNewUsername('');
    setNewName('');
    setNewPassword('');
    setTimeout(() => setUserSuccessMessage(''), 3000);
  };

  // Handle adding custom category
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canConfigSystem) {
      alert(lang === 'es' ? 'Acceso denegado: No tiene permisos suficientes para modificar categorías.' : 'Access denied: Insufficient privileges.');
      return;
    }
    if (!newCategoryName.trim()) return;

    onAddCategory(catType, newCategoryName.trim());
    setNewCategoryName('');
  };

  // NEW: Dynamic Cost Concept Add Callback
  const handleCreateCostConcept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canConfigSystem) {
      alert(lang === 'es' ? 'Acceso restringido a administradores' : 'Restricted to Administrators');
      return;
    }
    if (!newCostConceptName.trim()) return;
    if (onAddCostConcept) {
      onAddCostConcept(newCostConceptName.trim());
    }
    setNewCostConceptName('');
  };

  // Unified dynamic JSON exporter
  const handleExportAllBackup = () => {
    if (!isAdmin) {
      alert(lang === 'es' ? 'Solo el Administrador Principal (ADMIN) tiene permisos para exportar la base de datos.' : 'Only the primary Administrator is permitted to export backing databases.');
      return;
    }

    const backupObj = {
      invoices,
      funds,
      detailedCosts,
      categoriesList: categories,
      costConcepts,
      exportedAt: new Date().toISOString(),
      metadata: { Version: '2.0', source: 'Hostal Serramar Database Backup' }
    };

    try {
      const dataStr = JSON.stringify(backupObj, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `facturas_hostal_serramar_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert(lang === 'es' ? 'Error al empaquetar la base de datos' : 'Export failed');
    }
  };

  // Unified dynamic JSON uploader
  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) {
      alert(lang === 'es' ? 'Acceso restringido: Solo el ADMIN puede importar copias de seguridad.' : 'Only ADMIN is allowed to import backups.');
      return;
    }

    const files = e.target.files;
    if (!files || files.length === 0) return;

    setBackupImportError('');
    setBackupImportSuccess('');

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Standard structural validator
        if (!parsed.invoices && !parsed.funds && !parsed.detailedCosts) {
          setBackupImportError(lang === 'es' ? 'Formato inválido. El archivo JSON no tiene elementos de facturación compatibles.' : 'Incorrect file structure: missing backing arrays.');
          return;
        }

        if (onImportAllData) {
          onImportAllData(parsed);
          setBackupImportSuccess(lang === 'es' 
            ? `¡Importación exitosa! Se cargaron ${parsed.invoices?.length || 0} facturas, ${parsed.funds?.length || 0} registros de caja y ${parsed.costConcepts?.length || 0} conceptos.` 
            : `Success! Restored master elements correctly.`
          );
          if (fileInputRef.current) fileInputRef.current.value = '';
        } else {
          setBackupImportError('Callback mapping failure in main app context wrapper.');
        }
      } catch (err) {
        setBackupImportError(lang === 'es' ? 'Error al leer el archivo JSON. Verifique la sintaxis.' : 'Malformed file syntax.');
      }
    };
    reader.readAsText(file);
  };

  // Access denial screen rendering
  if (!hasAccess) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-2xl mx-auto text-center space-y-6">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-slate-800">{t.adminRestrictedTitle}</h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
            {t.adminRestrictedSub} Su cuenta actual está registrada como <span className="font-bold text-indigo-600">({currentUser.name})</span> con rol <span className="font-bold text-amber-600">[{currentUser.role}]</span>.
          </p>
        </div>

        <p className="text-[10px] text-slate-400 mt-3">{t.adminRestrictedTips}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      
      {/* Title block */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-600" />
          {t.adminTitle}
        </h3>
        <p className="text-xs text-slate-500">{t.adminSubtitle}</p>
      </div>

      {/* Main Grid: Accounts & Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* COL 1: Employees manager */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <UserPlus className="w-4.5 h-4.5 text-indigo-500" />
            {t.adminAccountsTitle}
          </h4>

          {/* New employee registration form */}
          {!canEditUsers && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-xl text-[11px] font-semibold text-left">
              🔒 No tiene privilegios para dar de alta o modificar cuentas de empleados.
            </div>
          )}

          <form onSubmit={handleCreateUser} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <fieldset disabled={!canEditUsers} className="space-y-3 text-left">
              <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">{t.adminFormReg}</span>
              
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="text"
                  placeholder={t.adminInputName}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />

                <input
                  type="text"
                  placeholder={t.adminInputUser}
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="text"
                  placeholder={t.adminInputPass}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                />

                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs cursor-pointer"
                >
                  <option value="ADMIN">ADMIN ({t.adminPresetAdmin})</option>
                  <option value="MANAGER">MANAGER ({t.adminPresetManager})</option>
                  <option value="SUPPORT">SUPPORT (Soporte Técnico)</option>
                  <option value="USER">USER ({t.adminPresetUser})</option>
                  <option value="VIEWER">VIEWER ({t.adminPresetViewer})</option>
                </select>
              </div>

              {userSuccessMessage && (
                <p className="text-emerald-600 text-xs font-semibold py-1 flex items-center gap-1"><Check className="w-4 h-4" /> {userSuccessMessage}</p>
              )}

              <button
                type="submit"
                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow shadow-indigo-500/15 transition-all cursor-pointer"
              >
                {t.adminBtnReg}
              </button>
            </fieldset>
          </form>

          {/* List Of registered team accounts */}
          <div className="space-y-2">
            <span className="block text-[10px] font-bold text-slate-400 text-left uppercase tracking-wider">{t.adminAccountsTitle} ({allUsers.length})</span>
            <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
              {allUsers.map((u) => {
                const isPreset = u.username === 'admin' || u.username === 'kristian' || u.username === 'rabi';
                return (
                  <div key={u.username} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="text-left">
                      <p className="font-bold text-slate-800">{u.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {lang === 'es' ? 'Usuario' : lang === 'fr' ? 'Utilisateur' : 'User'}: <span className="font-mono font-medium">{u.username}</span> | Pass: <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{u.password}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wider ${
                        u.role === 'ADMIN' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                        u.role === 'MANAGER' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        u.role === 'SUPPORT' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                        u.role === 'USER' ? 'bg-teal-50 text-teal-700 border border-teal-100' : 'bg-slate-50 text-slate-500 border border-slate-100'
                      }`}>
                        {u.role}
                      </span>

                      {!isPreset && canDeleteUsers && (
                        <button
                          onClick={() => {
                            const msg = lang === 'es' ? `¿Seguro que desea eliminar el usuario de ${u.name}?` : lang === 'fr' ? `Voulez-vous vraiment supprimer l'utilisateur ${u.name} ?` : `Are you sure you want to delete user ${u.name}?`;
                            if (window.confirm(msg)) {
                              onDeleteUser(u.username);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                          title="Eliminar usuario"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* COL 2: Dynamic Category Management */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Database className="w-4.5 h-4.5 text-indigo-500" />
            {t.adminCatTitle}
          </h4>

          {!canConfigSystem && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-xl text-[11px] font-semibold text-left">
              🔒 No tiene privilegios para modificar parámetros de categorías.
            </div>
          )}

          <form onSubmit={handleCreateCategory} className="flex gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <fieldset disabled={!canConfigSystem} className="flex gap-2 w-full">
              <select
                value={catType}
                onChange={(e) => setCatType(e.target.value as any)}
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
              >
                <option value="ENTRADA">ENTRADA (Gasto)</option>
                <option value="SALIDA">SALIDA (Ingreso)</option>
              </select>

              <input
                type="text"
                placeholder={t.adminCatName}
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                required
              />

              <button
                type="submit"
                className="p-1 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold leading-none cursor-pointer flex items-center transition-all"
              >
                <Plus className="w-4.5 h-4.5" />
              </button>
            </fieldset>
          </form>

          {/* Table display of current categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1.5 text-left">
            {/* ENTRADAS Categories */}
            <div className="space-y-2 p-3 bg-rose-50/20 border border-rose-100 rounded-xl">
              <span className="font-bold text-rose-700 block text-[10px] uppercase tracking-wider">
                {lang === 'es' ? 'Entradas (Gasto / Proveedores)' : lang === 'fr' ? 'Entrées (Charges)' : 'Supplier Outflows (Expenses)'}
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {categories.ENTRADA.map(cat => (
                  <div key={cat} className="flex items-center justify-between py-1 border-b border-fold border-slate-100/50">
                    <span className="text-slate-600 font-medium">{cat}</span>
                    {canConfigSystem && (
                      <button
                        onClick={() => onRemoveCategory('ENTRADA', cat)}
                        className="text-slate-400 hover:text-rose-600 font-bold transition-all cursor-pointer"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* SALIDAS Categories */}
            <div className="space-y-2 p-3 bg-green-50/20 border border-green-100 rounded-xl">
              <span className="font-bold text-green-700 block text-[10px] uppercase tracking-wider">
                {lang === 'es' ? 'Salidas (Ingreso / Caja)' : lang === 'fr' ? 'Sorties (Revenus)' : 'Receivables Inflows (Incomes)'}
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {categories.SALIDA.map(cat => (
                  <div key={cat} className="flex items-center justify-between py-1 border-b border-fold border-slate-100/50">
                    <span className="text-slate-600 font-medium">{cat}</span>
                    {canConfigSystem && (
                      <button
                        onClick={() => onRemoveCategory('SALIDA', cat)}
                        className="text-slate-400 hover:text-rose-600 font-bold transition-all cursor-pointer"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN AVANZADA DE FINANZAS, CONCEPTOS Y COPIAS DE SEGURIDAD */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* COL A: CONCEPTOS DE GASTO PREDEFINIDOS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2 text-left">
            <ClipboardList className="w-4.5 h-4.5 text-rose-500" />
            {lang === 'es' ? 'Menú de Conceptos de Gastos' : lang === 'fr' ? 'Concept de Charges Prédéfinis' : 'Registered Cost Concepts Menu'}
          </h4>

          <p className="text-xs text-slate-500 text-left">
            {lang === 'es' ? 'Defina los conceptos repetitivos del hotel para que aparezcan automáticamente como menú desplegable al rellenar los Gastos de Empresa.' 
            : lang === 'fr' ? "Définissez les concepts récurrents de l'hôtel pour qu'ils s'affichent automatiquement dans le menu déroulant des charges."
            : 'Configure recurring overhead templates to automatically populate the dropdown options in the operational Costs tab.'}
          </p>

          {!canConfigSystem && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-xl text-[11px] font-semibold text-left">
              🔒 Solo Administradores pueden editar la lista de conceptos.
            </div>
          )}

          <form onSubmit={handleCreateCostConcept} className="flex gap-2">
            <input
              type="text"
              placeholder={lang === 'es' ? 'Ej. Mantenimiento Ascensor, Suministro Endesa...' : lang === 'fr' ? 'Ex: Entretien Ascenseur...' : 'e.g. Pool Maintenance, Wifi Fiber...'}
              value={newCostConceptName}
              onChange={(e) => setNewCostConceptName(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              required
              disabled={!canConfigSystem}
            />
            <button
              type="submit"
              disabled={!canConfigSystem}
              className="px-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'es' ? 'Añadir' : lang === 'fr' ? 'Ajouter' : 'Add'}</span>
            </button>
          </form>

          {/* LIST OF THE CONCEPTS WITH TRASH ACTION */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="block text-[10px] font-extrabold text-slate-400 text-left uppercase tracking-wider mb-2">
              {lang === 'es' ? 'Conceptos Disponibles' : lang === 'fr' ? 'Concepts Enregistrés' : 'Configured Concept Dropdown Options'} ({costConcepts.length})
            </span>
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {costConcepts.map((concept) => (
                <div key={concept} className="flex items-center justify-between py-1.5 px-2 hover:bg-white rounded transition-colors text-xs text-left">
                  <span className="text-slate-700 font-medium">{concept}</span>
                  {canConfigSystem && onRemoveCostConcept && (
                    <button
                      onClick={() => {
                        const confirmMsg = lang === 'es' ? `¿Desea eliminar "${concept}" de las opciones del menú?` : `Remove "${concept}" from dropdown options?`;
                        if (window.confirm(confirmMsg)) {
                          onRemoveCostConcept(concept);
                        }
                      }}
                      className="p-1 px-2 text-slate-400 hover:text-red-650 transition-colors cursor-pointer text-sm font-bold"
                      title="Eliminar de las opciones"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {costConcepts.length === 0 && (
                <p className="text-[11px] text-slate-400 italic py-2 text-center">
                  {lang === 'es' ? 'No hay conceptos. Se usará entrada libre en la pestaña de costes.' : 'No concepts configured. Fallback to free input mode.'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* COL B: BACKUPS & SYSTEM DATABASES */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2 text-left">
            <Database className="w-4.5 h-4.5 text-indigo-650" />
            {lang === 'es' ? 'Copias de Seguridad y Migraciones' : lang === 'fr' ? 'Sauvegardes et Migrations' : 'Master Database Backups & Migrations'}
          </h4>

          <p className="text-xs text-slate-500 text-left leading-relaxed">
            {lang === 'es' ? 'Descargue respaldos consolidados de toda la base de datos o restaure copias de seguridad anteriores (formato JSON) al instante.'
            : lang === 'fr' ? "Téléchargez des sauvegardes consolidées ou restaurez d'anciennes versions (au format JSON) instantanément."
            : 'Download consolidated master dataset snapshots or instantly restore historical backups (JSON files) securely.'}
          </p>

          {!isAdmin ? (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs font-semibold space-y-1.5 text-left leading-normal">
              <p className="flex items-center gap-1 text-[11px]">
                <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{lang === 'es' ? 'MÓDULO RESTRINGIDO A DIRECCIÓN' : 'EXECUTIVE RESTRICTED MODULE'}</span>
              </p>
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                {lang === 'es' ? 'Solo las cuentas con el rol ejecutivo (ADMIN) tienen permitido descargar bases de datos, importar ficheros o imprimir reportes maestros.' 
                : 'Only accounts authorized under the ADMIN executive profile are cleared to export snapshots or perform filesystem restorations.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              {/* EXPORT SNAPSHOT ELEMENT */}
              <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2 text-left">
                <span className="block text-[10px] font-extrabold text-indigo-700 uppercase tracking-wide">
                  {lang === 'es' ? 'Exportar Copia Maestra' : 'Generate Master Snapshot'}
                </span>
                <p className="text-[11px] text-slate-500">
                  {lang === 'es' ? 'Crea un archivo JSON único con todas las facturas, costes de personal y arqueos de reservas.' : 'Generates a single self-contained JSON file containing entire hotel ledgers.'}
                </p>
                <button
                  type="button"
                  onClick={handleExportAllBackup}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <HardDriveDownload className="w-4 h-4" />
                  <span>{lang === 'es' ? 'Descargar Respaldo General (.json)' : 'Download Database Backup (.json)'}</span>
                </button>
              </div>

              {/* IMPORT FILE ELEMENT */}
              <div className="p-3 bg-emerald-55/10 border border-emerald-250 rounded-xl space-y-2 text-left">
                <span className="block text-[10px] font-extrabold text-emerald-700 uppercase tracking-wide">
                  {lang === 'es' ? 'Importar Copia de Seguridad' : 'Restore from Backup file'}
                </span>
                <p className="text-[11px] text-slate-500">
                  {lang === 'es' ? 'ADVERTENCIA: Cargar un archivo de respaldo reemplazará los datos actuales y actualizará el almacenamiento.' : 'WARNING: Restoring will overwrite all contemporary filesystems in browser.'}
                </p>

                <input
                  type="file"
                  accept=".json"
                  ref={fileInputRef}
                  onChange={handleImportBackupFile}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-slate-950"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{lang === 'es' ? 'Seleccionar archivo y restaurar' : 'Upload backup JSON and overwrite'}</span>
                </button>

                {backupImportError && (
                  <p className="text-rose-650 text-[10px] font-bold text-center mt-1 leading-normal">❌ {backupImportError}</p>
                )}
                {backupImportSuccess && (
                  <p className="text-emerald-700 text-[10px] font-bold text-center mt-1 leading-normal">✅ {backupImportSuccess}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* NEW: GRANULAR INTERACTIVE ROLE PERMISSIONS CONFIGURATION */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-3.5 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-2 text-left">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-800">
                {lang === 'es' ? 'Panel de Control de Permisos por Rol Ocupacional' : lang === 'fr' ? "Règles d'accès et Permissions par Rôle" : 'Dynamic Role-based Security Policies & Access Controls'}
              </h4>
              <p className="text-[10px] text-slate-400">
                {lang === 'es' ? 'Configure de manera interactiva qué privilegios operativos y de seguridad tiene asignado cada rol en el Hostal.' : 'Directly toggle operational permissions and functional execution rules for each staff profile.'}
              </p>
            </div>
          </div>
          <span className="text-[9px] uppercase font-bold tracking-widest px-2 py-0.8 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
            {lang === 'es' ? 'Directivas Activas' : 'Active Policies'}
          </span>
        </div>

        {/* Permissions Grid Display */}
        <div className="overflow-x-auto">
          <table className="w-full text-left table-auto border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                <th className="p-3 pl-4">{lang === 'es' ? 'Atribución Operativa' : lang === 'fr' ? 'Action / Privilège' : 'Functional System Privilege'}</th>
                <th className="p-3 text-center">ADMIN</th>
                <th className="p-3 text-center">MANAGER</th>
                <th className="p-3 text-center">SUPPORT</th>
                <th className="p-3 text-center">USER</th>
                <th className="p-3 text-center">VIEWER</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-left">
              {[
                { key: 'manageManualFunds', label: lang === 'es' ? 'Ingresar o Eliminar Registro de Fondos Manuales (Boveda/TPV)' : 'Add, Edit or Remove Manual Funds Registry' },
                { key: 'manageDetailedCosts', label: lang === 'es' ? 'Editar costes mensuales de explotación (Sueldos, Suministros, Tasas, Seguros, Costes Extra)' : 'Modify monthly fixed & variable company costs (Wages, Utilities, Extras)' },
                { key: 'editUsers', label: lang === 'es' ? 'Añadir o dar de alta nuevos empleados y asignarles credenciales' : 'Register and save new employee accounts & login access' },
                { key: 'deleteUsers', label: lang === 'es' ? 'Dar de baja empleados (Eliminar del listado activo)' : 'Permanently remove or revoke team access login records' },
                { key: 'configSystem', label: lang === 'es' ? 'Configurar tasas de IVA, marcas del hotel, crear categorías y Restaurar Datos' : 'Configure global VAT rates, brand variables, categories & factory reset' }
              ].map((perm) => (
                <tr key={perm.key} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-3 pl-4 font-semibold text-slate-700 leading-normal">{perm.label}</td>
                  {['ADMIN', 'MANAGER', 'SUPPORT', 'USER', 'VIEWER'].map((role) => {
                    const typedRole = role as UserRole;
                    const rPerms = rolePermissions[typedRole] || { manageManualFunds: false, manageDetailedCosts: false, editUsers: false, deleteUsers: false, configSystem: false };
                    const isChecked = !!rPerms[perm.key as keyof RolePermissions];
                    const isDisabled = !isAdmin || typedRole === 'ADMIN'; // ADMIN permissions are unmodifiable for system safety invariants

                    return (
                      <td key={role} className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isDisabled}
                          onChange={() => {
                            if (!isAdmin) return;
                            onUpdateRolePermissions(prev => {
                              const updatedPermissionsForRole = {
                                ...prev[typedRole],
                                [perm.key]: !isChecked
                              };
                              return {
                                ...prev,
                                [typedRole]: updatedPermissionsForRole
                              };
                            });
                          }}
                          className="w-4.5 h-4.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 accent-indigo-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isAdmin && (
          <div className="bg-amber-50/80 border border-dashed border-amber-250 text-amber-800 p-2 text-center rounded-xl text-[10px] font-semibold leading-relaxed">
            🔒 {lang === 'es' ? 'Modo de Solo Lectura: La asignación reactiva de directivas de seguridad y re-configuración de privilegios de acceso está restringida exclusivamente para el Director Ejecutivo (ADMIN).' : 'Viewing Only: Role configuration and active policies tuning is only adjustable by the primary Administrator.'}
          </div>
        )}
      </div>

      {/* LOWER SECTION: Settings configuration & restore backups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Hotel Preferences panel */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Settings className="w-4.5 h-4.5 text-indigo-500" />
            {lang === 'es' ? 'Parámetros de Configuración del Hotel' : lang === 'fr' ? "Paramètres de Configuration de l'Hôtel" : 'Hotel Preference Configuration'}
          </h4>

          {!canConfigSystem && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-xl text-[11px] font-semibold text-left">
              🔒 Parámetros de hotel bloqueados para su rol actual.
            </div>
          )}

          <div className="space-y-3.5 text-xs text-left">
            <fieldset disabled={!canConfigSystem} className="space-y-3.5">
              <div>
                <label className="block text-slate-500 mb-1">{lang === 'es' ? 'Nombre Comercial del Hotel' : lang === 'fr' ? "Nom Commercial de l'Hôtel" : 'Hotel Commercial Brand'}</label>
                <input
                  type="text"
                  value={hotelTitle}
                  onChange={(e) => setHotelTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">{lang === 'es' ? 'Tasa IVA Hospedaje (%)' : lang === 'fr' ? 'Taux de TVA Hébergement (%)' : 'Lodging VAT Rate (%)'}</label>
                  <input
                    type="number"
                    value={defaultIva}
                    onChange={(e) => setDefaultIva(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">{lang === 'es' ? 'Moneda Base' : lang === 'fr' ? 'Devise de Référence' : 'Reference Currency'}</label>
                  <input
                    type="text"
                    value="EUR (Euro €)"
                    disabled
                    className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              {settingsSuccess && (
                <p className="text-emerald-600 text-xs font-semibold">{t.adminSuccessSettings}</p>
              )}

              <button
                type="button"
                onClick={() => {
                  setSettingsSuccess(true);
                  setTimeout(() => setSettingsSuccess(false), 2000);
                }}
                disabled={!canConfigSystem}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold shadow hover:shadow-slate-100 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {lang === 'es' ? 'Guardar Parámetros' : lang === 'fr' ? 'Enregistrer Paramètres' : 'Save Parameters'}
              </button>
            </fieldset>
          </div>
        </div>

        {/* Danger zone / restoration */}
        <div className="bg-white p-5 rounded-2xl border border-red-200 bg-rose-50/10 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-rose-700 flex items-center gap-1.5 border-b border-red-100 pb-2 text-left">
            <AlertOctagon className="w-4.5 h-4.5 text-rose-500" />
            {t.adminRestoreTitle}
          </h4>

          <p className="text-xs text-slate-500 leading-relaxed text-left">
            {t.adminRestoreDesc}
          </p>

          <div className="p-3 bg-rose-50/40 rounded-xl border border-rose-100/50 text-rose-600 text-[11px] leading-relaxed text-left">
            <span className="font-extrabold block mb-0.5">⚠️ {lang === 'es' ? 'ADVERTENCIA:' : lang === 'fr' ? 'AVERTISSEMENT :' : 'WARNING:'}</span>
            {lang === 'es' ? 'Esta operación restaurará los 14 asientos contables estándar de la muestra inicial y borrará las modificaciones no persistidas.' : lang === 'fr' ? 'Cette opération restaurera les 14 écritures d’origine et effacera les modifications récentes non-déployées.' : 'This action restores the standard 14 foundational items from original Excel sheet and deletes recent untracked modifications.'}
          </div>

          <button
            onClick={() => {
              const confirmMsg = lang === 'es' ? '¿Desea restaurar de fábrica la base de datos de facturación hotelera? Se perderán las facturas ingresadas recientemente.' : lang === 'fr' ? "Voulez-vous restaurer l'application d'origine ? Toutes les modifications récentes seront perdues." : 'Do you want to force factory clean restore on the database? Recent custom additions will be lost.';
              if (window.confirm(confirmMsg)) {
                onRestoreDefaults();
                const alertMsg = lang === 'es' ? 'La base de datos ha sido re-establecida.' : lang === 'fr' ? "L'application a bien été réinitialisée." : 'Database successfully reset.';
                alert(alertMsg);
              }
            }}
            disabled={!canConfigSystem}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md shadow-rose-500/10 tracking-wide transition-all cursor-pointer flex items-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            {t.adminRestoreBtn}
          </button>

          {/* SERAMAR import section */}
          {isAdmin && onImportFromSeramar && (
            <div className="border-t border-rose-100 pt-4 space-y-2 text-left">
              <span className="block text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider">
                📥 {lang === 'es' ? 'Importar Reservas de SERAMAR' : 'Import Bookings from SERAMAR'}
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {lang === 'es'
                  ? 'Obtiene las reservas registradas en la base de datos de SERAMAR y las agrega automáticamente como fondos de caja en el módulo de Auditoría.'
                  : 'Fetches bookings from the SERAMAR hotel management database and merges them as manual funds in the Recap Audit module.'}
              </p>
              <button
                type="button"
                onClick={onImportFromSeramar}
                disabled={importingSeramar}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {importingSeramar ? (
                  <>
                    <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                    {lang === 'es' ? 'Importando...' : 'Importing...'}
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5" />
                    {lang === 'es' ? 'Importar Reservas desde SERAMAR' : 'Import SERAMAR Bookings'}
                  </>
                )}
              </button>
              {importSeramarStatus && (
                <p className={`text-[11px] font-semibold text-center ${importSeramarStatus.startsWith('✓') ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {importSeramarStatus}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
