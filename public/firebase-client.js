/**
 * X00716 NEXUS ENTERPRISE — Cloud Firebase Realtime Integration
 * Project: respawn-7654a
 * Provides ultra-fast real-time Firestore listeners, instant branch freezing,
 * breach tracking, and automated cloud sync between Admin and Sub-Sites.
 */

(function () {
    'use strict';

    const FIREBASE_CONFIG = {
        apiKey: "AIzaSyAFQx3BndP3piYkONM0KSBcb5vo8xx3a5Q",
        authDomain: "respawn-7654a.firebaseapp.com",
        databaseURL: "https://respawn-7654a-default-rtdb.firebaseio.com",
        projectId: "respawn-7654a",
        storageBucket: "respawn-7654a.firebasestorage.app",
        messagingSenderId: "503079760523",
        appId: "1:503079760523:web:388e783a8dc0e0ec5a9a8e",
        measurementId: "G-HPZG403TFS"
    };

    let app = null;
    let db = null;
    let isInitialized = false;
    let branchStatusUnsubscribe = null;

    try {
        if (typeof firebase !== 'undefined') {
            if (!firebase.apps || !firebase.apps.length) {
                app = firebase.initializeApp(FIREBASE_CONFIG);
            } else {
                app = firebase.app();
            }
            db = firebase.firestore();
            isInitialized = true;
            console.log('⚡ [NEXUS Firebase] Connected to project: ' + FIREBASE_CONFIG.projectId);
        } else {
            console.warn('[NEXUS Firebase] SDK not loaded globally yet.');
        }
    } catch (e) {
        console.warn('[NEXUS Firebase] Initialization note:', e.message);
    }

    /**
     * Listen in REAL-TIME to branch status changes (Freeze / Active / Deactivate)
     * Direct live push in < 200ms
     */
    function listenBranchRealtime(branchId, onStatusChange) {
        if (!db || !branchId) return null;
        if (branchStatusUnsubscribe) {
            try { branchStatusUnsubscribe(); } catch(e) {}
        }

        try {
            branchStatusUnsubscribe = db.collection('branches').doc(branchId).onSnapshot((doc) => {
                if (!doc.exists) return;
                const data = doc.data();
                if (!data) return;

                console.log(`📡 [NEXUS Firebase] Realtime update for [${branchId}]:`, data.status);

                if (typeof onStatusChange === 'function') {
                    onStatusChange(data);
                }

                // Global Automatic Lockdown Dispatcher
                if (data.status === 'frozen') {
                    const reason = data.frozenReason || 'تم تجميد هذا الفرع بقرار من الإدارة المركزية.';
                    if (window.SecurityEngine && typeof window.SecurityEngine.triggerBreach === 'function') {
                        window.SecurityEngine.triggerBreach(reason);
                    }
                } else if (data.status === 'deactivated') {
                    const reason = data.deactivatedReason || 'تم تعطيل هذا الفرع نهائياً.';
                    if (window.SecurityEngine && typeof window.SecurityEngine.triggerKillSwitchUI === 'function') {
                        window.SecurityEngine.triggerKillSwitchUI(reason);
                    }
                } else if (data.status === 'active') {
                    // Admin unlocked the branch in Firestore!
                    if (window.SecurityEngine && typeof window.SecurityEngine.restoreActiveState === 'function') {
                        window.SecurityEngine.restoreActiveState(true);
                    }
                }
            }, (error) => {
                console.warn('[NEXUS Firebase] Snapshot listener warning:', error.message);
            });

            return branchStatusUnsubscribe;
        } catch (err) {
            console.warn('[NEXUS Firebase] Listen error:', err);
            return null;
        }
    }

    /**
     * Freeze branch in Firestore (Instantly broadcasts to all open tabs/devices)
     */
    async function freezeBranchInCloud(branchId, reason) {
        if (!db || !branchId) return false;
        try {
            const payload = {
                id: branchId,
                status: 'frozen',
                frozenReason: reason || 'تجميد أمني فوري',
                frozenAt: new Date().toISOString(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (branchId === 'all') {
                const snap = await db.collection('branches').get();
                const batch = db.batch();
                snap.forEach(doc => {
                    batch.set(doc.ref, payload, { merge: true });
                });
                await batch.commit();
            } else {
                await db.collection('branches').doc(branchId).set(payload, { merge: true });
            }

            // Record security breach record
            await db.collection('security_breaches').add({
                branchId: branchId,
                reason: reason || 'محاولة تلاعب / فحص غير مصرح به',
                timestamp: new Date().toISOString(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Update system control document
            await db.collection('systemControl').doc('globalState').set({
                systemFrozen: true,
                lastBreachReason: reason || 'تجميد أمني',
                lastBreachAt: new Date().toISOString(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            return true;
        } catch (e) {
            console.warn('[NEXUS Firebase] Cloud freeze error:', e.message);
            return false;
        }
    }

    /**
     * Unfreeze branch in Firestore (Instantly unlocks the branch)
     */
    async function unfreezeBranchInCloud(branchId) {
        if (!db || !branchId) return false;
        try {
            const payload = {
                status: 'active',
                frozenReason: null,
                unfrozenAt: new Date().toISOString(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (branchId === 'all') {
                const snap = await db.collection('branches').get();
                const batch = db.batch();
                snap.forEach(doc => {
                    batch.set(doc.ref, payload, { merge: true });
                });
                await batch.commit();
            } else {
                await db.collection('branches').doc(branchId).set(payload, { merge: true });
            }

            // Update system control document
            await db.collection('systemControl').doc('globalState').set({
                systemFrozen: false,
                unfrozenAt: new Date().toISOString(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            return true;
        } catch (e) {
            console.warn('[NEXUS Firebase] Cloud unfreeze error:', e.message);
            return false;
        }
    }

    /**
     * Deactivate branch permanently
     */
    async function deactivateBranchInCloud(branchId, reason) {
        if (!db || !branchId) return false;
        try {
            await db.collection('branches').doc(branchId).set({
                status: 'deactivated',
                deactivatedReason: reason || 'تعطيل إداري',
                deactivatedAt: new Date().toISOString(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            return true;
        } catch (e) {
            console.warn('[NEXUS Firebase] Cloud deactivate error:', e.message);
            return false;
        }
    }

    /**
     * Save branch operational tenant data (tables, products, debts, revenue)
     */
    async function saveTenantDataToCloud(branchId, data) {
        if (!db || !branchId || !data) return false;
        try {
            await db.collection('tenantData').doc(branchId).set({
                data: data,
                updatedAt: new Date().toISOString(),
                serverTime: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            return true;
        } catch (e) {
            console.warn('[NEXUS Firebase] Tenant data save error:', e.message);
            return false;
        }
    }

    /**
     * Fetch tenant data once
     */
    async function fetchTenantDataFromCloud(branchId) {
        if (!db || !branchId) return null;
        try {
            const doc = await db.collection('tenantData').doc(branchId).get();
            if (doc.exists && doc.data() && doc.data().data) {
                return doc.data().data;
            }
            return null;
        } catch (e) {
            console.warn('[NEXUS Firebase] Tenant fetch error:', e.message);
            return null;
        }
    }

    /**
     * Admin: Listen to all branches live with sorting
     */
    function listenAllBranches(onBranchesUpdate) {
        if (!db) return null;
        try {
            return db.collection('branches').onSnapshot((snapshot) => {
                const branches = [];
                snapshot.forEach((doc) => {
                    const data = doc.data() || {};
                    branches.push({ id: doc.id, ...data });
                });
                // Sort by creation or name
                branches.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
                if (typeof onBranchesUpdate === 'function') {
                    onBranchesUpdate(branches);
                }
            }, (err) => {
                console.warn('[NEXUS Firebase] All branches listen warning:', err.message);
            });
        } catch (e) {
            return null;
        }
    }

    /**
     * Admin: Create / Provision New Branch in Firestore
     */
    async function createBranchInCloud(branchData) {
        if (!db || !branchData || !branchData.id) return false;
        try {
            const now = new Date().toISOString();
            const docData = {
                id: branchData.id,
                name: branchData.name || 'فرع جديد',
                username: branchData.username || branchData.id,
                password: branchData.password || '716',
                status: branchData.status || 'active',
                createdAt: branchData.createdAt || now,
                lastOpenedAt: branchData.lastOpenedAt || null,
                openCount: branchData.openCount || 0,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('branches').doc(branchData.id).set(docData, { merge: true });

            // Initialize default tenant data
            await db.collection('tenantData').doc(branchData.id).set({
                data: {
                    tables: [],
                    debts: [],
                    invoices: [],
                    categories: [
                        { id: 'c1', name: 'صالات البليستيشن', icon: '🎮' },
                        { id: 'c2', name: 'المشروبات والوجبات', icon: '🥤' }
                    ],
                    products: [
                        { id: 'p1', catId: 'c1', name: 'ساعة PS5 VIP', icon: '🕐', type: 'countdown', duration: 60, price: 4000 },
                        { id: 'p2', catId: 'c2', name: 'قهوة اسبريسو', icon: '☕', type: 'single', duration: 0, price: 2000 }
                    ],
                    revenue: { daily: 0, yesterday: 0, monthly: 0 }
                },
                updatedAt: now
            }, { merge: true });

            // Audit Log
            await logAudit({
                branchId: branchData.id,
                branchName: branchData.name,
                branchUser: branchData.username,
                action: 'BRANCH_CREATED',
                details: `تم إنشاء فرع جديد للنظام سحابياً: ${branchData.name} (المستخدم: ${branchData.username})`,
                severity: 'normal'
            });

            return true;
        } catch (err) {
            console.error('[NEXUS Firebase] Create branch error:', err);
            throw err;
        }
    }

    /**
     * Admin: Update Branch Credentials / Details in Firestore
     */
    async function updateBranchInCloud(branchId, updates) {
        if (!db || !branchId || !updates) return false;
        try {
            const dataToUpdate = {
                ...updates,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            await db.collection('branches').doc(branchId).set(dataToUpdate, { merge: true });

            await logAudit({
                branchId: branchId,
                branchName: updates.name || branchId,
                branchUser: updates.username || 'admin',
                action: 'BRANCH_UPDATED',
                details: `تم تعديل بيانات واعتماد الفرع: ${updates.name || branchId}`,
                severity: 'normal'
            });

            return true;
        } catch (err) {
            console.error('[NEXUS Firebase] Update branch error:', err);
            throw err;
        }
    }

    /**
     * Admin: Delete Branch Permanently from Firestore
     */
    async function deleteBranchInCloud(branchId, branchName) {
        if (!db || !branchId) return false;
        try {
            await db.collection('branches').doc(branchId).delete();
            await db.collection('tenantData').doc(branchId).delete();

            await logAudit({
                branchId: branchId,
                branchName: branchName || branchId,
                branchUser: 'admin',
                action: 'BRANCH_DELETED',
                details: `تم حذف الفرع نهائياً من قاعدة البيانات: ${branchName || branchId}`,
                severity: 'warning'
            });

            return true;
        } catch (err) {
            console.error('[NEXUS Firebase] Delete branch error:', err);
            throw err;
        }
    }

    /**
     * Admin: Wipe Tenant Operational Data (Reset tables, debts, invoices)
     */
    async function wipeBranchDataInCloud(branchId, branchName) {
        if (!db || !branchId) return false;
        try {
            await db.collection('tenantData').doc(branchId).set({
                data: {
                    tables: [],
                    debts: [],
                    invoices: [],
                    categories: [
                        { id: 'c1', name: 'صالات البليستيشن', icon: '🎮' },
                        { id: 'c2', name: 'المشروبات والوجبات', icon: '🥤' }
                    ],
                    products: [
                        { id: 'p1', catId: 'c1', name: 'ساعة PS5 VIP', icon: '🕐', type: 'countdown', duration: 60, price: 4000 }
                    ],
                    revenue: { daily: 0, yesterday: 0, monthly: 0 }
                },
                updatedAt: new Date().toISOString()
            }, { merge: true });

            await logAudit({
                branchId: branchId,
                branchName: branchName || branchId,
                branchUser: 'admin',
                action: 'BRANCH_DATA_WIPED',
                details: `تم تصفير وحذف جميع بيانات وجلسات الفرع: ${branchName || branchId}`,
                severity: 'warning'
            });

            return true;
        } catch (err) {
            console.error('[NEXUS Firebase] Wipe branch error:', err);
            throw err;
        }
    }

    /**
     * Admin: Listen to Real-time Audit Logs from Firestore
     */
    function listenAuditLogs(onLogsUpdate, limitCount = 60) {
        if (!db) return null;
        try {
            return db.collection('audit_logs')
                .orderBy('timestamp', 'desc')
                .limit(limitCount)
                .onSnapshot((snapshot) => {
                    const logs = [];
                    snapshot.forEach(doc => {
                        logs.push({ id: doc.id, ...doc.data() });
                    });
                    if (typeof onLogsUpdate === 'function') {
                        onLogsUpdate(logs);
                    }
                }, (err) => {
                    console.warn('[NEXUS Firebase] Audit logs listen warning:', err.message);
                });
        } catch (e) {
            return null;
        }
    }

    /**
     * Admin: Clear Audit Logs in Firestore
     */
    async function clearAuditLogsInCloud() {
        if (!db) return false;
        try {
            const snap = await db.collection('audit_logs').limit(100).get();
            const batch = db.batch();
            snap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            return true;
        } catch (e) {
            console.warn('[NEXUS Firebase] Clear audit logs error:', e);
            return false;
        }
    }

    /**
     * Initial Seed Helper: Ensures default branches exist in Firestore if empty
     */
    async function ensureDefaultBranchesSeeded() {
        if (!db) return;
        try {
            const snap = await db.collection('branches').get();
            const now = new Date().toISOString();

            if (snap.empty) {
                console.log('⚡ [NEXUS Firebase] Seeding default branches into Firestore...');
                const defaultBranches = [
                    {
                        id: 'branch_zayouni',
                        name: 'زیوني',
                        username: 'zayouni',
                        password: '716',
                        status: 'active',
                        createdAt: now,
                        lastOpenedAt: now,
                        openCount: 1
                    },
                    {
                        id: 'branch_mohammed',
                        name: 'محمد',
                        username: 'mohammed',
                        password: '716',
                        status: 'active',
                        createdAt: now,
                        lastOpenedAt: null,
                        openCount: 0
                    }
                ];

                for (const b of defaultBranches) {
                    await createBranchInCloud(b);
                }
            } else {
                // Check if branch_zayouni is missing full fields (e.g. name or username)
                const zayouniDoc = snap.docs.find(d => d.id === 'branch_zayouni');
                if (zayouniDoc) {
                    const zData = zayouniDoc.data();
                    if (!zData.name || !zData.username) {
                        await db.collection('branches').doc('branch_zayouni').set({
                            name: 'زیوني',
                            username: 'zayouni',
                            password: '716',
                            createdAt: zData.createdAt || now,
                            openCount: zData.openCount || 1
                        }, { merge: true });
                    }
                }
            }
        } catch (e) {
            console.warn('[NEXUS Firebase] Seed note:', e.message);
        }
    }

    /**
     * Audit Logging
     */
    async function logAudit(entry) {
        if (!db || !entry) return;
        try {
            await db.collection('audit_logs').add({
                ...entry,
                timestamp: entry.timestamp || new Date().toISOString(),
                epoch: entry.epoch || Date.now(),
                serverTime: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {}
    }

    // Export Global API
    window.NexusFirebase = {
        config: FIREBASE_CONFIG,
        get db() { return db; },
        get app() { return app; },
        get isReady() { return !!db; },
        listenBranchRealtime,
        freezeBranchInCloud,
        unfreezeBranchInCloud,
        deactivateBranchInCloud,
        createBranchInCloud,
        updateBranchInCloud,
        deleteBranchInCloud,
        wipeBranchDataInCloud,
        saveTenantDataToCloud,
        fetchTenantDataFromCloud,
        listenAllBranches,
        listenAuditLogs,
        clearAuditLogsInCloud,
        ensureDefaultBranchesSeeded,
        logAudit
    };

})();
