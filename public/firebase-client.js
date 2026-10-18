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
                    // Admin unlocked the branch! Restore active state instantly
                    if (window.SecurityEngine && typeof window.SecurityEngine.restoreActiveState === 'function') {
                        window.SecurityEngine.restoreActiveState();
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
            await db.collection('branches').doc(branchId).set(payload, { merge: true });

            // Record security breach record
            await db.collection('security_breaches').add({
                branchId: branchId,
                reason: reason || 'محاولة تلاعب / فحص غير مصرح به',
                timestamp: new Date().toISOString(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

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
            await db.collection('branches').doc(branchId).set({
                status: 'active',
                frozenReason: null,
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
     * Admin: Listen to all branches live
     */
    function listenAllBranches(onBranchesUpdate) {
        if (!db) return null;
        try {
            return db.collection('branches').onSnapshot((snapshot) => {
                const branches = [];
                snapshot.forEach((doc) => {
                    branches.push({ id: doc.id, ...doc.data() });
                });
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
     * Audit Logging
     */
    async function logAudit(entry) {
        if (!db || !entry) return;
        try {
            await db.collection('audit_logs').add({
                ...entry,
                timestamp: new Date().toISOString(),
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
        saveTenantDataToCloud,
        fetchTenantDataFromCloud,
        listenAllBranches,
        logAudit
    };

})();
