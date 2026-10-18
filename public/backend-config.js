/* ==================================================================
   X00716 NEXUS ENTERPRISE — Secure Multi-Tenant Cloud Architecture
   ================================================================== */

(function () {
    'use strict';

    // Local Storage Keys
    const SESSION_BRANCH_KEY = 'qx716_active_branch';
    const LAST_SAVE_KEY = 'qx716_last_save_ts';
    const CLIENT_ID = Math.random().toString(36).slice(2, 10);
    const AUTO_SAVE_INTERVAL = 10 * 60 * 1000;

    let currentTenant = null;
    let autoSaveTimer = null;
    let debounceSaveTimer = null;
    let lastLocalWriteTs = 0;
    let onCloudUpdateCallback = null;
    let statusHeartbeatTimer = null;

    // Secure Data Obfuscator (Encodes sensitive operational data in storage)
    const CipherEngine = {
        encode: function (data) {
            try {
                const str = JSON.stringify(data);
                return btoa(encodeURIComponent(str));
            } catch (e) {
                return JSON.stringify(data);
            }
        },
        decode: function (str) {
            try {
                if (!str) return null;
                const json = decodeURIComponent(atob(str));
                return JSON.parse(json);
            } catch (e) {
                try { return JSON.parse(str); } catch (err) { return null; }
            }
        }
    };

    // Default Fallback Tenant for Initial Offline Startup
    const DEFAULT_TENANT = {
        id: 'branch_zayouni',
        name: 'زیوني',
        username: 'zayouni',
        status: 'active'
    };

    // Status UI Dispatcher
    function setFbStatus(state, text) {
        try {
            const el = document.getElementById('fb-status');
            const txt = document.getElementById('fb-status-text');
            if (el && txt) {
                el.className = `fb-status ${state}`;
                txt.textContent = text;
            }
        } catch (e) {}
    }

    function flashSaveIndicator(state = 'saved') {
        try {
            const el = document.getElementById('save-indicator');
            if (!el) return;
            el.className = `save-indicator show ${state}`;
            setTimeout(() => {
                el.className = 'save-indicator';
            }, 3000);
        } catch (e) {}
    }

    function updateLastSavedDisplay(ts = null) {
        try {
            const textEl = document.getElementById('last-saved-text');
            if (!textEl) return;
            const targetTs = ts || localStorage.getItem(LAST_SAVE_KEY);
            if (!targetTs) {
                textEl.textContent = 'آخر حفظ: —';
                return;
            }
            const date = new Date(parseInt(targetTs, 10) || targetTs);
            const timeStr = date.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            textEl.textContent = `آخر حفظ: ${timeStr}`;
        } catch (e) {}
    }

    function updateBranchUI() {
        try {
            const badge = document.getElementById('branch-badge');
            const drawerName = document.getElementById('drawer-branch-name');
            if (currentTenant) {
                if (badge) badge.textContent = `فرع: ${currentTenant.name}`;
                if (drawerName) drawerName.textContent = currentTenant.name;
            } else {
                if (badge) badge.textContent = 'فرع: غير محدد';
                if (drawerName) drawerName.textContent = 'غير مسجل';
            }
        } catch (e) {}
    }

    // Branch Tenant Authentication API
    async function authenticateBranch(username, password) {
        const cleanUser = String(username || '').trim().toLowerCase();
        const cleanPass = String(password || '').trim();

        if (!cleanUser || !cleanPass) throw new Error('يرجى ملء جميع الحقول');

        setFbStatus('sync', 'AUTH');

        try {
            const res = await fetch('/api/branches/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: cleanUser, password: cleanPass })
            });

            const rawText = await res.text();
            let data = null;
            try {
                data = JSON.parse(rawText);
            } catch (e) {
                console.warn('Non-JSON response in branch login:', rawText.slice(0, 80));
                throw new Error('تعذر الاتصال بالخادم المركزي. يرجى إعادة المحاولة.');
            }

            if (data && data.isAdmin && data.redirect) {
                window.location.href = data.redirect;
                return { name: 'المدير العام', isAdmin: true };
            }

            if (!res.ok) {
                if (data.status === 'deactivated') {
                    setFbStatus('offline', 'TERMINATED');
                    if (window.SecurityEngine) window.SecurityEngine.triggerKillSwitchUI(data.error);
                    throw new Error(data.error);
                }
                if (data.status === 'frozen') {
                    setFbStatus('offline', 'FROZEN');
                    if (window.SecurityEngine) window.SecurityEngine.triggerBreach(data.error);
                    throw new Error(data.error);
                }
                throw new Error(data.error || 'فشل تسجيل الدخول');
            }

            currentTenant = data.branch;
            localStorage.setItem(SESSION_BRANCH_KEY, JSON.stringify(currentTenant));
            setFbStatus('online', 'ONLINE');
            updateBranchUI();
            startStatusHeartbeat();

            // Real-time Cloud Firebase Connection
            if (window.NexusFirebase && typeof window.NexusFirebase.listenBranchRealtime === 'function') {
                window.NexusFirebase.listenBranchRealtime(currentTenant.id);
            }

            return currentTenant;
        } catch (err) {
            setFbStatus('offline', 'AUTH_ERR');
            throw err;
        }
    }

    async function logoutBranch() {
        try {
            if (currentTenant) {
                await logAuditEvent('LOGOUT', `تسجيل خروج الفرع: ${currentTenant.name}`);
            }
            currentTenant = null;
            localStorage.removeItem(SESSION_BRANCH_KEY);
            updateBranchUI();
            setFbStatus('sync', 'STANDBY');
            if (statusHeartbeatTimer) clearInterval(statusHeartbeatTimer);
        } catch (e) {}
    }

    // Live Heartbeat: Continuous High-Frequency Enforcement of Frozen / Deactivated States (1.5s Real-Time)
    function startStatusHeartbeat() {
        if (statusHeartbeatTimer) clearInterval(statusHeartbeatTimer);
        statusHeartbeatTimer = setInterval(checkActiveBranchStatus, 1500);
    }

    async function checkActiveBranchStatus() {
        const targetId = currentTenant ? currentTenant.id : 'default';
        try {
            const res = await fetch(`/api/branches/${targetId}/status`);
            if (res.ok) {
                const data = await res.json();
                if (data.status === 'deactivated') {
                    setFbStatus('offline', 'TERMINATED');
                    if (window.SecurityEngine) {
                        window.SecurityEngine.triggerKillSwitchUI(data.deactivatedReason || 'تم تعطيل هذا الفرع بشكل جذري بقرار الإدارة العامة.');
                    }
                    return false;
                } else if (data.status === 'frozen') {
                    setFbStatus('offline', 'FROZEN');
                    if (window.SecurityEngine) {
                        window.SecurityEngine.triggerBreach(data.frozenReason || 'تم تجميد هذا الفرع بقرار الإدارة المركزية.');
                    }
                    return false;
                } else if (data.status === 'active') {
                    // Admin unfroze the branch from admin panel!
                    if (window.SecurityEngine && typeof window.SecurityEngine.restoreActiveState === 'function') {
                        window.SecurityEngine.restoreActiveState();
                    }
                    setFbStatus('online', 'ONLINE');
                    return true;
                }
            }
        } catch (e) {}
        return true;
    }

    // Audit Log Pipeline
    async function logAuditEvent(action, details) {
        try {
            const payload = {
                branchId: currentTenant ? currentTenant.id : 'SYSTEM',
                branchName: currentTenant ? currentTenant.name : 'SYSTEM',
                branchUser: currentTenant ? currentTenant.username : 'SYSTEM',
                action,
                details,
                severity: action.includes('BREACH') ? 'critical' : 'normal'
            };
            fetch('/api/audit-logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(() => {});

            if (window.NexusFirebase && typeof window.NexusFirebase.logAudit === 'function') {
                window.NexusFirebase.logAudit(payload).catch(() => {});
            }
        } catch (e) {}
    }

    // Tenant Data Persistence
    function getTenantStorageKey(branchId = null) {
        const id = branchId || (currentTenant ? currentTenant.id : DEFAULT_TENANT.id);
        return `qx716_nexus_data_${id}`;
    }

    function loadTenantLocal(defaultFactory) {
        const key = getTenantStorageKey();
        try {
            const raw = localStorage.getItem(key);
            if (raw) {
                const parsed = CipherEngine.decode(raw);
                if (parsed && typeof parsed === 'object') return parsed;
            }
        } catch (e) {}
        return typeof defaultFactory === 'function' ? defaultFactory() : {};
    }

    function saveTenantLocal(state) {
        const key = getTenantStorageKey();
        try {
            const encoded = CipherEngine.encode(state);
            localStorage.setItem(key, encoded);
            lastLocalWriteTs = Date.now();
        } catch (e) {}
    }

    function debouncedSave(stateGetter) {
        if (debounceSaveTimer) clearTimeout(debounceSaveTimer);
        debounceSaveTimer = setTimeout(() => {
            const state = typeof stateGetter === 'function' ? stateGetter() : stateGetter;
            saveTenantLocal(state);
            forceSaveCloud(state, 'auto');
        }, 1200);
    }

    async function forceSaveCloud(state, reason = 'manual') {
        if (!currentTenant) return false;
        saveTenantLocal(state);

        try {
            setFbStatus('sync', 'SYNC');
            const res = await fetch(`/api/branches/${currentTenant.id}/data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: state })
            });

            if (!res.ok) {
                const errData = await res.json();
                if (errData.status === 'deactivated') {
                    if (window.SecurityEngine) window.SecurityEngine.triggerKillSwitchUI(errData.error);
                } else if (errData.status === 'frozen') {
                    if (window.SecurityEngine) window.SecurityEngine.triggerBreach(errData.error);
                }
                setFbStatus('offline', 'OFFLINE');
                return false;
            }

            const now = Date.now();
            localStorage.setItem(LAST_SAVE_KEY, String(now));
            updateLastSavedDisplay(now);
            flashSaveIndicator('saved');
            setFbStatus('online', 'ONLINE');

            // Save snapshot directly to Firebase Firestore
            if (window.NexusFirebase && typeof window.NexusFirebase.saveTenantDataToCloud === 'function') {
                window.NexusFirebase.saveTenantDataToCloud(currentTenant.id, state).catch(() => {});
            }

            return true;
        } catch (err) {
            setFbStatus('offline', 'OFFLINE');
            return false;
        }
    }

    function attachTenantSync(callback) {
        onCloudUpdateCallback = callback;
    }

    function startAutoSaveLoop(stateGetter) {
        if (autoSaveTimer) clearInterval(autoSaveTimer);
        autoSaveTimer = setInterval(() => {
            if (currentTenant && typeof stateGetter === 'function') {
                forceSaveCloud(stateGetter(), 'timer');
            }
        }, AUTO_SAVE_INTERVAL);
    }

    function bindSystemSyncListeners(stateGetter) {
        window.addEventListener('beforeunload', () => {
            if (currentTenant && typeof stateGetter === 'function') {
                saveTenantLocal(stateGetter());
            }
        });

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                if (currentTenant && typeof stateGetter === 'function') {
                    saveTenantLocal(stateGetter());
                }
            } else if (document.visibilityState === 'visible') {
                checkActiveBranchStatus();
            }
        });

        window.addEventListener('online', () => setFbStatus('online', 'ONLINE'));
        window.addEventListener('offline', () => setFbStatus('offline', 'OFFLINE'));
    }

    // Engine Initialization
    async function init() {
        const cached = localStorage.getItem(SESSION_BRANCH_KEY);
        if (cached) {
            try {
                currentTenant = JSON.parse(cached);
            } catch (e) {
                currentTenant = DEFAULT_TENANT;
            }
        } else {
            currentTenant = DEFAULT_TENANT;
        }

        updateBranchUI();
        setFbStatus('online', 'ONLINE');
        updateLastSavedDisplay();
        
        // Immediate authoritative server verification before releasing startup
        await checkActiveBranchStatus();
        startStatusHeartbeat();

        // Connect real-time Firebase listener
        if (window.NexusFirebase && typeof window.NexusFirebase.listenBranchRealtime === 'function' && currentTenant) {
            window.NexusFirebase.listenBranchRealtime(currentTenant.id);
        }
    }

    // Engine Public API
    window.BackendEngine = {
        init,
        authenticateBranch,
        logoutBranch,
        getCurrentTenant: () => currentTenant,
        loadTenantLocal,
        saveTenantLocal,
        debouncedSave,
        forceSaveCloud,
        attachTenantSync,
        startAutoSaveLoop,
        bindSystemSyncListeners,
        updateLastSavedDisplay,
        flashSaveIndicator,
        setFbStatus,
        logAuditEvent,
        checkActiveBranchStatus
    };

    window.manualSave = function (showToast = true) {
        if (window.AppEngine && typeof window.AppEngine.triggerManualSave === 'function') {
            window.AppEngine.triggerManualSave(showToast);
        }
    };
})();
