/* ==================================================================
   X00716 NEXUS ENTERPRISE — Security Core & Administrative Lockdown
   Admin-Controlled Branch Lockdown & Pure Client-Side Architecture
   ================================================================== */

(function () {
    'use strict';

    const overlay = document.getElementById('security-breach-overlay');
    const killswitchOverlay = document.getElementById('killswitch-overlay');
    const killswitchMsg = document.getElementById('killswitch-msg');
    let breachActive = false;
    let killSwitchActive = false;

    // Retrieve active branch identifier safely
    function getActiveBranchId() {
        try {
            const raw = localStorage.getItem('qx716_active_branch');
            if (raw) {
                const b = JSON.parse(raw);
                if (b && b.id) return b.id;
            }
        } catch (e) {}
        return 'branch_zayouni';
    }

    // Freeze Branch UI (Controlled exclusively by Admin Decision)
    function triggerPermanentTamperFreeze(reason) {
        breachActive = true;
        const breachReason = reason || 'تم تجميد هذا الفرع بقرار من الإدارة المركزية';

        // 1. Apply hard class to root DOM
        document.documentElement.classList.add('system-frozen');

        // 2. Display security freeze overlay
        if (overlay) {
            overlay.classList.remove('hidden');
        }

        const reasonTextEl = document.getElementById('breach-reason-text');
        if (reasonTextEl) {
            reasonTextEl.innerHTML = `تم تجميد هذا الفرع بقرار الإدارة المركزية.<br><b class="text-rose-400">الفرع متوقف مؤقتاً عن العمل</b> لحماية البيانات والمراجعة.<br><span class="text-xs text-yellow-300 font-mono mt-1 block">سبب التجميد: ${breachReason}</span><br>يمكن إعادة تفعيل وتشغيل هذا الفرع فوراً من خلال زر "فك التجميد" في لوحة الإدارة المركزية.`;
        }

        // Close open modals
        try {
            document.querySelectorAll('.modal-bd').forEach(m => m.style.display = 'none');
            const drawer = document.getElementById('drawer');
            if (drawer) drawer.classList.remove('open');
        } catch (e) {}

        // Store lockdown in local storage
        try {
            localStorage.setItem('qx716_lockdown', JSON.stringify({
                frozen: true,
                reason: breachReason,
                timestamp: Date.now()
            }));

            const raw = localStorage.getItem('qx716_active_branch');
            if (raw) {
                const b = JSON.parse(raw);
                b.status = 'frozen';
                b.frozenReason = breachReason;
                localStorage.setItem('qx716_active_branch', JSON.stringify(b));
            }
        } catch (e) {}
    }

    // Restore active state (Unfreeze Branch) — Called when Admin unlocks in Firestore
    function restoreActiveState(isServerConfirmed = false) {
        breachActive = false;
        killSwitchActive = false;
        window.__JUST_UNFROZEN__ = Date.now();
        window.__NEXUS_HARD_FROZEN__ = false;
        window.__NEXUS_HARD_TERMINATED__ = false;

        document.documentElement.classList.remove('system-frozen');
        document.documentElement.classList.remove('system-terminated');

        if (overlay) overlay.classList.add('hidden');
        if (killswitchOverlay) killswitchOverlay.classList.add('hidden');

        try {
            localStorage.removeItem('qx716_lockdown');
            sessionStorage.removeItem('qx716_lockdown');

            const raw = localStorage.getItem('qx716_active_branch');
            if (raw) {
                const b = JSON.parse(raw);
                b.status = 'active';
                delete b.frozenReason;
                delete b.frozenAt;
                localStorage.setItem('qx716_active_branch', JSON.stringify(b));
            }
        } catch (e) {}

        console.log('✅ [NEXUS Security] Branch active state successfully restored by Admin.');
        return true;
    }

    // Remote Kill-Switch / Radical Deactivation Screen
    function triggerKillSwitchUI(reasonText) {
        killSwitchActive = true;
        document.documentElement.classList.add('system-terminated');
        try {
            if (killswitchMsg) {
                killswitchMsg.textContent = reasonText || 'تم إيقاف وتعطيل هذا الفرع بشكل جذري ونهائي بقرار الإدارة العامة المركزية.';
            }
            if (killswitchOverlay) {
                killswitchOverlay.classList.remove('hidden');
            }
            document.querySelectorAll('.modal-bd').forEach(m => m.style.display = 'none');
            const drawer = document.getElementById('drawer');
            if (drawer) drawer.classList.remove('open');
        } catch (e) {}
    }

    // Public Security API
    window.SecurityEngine = {
        triggerBreach: triggerPermanentTamperFreeze,
        triggerKillSwitchUI: triggerKillSwitchUI,
        restoreActiveState: restoreActiveState,
        isBreachActive: () => breachActive,
        isKillSwitchActive: () => killSwitchActive
    };

    // Auto-listen to Firestore branch status if Firebase client is ready
    function setupRealtimeSecurityWatcher() {
        const branchId = getActiveBranchId();
        if (window.NexusFirebase && typeof window.NexusFirebase.listenBranchRealtime === 'function' && branchId) {
            window.NexusFirebase.listenBranchRealtime(branchId, (branchData) => {
                if (!branchData) return;
                if (branchData.status === 'active') {
                    restoreActiveState(true);
                } else if (branchData.status === 'frozen') {
                    triggerPermanentTamperFreeze(branchData.frozenReason);
                } else if (branchData.status === 'deactivated') {
                    triggerKillSwitchUI(branchData.deactivatedReason);
                }
            });
        }
    }

    if (typeof window !== 'undefined') {
        window.addEventListener('load', () => {
            setTimeout(setupRealtimeSecurityWatcher, 400);
        });
    }

})();
