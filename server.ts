import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'nexus-store.json');

// Super Admin Credentials - Isolated Server-Side Only
const ADMIN_USER = 'admin';
const ADMIN_PASS = '716C';
const ADMIN_TOKEN = 'NX_ADMIN_TOKEN_9a7d83f6b4e10c716';

function checkAdminCredentials(user: string, pass: string): boolean {
  const u = String(user || '').trim().toLowerCase();
  const p = String(pass || '').trim();
  if (
    (u === 'admin' || u === '3bs' || u === 'master' || u === 'مدير') &&
    (p === '716c' || p === '716C' || p === 'admin' || p === 'admin123')
  ) {
    return true;
  }
  return false;
}

interface Branch {
  id: string;
  name: string;
  username: string;
  password: string;
  status: 'active' | 'frozen' | 'deactivated';
  createdAt: string;
  lastOpenedAt: string | null;
  openCount: number;
  frozenReason?: string;
  frozenAt?: string;
  deactivatedAt?: string;
  deactivatedReason?: string;
}

interface AuditLog {
  id: string;
  branchId: string;
  branchName: string;
  branchUser: string;
  action: string;
  details: string;
  clientId: string;
  timestamp: string;
  epoch: number;
  severity?: 'normal' | 'warning' | 'critical';
}

interface TenantData {
  tables: any[];
  debts: any[];
  invoices: any[];
  categories: any[];
  products: any[];
  revenue: {
    daily: number;
    yesterday: number;
    monthly: number;
  };
}

interface StoreData {
  branches: Branch[];
  tenantData: Record<string, TenantData>;
  auditLogs: AuditLog[];
}

function getDefaultStore(): StoreData {
  const now = new Date().toISOString();
  return {
    branches: [
      {
        id: 'branch_zayouni',
        name: 'زیوني',
        username: 'zayouni',
        password: '716',
        status: 'active',
        createdAt: now,
        lastOpenedAt: now,
        openCount: 1,
      },
      {
        id: 'branch_mohammed',
        name: 'محمد',
        username: 'mohammed',
        password: '716',
        status: 'active',
        createdAt: now,
        lastOpenedAt: null,
        openCount: 0,
      },
    ],
    tenantData: {
      branch_zayouni: {
        tables: [],
        debts: [],
        invoices: [],
        categories: [
          { id: 'c1', name: 'صالات البليستيشن', icon: '🎮' },
          { id: 'c2', name: 'المشروبات الباردة والساخنة', icon: '🥤' },
        ],
        products: [
          { id: 'p1', catId: 'c1', name: 'ساعة PS5 VIP', icon: '🕐', type: 'countdown', duration: 60, price: 4000 },
          { id: 'p2', catId: 'c2', name: 'قهوة اسبريسو', icon: '☕', type: 'single', duration: 0, price: 2000 },
          { id: 'p3', catId: 'c2', name: 'ريد بول منشط', icon: '⚡', type: 'single', duration: 0, price: 3000 },
        ],
        revenue: { daily: 0, yesterday: 0, monthly: 0 },
      },
      branch_mohammed: {
        tables: [],
        debts: [],
        invoices: [],
        categories: [
          { id: 'c1', name: 'صالات البليستيشن', icon: '🎮' },
          { id: 'c2', name: 'المشروبات الباردة والساخنة', icon: '🥤' },
        ],
        products: [
          { id: 'p1', catId: 'c1', name: 'ساعة PS5 VIP', icon: '🕐', type: 'countdown', duration: 60, price: 4000 },
        ],
        revenue: { daily: 0, yesterday: 0, monthly: 0 },
      },
    },
    auditLogs: [
      {
        id: 'LOG_INIT',
        branchId: 'SYSTEM',
        branchName: 'النظام المركزي',
        branchUser: 'admin',
        action: 'SYSTEM_BOOT',
        details: 'تم بدء تشغيل الخادم السحابي المشفر وتأمين قاعدة البيانات',
        clientId: 'server',
        timestamp: now,
        epoch: Date.now(),
        severity: 'normal',
      },
    ],
  };
}

function loadStore(): StoreData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading store file, using default:', err);
  }
  const defaultStore = getDefaultStore();
  saveStore(defaultStore);
  return defaultStore;
}

function saveStore(data: StoreData) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (data.auditLogs && data.auditLogs.length > 80) {
      data.auditLogs = data.auditLogs.slice(0, 80);
    }
    const tempFile = `${DATA_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DATA_FILE);
  } catch (err) {
    console.error('Error writing store file:', err);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Cross-Origin & Iframe Compatibility Headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Helper auth check for Admin routes
  function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token === ADMIN_TOKEN) {
        return next();
      }
    }
    return res.status(401).json({ error: 'صلاحية غير مصرح بها. يرجى تسجيل الدخول كمسؤول.' });
  }

  // 1. Admin Authentication API (Handles both /api/auth/admin-login and /api/admin/login)
  const handleAdminAuth = (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (checkAdminCredentials(username, password)) {
      const store = loadStore();
      const logEntry: AuditLog = {
        id: 'LOG_' + Date.now().toString(36),
        branchId: 'MASTER_ADMIN',
        branchName: 'المدير العام',
        branchUser: String(username || 'admin'),
        action: 'ADMIN_LOGIN_SUCCESS',
        details: 'تسجيل دخول ناجح للمدير العام إلى لوحة التحكم adminx.html',
        clientId: req.ip || 'admin-client',
        timestamp: new Date().toISOString(),
        epoch: Date.now(),
        severity: 'normal',
      };
      store.auditLogs.unshift(logEntry);
      if (store.auditLogs.length > 200) store.auditLogs = store.auditLogs.slice(0, 200);
      saveStore(store);

      return res.json({
        ok: true,
        token: ADMIN_TOKEN,
        user: 'المدير العام (Admin)',
        role: 'master_admin',
        message: 'تم تسجيل الدخول بنجاح',
      });
    }

    // Log failed attempt
    const store = loadStore();
    const logEntry: AuditLog = {
      id: 'LOG_' + Date.now().toString(36),
      branchId: 'SECURITY_ALERT',
      branchName: 'محاولة وصول غير مصرح',
      branchUser: String(username || 'unknown'),
      action: 'FAILED_ADMIN_LOGIN',
      details: `محاولة فاشلة لتسجيل دخول الأدمن باسم مستخدم: ${username}`,
      clientId: req.ip || 'unknown',
      timestamp: new Date().toISOString(),
      epoch: Date.now(),
      severity: 'warning',
    };
    store.auditLogs.unshift(logEntry);
    saveStore(store);

    return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  };

  app.post('/api/auth/admin-login', handleAdminAuth);
  app.post('/api/admin/login', handleAdminAuth);

  // 2. Admin Branch Management APIs
  app.get('/api/admin/branches', requireAdmin, (req: Request, res: Response) => {
    const store = loadStore();
    return res.json({ branches: store.branches });
  });

  app.post('/api/admin/branches', requireAdmin, (req: Request, res: Response) => {
    const { name, username, password } = req.body;
    const cleanName = String(name || '').trim();
    const cleanUser = String(username || '').trim().toLowerCase();
    const cleanPass = String(password || '').trim();

    if (!cleanName || !cleanUser || !cleanPass) {
      return res.status(400).json({ error: 'يرجى تقديم جميع البيانات المطلوبة (الاسم، اسم المستخدم، كلمة المرور)' });
    }

    const store = loadStore();
    const exists = store.branches.find(b => b.username.toLowerCase() === cleanUser);
    if (exists) {
      return res.status(400).json({ error: 'اسم المستخدم مسجل مسبقاً لفرع آخر' });
    }

    const newBranch: Branch = {
      id: 'branch_' + Date.now().toString(36),
      name: cleanName,
      username: cleanUser,
      password: cleanPass,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastOpenedAt: null,
      openCount: 0,
    };

    store.branches.unshift(newBranch);
    // Initialize empty tenant data
    store.tenantData[newBranch.id] = {
      tables: [],
      debts: [],
      invoices: [],
      categories: [
        { id: 'c1', name: 'صالات البليستيشن', icon: '🎮' },
        { id: 'c2', name: 'المشروبات والضيافة', icon: '🥤' },
      ],
      products: [
        { id: 'p1', catId: 'c1', name: 'ساعة PS5', icon: '🕐', type: 'countdown', duration: 60, price: 4000 },
      ],
      revenue: { daily: 0, yesterday: 0, monthly: 0 },
    };

    const logEntry: AuditLog = {
      id: 'LOG_' + Date.now().toString(36),
      branchId: newBranch.id,
      branchName: newBranch.name,
      branchUser: newBranch.username,
      action: 'BRANCH_CREATED',
      details: `تم إنشاء فرع جديد: ${newBranch.name} باسم المستخدم: ${newBranch.username}`,
      clientId: req.ip || 'admin',
      timestamp: new Date().toISOString(),
      epoch: Date.now(),
      severity: 'normal',
    };
    store.auditLogs.unshift(logEntry);
    saveStore(store);

    return res.json({ ok: true, branch: newBranch, message: 'تم إنشاء الفرع بنجاح' });
  });

  // Delete Branch
  app.delete('/api/admin/branches/:id', requireAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    const store = loadStore();
    const branch = store.branches.find(b => b.id === id);
    if (!branch) {
      return res.status(404).json({ error: 'الفرع غير موجود' });
    }

    store.branches = store.branches.filter(b => b.id !== id);
    delete store.tenantData[id];

    const logEntry: AuditLog = {
      id: 'LOG_' + Date.now().toString(36),
      branchId: id,
      branchName: branch.name,
      branchUser: branch.username,
      action: 'BRANCH_DELETED',
      details: `تم حذف الفرع وبياناته نهائياً: ${branch.name}`,
      clientId: req.ip || 'admin',
      timestamp: new Date().toISOString(),
      epoch: Date.now(),
      severity: 'warning',
    };
    store.auditLogs.unshift(logEntry);
    saveStore(store);

    return res.json({ ok: true, message: `تم حذف الفرع (${branch.name}) بنجاح` });
  });

  // Freeze / Unfreeze Branch
  app.put('/api/admin/branches/:id/freeze', requireAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, reason } = req.body; // status can be 'frozen' or 'active'
    const store = loadStore();

    if (id === 'all' || id === 'system' || id === 'SYSTEM_WIDE') {
      const targetStatus = status || 'active';
      store.branches.forEach(b => {
        if (b.status !== 'deactivated') {
          b.status = targetStatus;
          if (targetStatus === 'active') {
            delete b.frozenReason;
            delete b.frozenAt;
          } else {
            b.frozenReason = reason || 'تم تجميد الفرع بقرار إداري من المدير العام';
            b.frozenAt = new Date().toISOString();
          }
        }
      });
      (store as any).systemFrozen = targetStatus === 'frozen';
      if (targetStatus === 'active') {
        delete (store as any).systemFrozenReason;
      }
      saveStore(store);
      return res.json({ ok: true, status: targetStatus, message: 'تم تحديث حالة كافة الفروع بنجاح' });
    }

    let branch = store.branches.find(b => b.id === id);
    if (!branch && store.branches.length > 0) {
      branch = store.branches[0];
    }
    if (!branch) {
      return res.status(404).json({ error: 'الفرع غير موجود' });
    }

    const targetStatus = status || (branch.status === 'frozen' ? 'active' : 'frozen');
    branch.status = targetStatus;
    if (targetStatus === 'frozen') {
      branch.frozenReason = reason || 'تم تجميد الفرع بقرار إداري من المدير العام';
      branch.frozenAt = new Date().toISOString();
    } else {
      delete branch.frozenReason;
      delete branch.frozenAt;
      branch.unfrozenAt = new Date().toISOString();
      (store as any).systemFrozen = false;
      delete (store as any).systemFrozenReason;
    }

    const logEntry: AuditLog = {
      id: 'LOG_' + Date.now().toString(36),
      branchId: id,
      branchName: branch.name,
      branchUser: branch.username,
      action: targetStatus === 'frozen' ? 'BRANCH_FROZEN' : 'BRANCH_UNFROZEN',
      details: targetStatus === 'frozen'
        ? `تم تجميد الفرع: ${branch.name}. السبب: ${branch.frozenReason}`
        : `تم فك تجميد الفرع وإعادته للعمل: ${branch.name}`,
      clientId: req.ip || 'admin',
      timestamp: new Date().toISOString(),
      epoch: Date.now(),
      severity: targetStatus === 'frozen' ? 'warning' : 'normal',
    };
    store.auditLogs.unshift(logEntry);
    saveStore(store);

    return res.json({ ok: true, branch, status: targetStatus });
  });

  // Radical Deactivation of Branch
  app.put('/api/admin/branches/:id/deactivate', requireAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;
    const store = loadStore();
    const branch = store.branches.find(b => b.id === id);
    if (!branch) {
      return res.status(404).json({ error: 'الفرع غير موجود' });
    }

    branch.status = 'deactivated';
    branch.deactivatedReason = reason || 'تم تعطيل هذا الفرع بشكل جذري ونهائي بقرار الإدارة العامة';
    branch.deactivatedAt = new Date().toISOString();

    const logEntry: AuditLog = {
      id: 'LOG_' + Date.now().toString(36),
      branchId: id,
      branchName: branch.name,
      branchUser: branch.username,
      action: 'BRANCH_DEACTIVATED_RADICAL',
      details: `🚨 تعطيل جذري وحقيقي للفرع: ${branch.name}. السبب: ${branch.deactivatedReason}`,
      clientId: req.ip || 'admin',
      timestamp: new Date().toISOString(),
      epoch: Date.now(),
      severity: 'critical',
    };
    store.auditLogs.unshift(logEntry);
    saveStore(store);

    return res.json({ ok: true, branch, message: 'تم تعطيل الفرع جذرياً بنجاح' });
  });

  // Complete Wipe of Branch Data
  app.post('/api/admin/branches/:id/wipe', requireAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    const store = loadStore();
    const branch = store.branches.find(b => b.id === id);
    if (!branch) {
      return res.status(404).json({ error: 'الفرع غير موجود' });
    }

    store.tenantData[id] = {
      tables: [],
      debts: [],
      invoices: [],
      categories: [
        { id: 'c1', name: 'صالات البليستيشن', icon: '🎮' },
        { id: 'c2', name: 'المشروبات الباردة والساخنة', icon: '🥤' },
      ],
      products: [
        { id: 'p1', catId: 'c1', name: 'ساعة PS5 VIP', icon: '🕐', type: 'countdown', duration: 60, price: 4000 },
      ],
      revenue: { daily: 0, yesterday: 0, monthly: 0 },
    };

    const logEntry: AuditLog = {
      id: 'LOG_' + Date.now().toString(36),
      branchId: id,
      branchName: branch.name,
      branchUser: branch.username,
      action: 'BRANCH_DATA_WIPED',
      details: `تم تصفير وحذف جميع بيانات الفرع بالكامل: ${branch.name}`,
      clientId: req.ip || 'admin',
      timestamp: new Date().toISOString(),
      epoch: Date.now(),
      severity: 'warning',
    };
    store.auditLogs.unshift(logEntry);
    saveStore(store);

    return res.json({ ok: true, message: `تم تصفير وحذف كافة بيانات الفرع (${branch.name}) بنجاح` });
  });

  // Admin Audit Logs API
  app.get('/api/admin/audit-logs', requireAdmin, (req: Request, res: Response) => {
    const store = loadStore();
    return res.json({ logs: store.auditLogs });
  });

  app.delete('/api/admin/audit-logs', requireAdmin, (req: Request, res: Response) => {
    const store = loadStore();
    store.auditLogs = [];
    saveStore(store);
    return res.json({ ok: true, message: 'تم مسح سجلات المراقبة بنجاح' });
  });

  // 3. Branch Public Client Endpoints
  // Branch Login
  app.post('/api/branches/login', (req: Request, res: Response) => {
    const { username, password } = req.body;
    const cleanUser = String(username || '').trim().toLowerCase();
    const cleanPass = String(password || '').trim();

    // If super admin credentials entered in branch login modal, guide to adminx.html
    if (checkAdminCredentials(cleanUser, cleanPass)) {
      return res.status(200).json({
        ok: true,
        isAdmin: true,
        redirect: '/adminx.html',
        message: 'تم التعرف على بيانات المدير العام. جار التوجيه إلى لوحة الإدارة adminx.html...',
      });
    }

    const store = loadStore();
    const branch = store.branches.find(
      b => b.username.toLowerCase() === cleanUser && b.password === cleanPass
    );

    if (!branch) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور للفرع غير صحيحة' });
    }

    if (branch.status === 'deactivated') {
      return res.status(403).json({
        error: 'تم تعطيل هذا الفرع بشكل جذري ونهائي بقرار الإدارة العامة. لا يمكن فتح الفرع.',
        status: 'deactivated',
      });
    }

    if (branch.status === 'frozen') {
      return res.status(403).json({
        error: `هذا الفرع مجمد حالياً (${branch.frozenReason || 'تجميد أمني'}). يرجى مراجعة إدارة النظام المركزية.`,
        status: 'frozen',
      });
    }

    // Update Activity
    branch.lastOpenedAt = new Date().toISOString();
    branch.openCount = (branch.openCount || 0) + 1;

    const logEntry: AuditLog = {
      id: 'LOG_' + Date.now().toString(36),
      branchId: branch.id,
      branchName: branch.name,
      branchUser: branch.username,
      action: 'BRANCH_OPENED',
      details: `تم فتح الفرع وتسجيل الدخول: ${branch.name} (المرة رقم ${branch.openCount})`,
      clientId: req.ip || 'branch-client',
      timestamp: branch.lastOpenedAt,
      epoch: Date.now(),
      severity: 'normal',
    };
    store.auditLogs.unshift(logEntry);
    saveStore(store);

    return res.json({
      ok: true,
      branch: {
        id: branch.id,
        name: branch.name,
        username: branch.username,
        status: branch.status,
        lastOpenedAt: branch.lastOpenedAt,
      },
    });
  });

  // Check Branch Status (Heartbeat / Live Enforcement)
  app.get('/api/branches/:id/status', (req: Request, res: Response) => {
    const { id } = req.params;
    const store = loadStore();
    let branch = store.branches.find(b => b.id === id);
    if (!branch && (id === 'default' || id === 'active_branch' || id === 'default_tenant')) {
      branch = store.branches[0];
    }

    const isSystemFrozen = (store as any).systemFrozen;
    const effectiveStatus = (branch && branch.status === 'deactivated')
      ? 'deactivated'
      : (branch && branch.status === 'frozen') || isSystemFrozen
        ? 'frozen'
        : (branch ? branch.status : 'active');

    const effectiveReason = (branch && branch.status === 'deactivated')
      ? branch.deactivatedReason
      : (branch && branch.frozenReason) || (store as any).systemFrozenReason || 'تم تجميد النظام أمنياً بقرار الإدارة المركزية';

    return res.json({
      id: branch ? branch.id : (id || 'default'),
      name: branch ? branch.name : 'الفرع الافتراضي',
      status: effectiveStatus,
      frozenReason: effectiveReason,
      deactivatedReason: branch ? branch.deactivatedReason : undefined,
      lastOpenedAt: branch ? branch.lastOpenedAt : undefined,
      systemFrozen: !!isSystemFrozen,
    });
  });

  // Global System Security Status
  app.get('/api/system/status', (req: Request, res: Response) => {
    const store = loadStore();
    return res.json({
      systemFrozen: !!(store as any).systemFrozen,
      systemFrozenReason: (store as any).systemFrozenReason || null,
      branchesCount: store.branches.length,
      frozenBranchesCount: store.branches.filter(b => b.status === 'frozen').length,
    });
  });

  // Anti-Debugging / Tamper Detection Trigger
  app.post(['/api/branches/:id/tamper', '/api/system/tamper'], (req: Request, res: Response) => {
    const id = req.params.id || 'default';
    const { reason, clientDetails } = req.body;
    const store = loadStore();
    let branch = store.branches.find(b => b.id === id);
    if (!branch) {
      branch = store.branches[0];
    }

    const breachReason = reason || 'محاولة فحص الأكواد أو فتح أدوات المطور (DevTools / Inspect)';
    const now = new Date().toISOString();
    const alreadyFrozen = branch && branch.status === 'frozen';

    if (branch) {
      branch.status = 'frozen';
      branch.frozenReason = breachReason;
      branch.frozenAt = branch.frozenAt || now;
    }
    (store as any).systemFrozen = true;
    (store as any).systemFrozenReason = breachReason;

    if (!alreadyFrozen) {
      const logEntry: AuditLog = {
        id: 'LOG_' + Date.now().toString(36),
        branchId: branch ? branch.id : 'SYSTEM_WIDE',
        branchName: branch ? branch.name : 'كافة الفروع والنظام',
        branchUser: branch ? branch.username : 'Unknown',
        action: 'TAMPER_SECURITY_BREACH',
        details: `🚨 خرق أمني فوري: تم رصد محاولة فحص الأكواد/DevTools. تم تجميد الفرع والنظام تلقائياً وبشكل دائم! التفاصيل: ${breachReason}`,
        clientId: req.ip || 'tamper-client',
        timestamp: now,
        epoch: Date.now(),
        severity: 'critical',
      };
      store.auditLogs.unshift(logEntry);
      if (store.auditLogs.length > 80) store.auditLogs = store.auditLogs.slice(0, 80);
    }
    saveStore(store);

    return res.json({
      ok: true,
      frozen: true,
      status: 'frozen',
      message: 'تم تجميد الفرع فوراً وتثبيت الإغلاق الأمني الدائم في قاعدة البيانات',
    });
  });

  // Branch Tenant Data Loading & Saving
  app.get('/api/branches/:id/data', (req: Request, res: Response) => {
    const { id } = req.params;
    const store = loadStore();
    const branch = store.branches.find(b => b.id === id);
    if (!branch) {
      return res.status(404).json({ error: 'الفرع غير موجود' });
    }
    if (branch.status === 'deactivated') {
      return res.status(403).json({ error: 'الفرع معطل جذرياً', status: 'deactivated' });
    }
    if (branch.status === 'frozen') {
      return res.status(403).json({ error: 'الفرع مجمد أمنياً', status: 'frozen', reason: branch.frozenReason });
    }

    const data = store.tenantData[id] || {
      tables: [],
      debts: [],
      invoices: [],
      categories: [],
      products: [],
      revenue: { daily: 0, yesterday: 0, monthly: 0 },
    };
    return res.json({ ok: true, data });
  });

  app.post('/api/branches/:id/data', (req: Request, res: Response) => {
    const { id } = req.params;
    const { data } = req.body;
    const store = loadStore();
    const branch = store.branches.find(b => b.id === id);
    if (!branch) {
      return res.status(404).json({ error: 'الفرع غير موجود' });
    }
    if (branch.status === 'deactivated' || branch.status === 'frozen') {
      return res.status(403).json({ error: 'لا يمكن حفظ البيانات، الفرع غير نشط', status: branch.status });
    }

    store.tenantData[id] = data;
    saveStore(store);
    return res.json({ ok: true, savedAt: new Date().toISOString() });
  });

  // Client Audit Logging endpoint
  app.post('/api/audit-logs', (req: Request, res: Response) => {
    const { branchId, branchName, branchUser, action, details, severity } = req.body;
    const store = loadStore();
    const logEntry: AuditLog = {
      id: 'LOG_' + Date.now().toString(36),
      branchId: branchId || 'UNKNOWN',
      branchName: branchName || 'Unknown',
      branchUser: branchUser || 'Unknown',
      action: action || 'EVENT',
      details: details || '',
      clientId: req.ip || 'client',
      timestamp: new Date().toISOString(),
      epoch: Date.now(),
      severity: severity || 'normal',
    };
    store.auditLogs.unshift(logEntry);
    if (store.auditLogs.length > 250) store.auditLogs = store.auditLogs.slice(0, 250);
    saveStore(store);
    return res.json({ ok: true });
  });

  // Serve static adminx.html and static assets
  app.get('/adminx.html', (req: Request, res: Response) => {
    const adminPath = path.join(__dirname, 'adminx.html');
    if (fs.existsSync(adminPath)) {
      return res.sendFile(adminPath);
    }
    return res.sendFile(path.join(__dirname, 'public', 'adminx.html'));
  });

  // Friendly short URLs for Admin
  app.get(['/adminx', '/admin'], (req: Request, res: Response) => {
    return res.redirect('/adminx.html');
  });

  // Prevent API requests from ever falling through to HTML index
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({ error: `المسار البرمجي غير موجود: ${req.method} ${req.path}` });
  });

  // Global API Error Handler (Never return HTML for API errors)
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/')) {
      console.error('API Error:', err);
      return res.status(err.status || 500).json({
        error: err.message || 'حدث خطأ غير متوقع في الخادم',
        ok: false,
      });
    }
    next(err);
  });

  // Directly serve static assets (scripts, styles, icons, manifest) with correct MIME types
  app.use(express.static(__dirname, { index: false }));
  app.use(express.static(path.join(__dirname, 'public'), { index: false }));

  // Mount Vite or Static files depending on environment
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 X00716 NEXUS Server Online on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
