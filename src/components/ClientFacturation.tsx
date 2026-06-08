/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useMemo } from 'react';
import { ClientInvoiceData, ClientInvoiceItem, UserAccount, Invoice } from '../types';
import { 
  Plus, Trash2, Printer, Check, Receipt, RefreshCw, 
  User, Mail, MapPin, Building2, CreditCard, Sparkles, AlertCircle 
} from 'lucide-react';

interface ClientFacturationProps {
  currentUser: UserAccount;
  onRegisterAsSalida: (newInvoice: Invoice) => void;
  onRedirectToRegistry?: () => void;
  lang?: any;
}

export default function ClientFacturation({ 
  currentUser, 
  onRegisterAsSalida,
  onRedirectToRegistry
}: ClientFacturationProps) {
  // Setup standard dynamic invoice number
  const initialInvoiceNum = useMemo(() => {
    return `F26 000000${Math.floor(10 + Math.random() * 89)}`;
  }, []);

  // Form State
  const [nFactura, setNFactura] = useState(initialInvoiceNum);
  const [fecha, setFecha] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteNif, setClienteNif] = useState('');
  const [clienteDireccion, setClienteDireccion] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [metodoPago, setMetodoPago] = useState<'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Bizum' | 'Otros'>('Efectivo');
  const [notas, setNotas] = useState('La estancia incluye acceso a piscina climatizada y desayuno continental. Gracias por preferirnos.');

  // Itemized line items state
  const [items, setItems] = useState<ClientInvoiceItem[]>([
    {
      id: 'item-init-1',
      concepto: 'Estancia Habitación Familiar Doble (Noches del 04/06 al 06/06)',
      cantidad: 2,
      precio_unitario: 110.00,
      iva_porc: 10
    }
  ]);

  // Temp field state for adding an item
  const [tempConcepto, setTempConcepto] = useState('');
  const [tempCantidad, setTempCantidad] = useState(1);
  const [tempPrecio, setTempPrecio] = useState<number>(0);
  const [tempIva, setTempIva] = useState<number>(10); // Standard hotel VAT is 10% in Spain

  const [isSaved, setIsSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Calculations
  const calculatedClientInvoice = useMemo(() => {
    let totalBase = 0;
    let totalIva = 0;

    items.forEach(it => {
      const lineBase = it.cantidad * it.precio_unitario;
      const lineIva = lineBase * (it.iva_porc / 100);
      totalBase += lineBase;
      totalIva += lineIva;
    });

    const totalFactura = totalBase + totalIva;

    return {
      totalBase: Number(totalBase.toFixed(2)),
      totalIva: Number(totalIva.toFixed(2)),
      totalFactura: Number(totalFactura.toFixed(2))
    };
  }, [items]);

  // Client dropdown selectors to speed up data entry
  const presetClients = [
    { label: '- CLIENTE GENÉRICO -', nombre: '', nif: '', k: 'g' },
    { label: 'NUEVAS BRISAS 2030 SL', nombre: 'NUEVAS BRISAS 2030 SL', nif: 'B55482012', direccion: 'Calle Sol, 45, Sevilla', email: 'contabilidad@brisas2030.es' },
    { label: 'JOHN GERMAN CORTES RAMIREZ', nombre: 'JOHN GERMAN CORTES RAMIREZ', nif: 'AK079967', direccion: 'Avenida Diego, Malaga', email: 'john.cortes@example.com' },
    { label: 'ANREA SOUS DOS SANTOS', nombre: 'ANREA SOUS DOS SANTOS', nif: 'X4948656E', direccion: 'Rua do Ouro, Lisboa, Portugal', email: 'andrea.santos@re.pt' }
  ];

  const handleSelectPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = parseInt(e.target.value, 10);
    if (!isNaN(idx) && idx > 0) {
      const preset = presetClients[idx];
      setClienteNombre(preset.nombre);
      setClienteNif(preset.nif);
      setClienteDireccion(preset.direccion || '');
      setClienteEmail(preset.email || '');
    }
  };

  // Add Item to Bill
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempConcepto.trim()) {
      alert('Introduzca la descripción del concepto');
      return;
    }
    if (tempCantidad <= 0 || tempPrecio <= 0) {
      alert('La cantidad y precio deben ser mayores que cero');
      return;
    }

    const newItem: ClientInvoiceItem = {
      id: `item-${Date.now()}`,
      concepto: tempConcepto.trim(),
      cantidad: Number(tempCantidad),
      precio_unitario: Number(tempPrecio),
      iva_porc: Number(tempIva)
    };

    setItems([...items, newItem]);
    setTempConcepto('');
    setTempPrecio(0);
    setTempCantidad(1);
  };

  // Remove Item from compile list
  const handleRemoveItem = (id: string) => {
    if (items.length === 1) {
      alert('La factura debe tener al menos un concepto registrado.');
      return;
    }
    setItems(items.filter(it => it.id !== id));
  };

  // Register Invoice in historical Database
  const handleFinalizeAndRegister = () => {
    if (!clienteNombre.trim() || !clienteNif.trim()) {
      setErrorMessage('Por favor especifique el Nombre del Cliente y su NIF/CIF fiscal para proceder.');
      return;
    }

    setErrorMessage('');

    // Transform date to DD/MM/YYYY for the main tracker
    const dateParts = fecha.split('-');
    const formattedDate = dateParts.length === 3 
      ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
      : '04/06/2026';

    const firstItemConcept = items[0]?.concepto || 'Factura a Cliente';
    const mainConcept = items.length > 1 
      ? `${firstItemConcept} (+${items.length - 1} conceptos)`
      : firstItemConcept;

    // Build the Outflow Row (SALIDA)
    const newInvoiceResult: Invoice = {
      id: `inv-gen-${Date.now()}`,
      n_origen: 999, // placeholder, will auto-increment on manager side
      fecha: formattedDate,
      tipo: 'SALIDA',
      n_factura: nFactura,
      empresa_cliente: clienteNombre,
      nif_cif: clienteNif,
      concepto: mainConcept,
      categoria: 'Factura a Cliente',
      base_imponible: calculatedClientInvoice.totalBase,
      porc_iva: items[0]?.iva_porc || 10,
      cuota_iva: calculatedClientInvoice.totalIva,
      irpf_perc: 0,
      retencion_irpf: 0,
      total_factura: calculatedClientInvoice.totalFactura,
      metodo_pago: metodoPago,
      estado: 'Pagada',
      usuario: currentUser.name.split(' ')[0]
    };

    onRegisterAsSalida(newInvoiceResult);
    setIsSaved(true);

    setTimeout(() => {
      setIsSaved(false);
      // Auto redirect back to tracker
      if (onRedirectToRegistry) {
        onRedirectToRegistry();
      }
    }, 2800);
  };

  // Trigger browser print of the Invoice preview specifically
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Introduction banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex justify-between items-start md:items-center">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-600 animate-pulse" />
            Workspace de Facturación a Clientes
          </h2>
          <p className="text-xs text-slate-500">Diseñe y compile facturas de salida para clientes corporativos o particulares del hotel</p>
        </div>
        <div className="text-xs text-right bg-indigo-50 text-indigo-700 px-3 py-1 bg-opacity-70 rounded-lg font-semibold border border-indigo-100">
          Facturando como: <span className="font-bold underline">{currentUser.name}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* LEFT COMPILE PANEL: Input options & lines */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          
          {/* Section 1: Client Metadata */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-4.5 h-4.5 text-indigo-500" />
                Datos del Cliente Facturado
              </h4>
              <select
                onChange={handleSelectPreset}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-indigo-600 focus:outline-none cursor-pointer"
              >
                <option value="">Cargar Cliente Registrado...</option>
                {presetClients.map((p, idx) => (
                  <option key={p.nif + idx} value={idx}>{p.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Nombre / Razón Social</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ej. NUEVAS BRISAS 2030 SL"
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">CIF / NIF / Pasaporte</label>
                <input
                  type="text"
                  placeholder="ej. B55482012"
                  value={clienteNif}
                  onChange={(e) => setClienteNif(e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Dirección Postal</label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Calle, Número, Ciudad, CP"
                    value={clienteDireccion}
                    onChange={(e) => setClienteDireccion(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-mono">Email de Envío</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    placeholder="ej. facturas@empresa.com"
                    value={clienteEmail}
                    onChange={(e) => setClienteEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Bill Config */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-700 flex items-center gap-1.5 mb-2">
              <CreditCard className="w-4.5 h-4.5 text-indigo-500" />
              Configuración de la Series
            </h4>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Nº de Factura</label>
                <input
                  type="text"
                  value={nFactura}
                  onChange={(e) => setNFactura(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Fecha Emisión</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Método de Cobro</label>
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none cursor-pointer"
                >
                  <option value="Efectivo">Efectivo (Caja)</option>
                  <option value="Tarjeta">Tarjeta TPV</option>
                  <option value="Transferencia">Transferencia Bancaria</option>
                  <option value="Bizum">Bizum Directo</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Add Line itemized list */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-700">Lineas e Itemizados de Facturación</h4>
            
            <form onSubmit={handleAddItem} className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Descripción de Hostelería o Servicio prestado..."
                  value={tempConcepto}
                  onChange={(e) => setTempConcepto(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
                />

                <div className="grid grid-cols-3 gap-1.5">
                  <input
                    type="number"
                    placeholder="Cant."
                    title="Cantidad"
                    value={tempCantidad === 0 ? '' : tempCantidad}
                    onChange={(e) => setTempCantidad(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-center focus:outline-none"
                  />

                  <input
                    type="number"
                    step="0.01"
                    placeholder="Precio"
                    title="Precio Unitario"
                    value={tempPrecio === 0 ? '' : tempPrecio}
                    onChange={(e) => setTempPrecio(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-center focus:outline-none"
                  />

                  <select
                    value={tempIva}
                    onChange={(e) => setTempIva(Number(e.target.value))}
                    className="w-full px-1 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
                  >
                    <option value="10">10% IVA</option>
                    <option value="21">21% IVA</option>
                    <option value="4">4% IVA</option>
                    <option value="0">0% IVA</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400">Total línea: <span className="font-bold">{(tempCantidad * tempPrecio * (1 + tempIva / 100)).toFixed(2)} €</span> </span>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar Concepto
                </button>
              </div>
            </form>

            {/* List of compiling items */}
            <div className="border border-slate-200/60 rounded-xl overflow-hidden text-xs">
              <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex justify-between font-bold text-[10px] text-slate-500 uppercase">
                <span className="flex-1">Concepto</span>
                <span className="w-16 text-center">Unids</span>
                <span className="w-20 text-right">P. Unit</span>
                <span className="w-12 text-center">IVA</span>
                <span className="w-24 text-right pr-6">Total</span>
              </div>

              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {items.map((line) => {
                  const lineTotal = line.cantidad * line.precio_unitario * (1 + line.iva_porc / 100);
                  return (
                    <div key={line.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="font-semibold text-slate-800 truncate" title={line.concepto}>
                          {line.concepto}
                        </p>
                      </div>
                      <span className="w-16 text-center text-slate-500 font-mono font-bold">{line.cantidad}</span>
                      <span className="w-20 text-right text-slate-600">{(line.precio_unitario.toFixed(2))} €</span>
                      <span className="w-12 text-center text-[10px] font-bold text-indigo-600">{line.iva_porc}%</span>
                      <div className="w-24 text-right font-bold text-slate-800 pr-2 whitespace-nowrap">
                        {lineTotal.toFixed(2)} €
                      </div>
                      
                      <button
                        onClick={() => handleRemoveItem(line.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                        title="Quitar concepto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 4: Notes and Register Area */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Notas / Cláusulas / Pie de Factura</label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-600"
              placeholder="Añada mensajes o términos..."
            />

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-xl flex items-center gap-1.5 font-semibold">
                <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                {errorMessage}
              </div>
            )}

            {isSaved ? (
              <div className="bg-emerald-500 text-white p-3.5 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-100 transition-all animate-bounce">
                <Check className="w-5 h-5" />
                Factura Finalizada y Registrada con éxito en Diario General de Ventas.
              </div>
            ) : (
              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleFinalizeAndRegister}
                  className="px-5 py-3 bg-green-600 hover:bg-green-700 text-white font-extrabold rounded-xl shadow-lg hover:shadow-green-100 transition-all flex items-center gap-1.5 cursor-pointer flex-1 justify-center active:scale-[0.98]"
                >
                  <Sparkles className="w-4 h-4 text-emerald-100" />
                  Concluir Factura & Registrar en Salidas
                </button>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT LIVE PREVIEW: High-fidelity A4 printable bill mockup */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-lg relative overflow-hidden" id="printable-area">
          <div className="absolute top-0 right-0 h-1.5 bg-indigo-600 inset-x-0" />
          
          {/* Invoice A4 mockup Layout */}
          <div className="space-y-6">
            {/* Logo and Hotel details */}
            <div className="flex justify-between items-start pb-6 border-b border-slate-200">
              <div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight">Hostal Serramar</h1>
                <p className="text-[9px] text-slate-500 leading-normal mt-1">
                  Empresa: <span className="font-semibold">{`SUN SERRAMAR SL`}</span><br />
                  CIF: {`B21902432`}<br />
                  Calle Las Flores, 5<br />
                  29631 Benalmádena, Málaga, España<br />
                  Contacto: {`SERRAMAR2906@GMAIL.COM`} • Tel: +34 652442604
                </p>
              </div>

              <div className="text-right">
                <span className="p-1 px-2.5 bg-indigo-50/70 border border-indigo-100 text-indigo-700 rounded text-[9px] tracking-widest font-extrabold uppercase">
                  FACTURA CLIENTE
                </span>
                <p className="text-slate-800 font-bold font-mono text-xs mt-2">{nFactura}</p>
                <p className="text-[10px] text-slate-400 mt-1">Fecha Emisión: <span className="text-slate-700 font-bold">{fecha}</span></p>
              </div>
            </div>

            {/* Billing detail block */}
            <div className="grid grid-cols-2 gap-4 text-[10px] border-b border-slate-100 pb-6">
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">FACTURADO A:</span>
                <p className="font-extrabold text-slate-800 text-xs leading-normal">
                  {clienteNombre || '— Nombre del Cliente —'}
                </p>
                <p className="font-mono text-[9px] font-bold text-slate-500 mt-1">CIF: {clienteNif || '— NIF/CIF —'}</p>
                <p className="text-slate-500 mt-1 leading-normal">
                  {clienteDireccion || '— Sin dirección especificada —'}
                </p>
                <p className="text-slate-500 mt-0.5 leading-normal truncate max-w-[200px]">
                  {clienteEmail || '— Correo no informado —'}
                </p>
              </div>

              <div className="text-right flex flex-col justify-between items-end">
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">INFORMACIÓN DE PAGO:</span>
                  <p className="font-bold text-slate-700">Método: <span className="font-bold text-slate-800 bg-slate-100 rounded px-1.5 py-0.5">{metodoPago}</span></p>
                  <p className="text-slate-500 mt-1 block">Estado: <span className="text-emerald-600 font-extrabold">COBRADA (Pagada)</span></p>
                </div>
                

              </div>
            </div>

            {/* Line items printable table structure */}
            <div className="space-y-4">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase text-left">
                    <th className="py-2.5 px-2">Descripción del Servicio</th>
                    <th className="py-2.5 px-2 text-center w-12">Cant.</th>
                    <th className="py-2.5 px-2 text-right w-20">P. Unit.</th>
                    <th className="py-2.5 px-2 text-center w-12">IVA</th>
                    <th className="py-2.5 px-2 text-right w-24 pr-4">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {items.map((line, index) => {
                    const lineBase = line.cantidad * line.precio_unitario;
                    const lineTotal = lineBase * (1 + line.iva_porc / 100);
                    return (
                      <tr key={line.id + index} className="text-slate-700">
                        <td className="py-3 px-2 max-w-[180px] break-words">{line.concepto}</td>
                        <td className="py-3 px-2 text-center font-mono font-bold text-slate-500">{line.cantidad}</td>
                        <td className="py-3 px-2 text-right font-mono">{(line.precio_unitario.toFixed(2))} €</td>
                        <td className="py-3 px-2 text-center text-slate-400">{line.iva_porc}%</td>
                        <td className="py-3 px-2 text-right font-bold text-slate-800 pr-4">{lineTotal.toFixed(2)} €</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom calculation total summary block */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-4 font-medium">
              <div className="text-[9px] text-slate-500 leading-normal bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-700 block mb-1">Notas Legales & Condiciones</span>
                {notas || 'No se han especificado notas para el cliente.'}
              </div>

              <div className="space-y-1.5 text-[10px] text-right">
                <div className="flex justify-between pl-10 text-slate-500">
                  <span>Subtotal Base Imponible:</span>
                  <span className="font-semibold text-slate-700">{(calculatedClientInvoice.totalBase.toFixed(2))} €</span>
                </div>
                
                <div className="flex justify-between pl-10 text-slate-500">
                  <span>Impuestos de Hostelería (IVA):</span>
                  <span className="font-semibold text-slate-700">{(calculatedClientInvoice.totalIva.toFixed(2))} €</span>
                </div>

                <div className="flex justify-between pl-10 pt-2 border-t border-slate-200 text-slate-800 font-extrabold text-sm">
                  <span>TOTAL FACTURADO:</span>
                  <span className="text-indigo-600 font-sans font-black">{(calculatedClientInvoice.totalFactura.toFixed(2))} €</span>
                </div>
              </div>
            </div>

            {/* Signatures at the very bottom of the A4 page */}
            <div className="mt-auto pt-12 grid grid-cols-2 text-center text-[8px] text-slate-400 gap-8">
              <div className="border-t border-slate-300 pt-4">
                <p className="font-bold text-slate-600 block mb-0.5">Firma Autorizada Hostal</p>
                <p className="text-[7px]">Sello Hostal Serramar · SUN SERRAMAR SL</p>
              </div>
              <div className="border-t border-slate-300 pt-4">
                <p className="font-bold text-slate-600 block mb-0.5">Recibí & Conforme Cliente</p>
                <p className="text-[7px]">Al pagar se aceptan términos de hospedaje</p>
              </div>
            </div>

            {/* Quick Helper print triggers */}
            <div className="flex justify-center pt-8 border-t border-slate-100 no-print">
              <button
                onClick={handlePrint}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                Imprimir Documento / Guardar PDF
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
