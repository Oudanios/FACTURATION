import express from 'express';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import mongoose, { Schema, model, Connection } from 'mongoose';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/facturation_audit';
// SERAMAR DB URI — same Atlas cluster, different database name
// In production set SERAMAR_MONGODB_URI env var in Render to your existing Atlas URI
const SERAMAR_MONGODB_URI = process.env.SERAMAR_MONGODB_URI || MONGODB_URI.replace('facturation_audit', 'serramar');
const BCRYPT_ROUNDS = 12;

// ─── Session token store ────────────────────────────────────────────────────
interface SessionData { username: string; role: string; }
const sessions = new Map<string, { data: SessionData; expiresAt: number }>();
const SESSION_TTL = 12 * 60 * 60 * 1000; // 12 h

function createSession(data: SessionData): string {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { data, expiresAt: Date.now() + SESSION_TTL });
  return token;
}
function getSession(token: string): SessionData | null {
  const entry = sessions.get(token);
  if (!entry || Date.now() > entry.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return entry.data;
}
setInterval(() => {
  const now = Date.now();
  sessions.forEach((v, k) => { if (now > v.expiresAt) sessions.delete(k); });
}, 60 * 60 * 1000);

// ─── Mongoose Models (facturation_audit db) ─────────────────────────────────
const V = { versionKey: false } as const;

const UserM = model('AuditUser', new Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name:     { type: String, required: true },
  role:     { type: String, enum: ['ADMIN','MANAGER','SUPPORT','USER','VIEWER'], default: 'USER' },
  password: { type: String, required: true },
}, V));

const InvoiceM = model('Invoice', new Schema({
  id:              { type: String, required: true, unique: true },
  n_origen:        Number,
  fecha:           String,
  tipo:            { type: String, enum: ['ENTRADA','SALIDA'] },
  n_factura:       String,
  empresa_cliente: String,
  nif_cif:         String,
  concepto:        String,
  categoria:       String,
  base_imponible:  Number,
  porc_iva:        Number,
  cuota_iva:       Number,
  irpf_perc:       Number,
  retencion_irpf:  Number,
  total_factura:   Number,
  metodo_pago:     String,
  estado:          String,
  usuario:         String,
  documento_tipo:  String,
}, V));

const FundM = model('ManualFund', new Schema({
  id:                  { type: String, required: true, unique: true },
  fecha:               String,
  mes_referencia:      String,
  monto:               Number,
  metodo_pago:         String,
  concepto:            String,
  usuario:             String,
  referencia_banco:    String,
  hora_transferencia:  String,
  isOnlineBooking:     Boolean,
}, V));

const CostM = model('MonthlyCost', new Schema({
  month:   { type: String, required: true, unique: true },
  data:    Schema.Types.Mixed,
}, V));

const CategoryM = model('CategoryConfig', new Schema({
  key:    { type: String, required: true, unique: true },
  values: [String],
}, V));

const ConceptM = model('CostConcept', new Schema({
  value: { type: String, required: true, unique: true },
}, V));

// ─── Express App ─────────────────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: '5mb' }));

// ─── Auth middleware ─────────────────────────────────────────────────────────
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers['x-auth-token'] as string;
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return; }
  const session = getSession(token);
  if (!session) { res.status(401).json({ error: 'Session expired' }); return; }
  (req as any).session = session;
  next();
}
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const s = (req as any).session as SessionData;
  if (!s || s.role !== 'ADMIN') { res.status(403).json({ error: 'Admin only' }); return; }
  next();
}

// ─── Auth Routes ─────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) { res.status(400).json({ error: 'Missing credentials' }); return; }
  try {
    const user = await UserM.findOne({ username: username.toLowerCase() });
    if (!user) { res.status(401).json({ error: 'Invalid credentials' }); return; }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) { res.status(401).json({ error: 'Invalid credentials' }); return; }
    const token = createSession({ username: user.username, role: user.role });
    res.json({ token, username: user.username, name: user.name, role: user.role });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  const token = req.headers['x-auth-token'] as string;
  sessions.delete(token);
  res.json({ ok: true });
});

// ─── Invoice Routes ───────────────────────────────────────────────────────────
app.get('/api/invoices', requireAuth, async (_req, res) => {
  const docs = await InvoiceM.find({}).lean();
  res.json(docs);
});

app.post('/api/invoices', requireAuth, async (req, res) => {
  try {
    await InvoiceM.create(req.body);
    res.status(201).json({ ok: true });
  } catch { res.status(400).json({ error: 'Duplicate or invalid' }); }
});

app.put('/api/invoices/:id', requireAuth, async (req, res) => {
  await InvoiceM.findOneAndUpdate({ id: req.params.id }, req.body, { upsert: true });
  res.json({ ok: true });
});

app.delete('/api/invoices/:id', requireAuth, async (req, res) => {
  await InvoiceM.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

// Bulk sync (used on app restore)
app.put('/api/invoices', requireAuth, requireAdmin, async (req, res) => {
  const docs: any[] = req.body;
  if (!Array.isArray(docs)) { res.status(400).json({ error: 'Expected array' }); return; }
  await InvoiceM.deleteMany({});
  if (docs.length) await InvoiceM.insertMany(docs);
  res.json({ ok: true });
});

// ─── Manual Funds Routes ─────────────────────────────────────────────────────
app.get('/api/funds', requireAuth, async (_req, res) => {
  const docs = await FundM.find({}).lean();
  res.json(docs);
});

app.post('/api/funds', requireAuth, async (req, res) => {
  try {
    await FundM.create(req.body);
    res.status(201).json({ ok: true });
  } catch { res.status(400).json({ error: 'Duplicate or invalid' }); }
});

app.delete('/api/funds/:id', requireAuth, async (req, res) => {
  await FundM.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

app.put('/api/funds', requireAuth, requireAdmin, async (req, res) => {
  const docs: any[] = req.body;
  if (!Array.isArray(docs)) { res.status(400).json({ error: 'Expected array' }); return; }
  await FundM.deleteMany({});
  if (docs.length) await FundM.insertMany(docs);
  res.json({ ok: true });
});

// ─── Monthly Costs Routes ────────────────────────────────────────────────────
app.get('/api/costs', requireAuth, async (_req, res) => {
  const docs = await CostM.find({}).lean();
  // Return as { [month]: data } object
  const obj: Record<string, any> = {};
  docs.forEach((d: any) => { obj[d.month] = d.data; });
  res.json(obj);
});

app.put('/api/costs/:month', requireAuth, async (req, res) => {
  const { month } = req.params;
  await CostM.findOneAndUpdate({ month }, { month, data: req.body }, { upsert: true });
  res.json({ ok: true });
});

// Bulk sync
app.put('/api/costs', requireAuth, requireAdmin, async (req, res) => {
  const costsObj: Record<string, any> = req.body;
  await CostM.deleteMany({});
  const docs = Object.entries(costsObj).map(([month, data]) => ({ month, data }));
  if (docs.length) await CostM.insertMany(docs);
  res.json({ ok: true });
});

// ─── Import from SERAMAR ─────────────────────────────────────────────────────
app.get('/api/import/seramar-bookings', requireAuth, requireAdmin, async (_req, res) => {
  let seramarConn: Connection | null = null;
  try {
    seramarConn = mongoose.createConnection(SERAMAR_MONGODB_URI);
    await new Promise<void>((resolve, reject) => {
      seramarConn!.once('open', resolve);
      seramarConn!.once('error', reject);
      setTimeout(() => reject(new Error('SERAMAR connection timeout')), 10000);
    });

    const BookingModel = seramarConn.model('Booking', new Schema({
      id:               String,
      roomNumber:       String,
      price:            Number,
      paymentType:      String,
      dateTime:         String,
      numberOfPersons:  Number,
      note:             String,
      createdBy:        String,
      createdAt:        String,
      tpvRef:           String,
      checkoutDateTime: String,
      dailyPrice:       Number,
    }, V));

    const bookings = await BookingModel.find({}).lean();

    // Map SERAMAR Booking → FACTURATION ManualBookingFund
    const funds = bookings.map((b: any) => {
      let fecha = '';
      let hora = '';
      let mesRef = '';

      const dt = b.dateTime || b.createdAt || '';
      if (dt) {
        const d = new Date(dt);
        if (!isNaN(d.getTime())) {
          fecha = d.toISOString().split('T')[0]; // YYYY-MM-DD
          hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          mesRef = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
      }

      const payMap: Record<string, string> = {
        cash: 'Efectivo', efectivo: 'Efectivo',
        tpv: 'TPV', card: 'TPV', tarjeta: 'TPV',
        transfer: 'Transferencia', transferencia: 'Transferencia',
        online: 'Online', booking: 'Online',
        bizum: 'Bizum',
      };
      const rawPay = (b.paymentType || '').toLowerCase();
      const metodoPago = payMap[rawPay] || 'Otros';

      return {
        id: `SERAMAR-${b.id || b._id}`,
        fecha,
        mes_referencia: mesRef,
        monto: b.price || 0,
        metodo_pago: metodoPago,
        concepto: `[SERAMAR] Hab. ${b.roomNumber || '?'} — ${b.note || `${b.numberOfPersons || 1} pers.`}`,
        usuario: b.createdBy || 'seramar',
        referencia_banco: b.tpvRef || undefined,
        hora_transferencia: hora || undefined,
        isOnlineBooking: rawPay === 'online' || rawPay === 'booking',
      };
    });

    res.json(funds);
  } catch (err: any) {
    res.status(503).json({ error: `Cannot reach SERAMAR database: ${err.message}` });
  } finally {
    if (seramarConn) {
      await seramarConn.close().catch(() => {});
    }
  }
});

// ─── Serve React SPA ─────────────────────────────────────────────────────────
const distDir = path.join(__dirname, 'dist');
app.use(express.static(distDir));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

// ─── DB Connect & Listen ─────────────────────────────────────────────────────
async function bootstrap() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`[facturation] MongoDB connected: ${MONGODB_URI.replace(/\/\/[^@]+@/, '//<credentials>@')}`);

    // Seed default admin user if DB is empty
    const count = await UserM.countDocuments();
    if (count === 0) {
      const hashed = await bcrypt.hash('OUDANI@RABI', BCRYPT_ROUNDS);
      await UserM.create({ username: 'admin', name: 'Administrator (Oudani)', role: 'ADMIN', password: hashed });
      console.log('[facturation] Seeded default admin user');
    }

    app.listen(PORT, () => {
      console.log(`[facturation] Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('[facturation] Failed to connect to MongoDB:', err);
    process.exit(1);
  }
}

bootstrap();
