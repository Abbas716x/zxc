/* ==================================================================
   X00716 NEXUS ENTERPRISE — Anti-Debugging & Tamper Security Core
   ================================================================== */

(function () {
    'use strict';

    const overlay = document.getElementById('security-breach-overlay');
    const killswitchOverlay = document.getElementById('killswitch-overlay');
    const killswitchMsg = document.getElementById('killswitch-msg');
    let breachActive = false;
    let killSwitchActive = false;
    let lastBreachReportTs = 0;

    // Retrieve active branch identifier safely
    function getActiveBranchId() {
        try {
            const raw = localStorage.getItem('qx716_active_branch');
            if (raw) {
                const b = JSON.parse(raw);
                if (b && b.id) return b.id;
            }
        } catch (e) {}
        return 'default';
    }

    // Radical Real Freeze: Permanent Lockdown & Server Synchronization
    async function triggerPermanentTamperFreeze(reason) {
        breachActive = true;
        const breachReason = reason || 'محاولة فحص الأكواد أو فتح أدوات المطور (DevTools / Inspect)';

        // 1. Immediately apply hard class to root DOM (Zero Refresh Bypass)
        document.documentElement.classList.add('system-frozen');

        // 2. Instantly display security freeze overlay
        if (overlay) {
            overlay.classList.remove('hidden');
        }

        const reasonTextEl = document.getElementById('breach-reason-text');
        if (reasonTextEl) {
            reasonTextEl.innerHTML = `تم رصد محاولة فحص العناصر أو فتح أدوات المطور.<br><b class="text-rose-400">تم تجميد هذا الفرع بالكامل وتوقفه عن العمل نهائياً فوراً</b> لحماية البيانات.<br><span class="text-xs text-yellow-300 font-mono mt-1 block">سبب الرصد: ${breachReason}</span><br>لا يمكن إعادة تشغيل هذا الفرع أو فك التجميد إلا من خلال تدخل المدير العام حصراً عبر الإدارة المركزية.`;
        }

        // Close any open modals or menus
        try {
            document.querySelectorAll('.modal-bd').forEach(m => m.style.display = 'none');
            const drawer = document.getElementById('drawer');
            if (drawer) drawer.classList.remove('open');
        } catch (e) {}

        // 3. Store permanent tamper lock in local and session storage
        try {
            localStorage.setItem('qx716_lockdown', JSON.stringify({
                frozen: true,
                reason: breachReason,
                timestamp: Date.now()
            }));
            sessionStorage.setItem('qx716_lockdown', 'true');

            const raw = localStorage.getItem('qx716_active_branch');
            if (raw) {
                const b = JSON.parse(raw);
                b.status = 'frozen';
                b.frozenReason = breachReason;
                localStorage.setItem('qx716_active_branch', JSON.stringify(b));
            } else {
                localStorage.setItem('qx716_active_branch', JSON.stringify({
                    id: 'branch_zayouni',
                    status: 'frozen',
                    frozenReason: breachReason
                }));
            }
        } catch (e) {}

        // 4. Report tamper breach to backend immediately to permanently freeze branch in central database
        const branchId = getActiveBranchId();
        const now = Date.now();
        if (now - lastBreachReportTs > 1500) {
            lastBreachReportTs = now;
            try {
                await fetch(`/api/branches/${branchId}/tamper`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        reason: breachReason,
                        clientDetails: {
                            userAgent: navigator.userAgent,
                            screen: `${window.innerWidth}x${window.innerHeight}`,
                            time: new Date().toISOString()
                        }
                    })
                });
            } catch (err) {
                // Secondary fallback attempt to system tamper route
                try {
                    await fetch('/api/system/tamper', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reason: breachReason })
                    });
                } catch (e2) {}
            }

            // Real-time Cloud Firebase Broadcast (Freezes in Firestore instantly)
            if (window.NexusFirebase && typeof window.NexusFirebase.freezeBranchInCloud === 'function') {
                window.NexusFirebase.freezeBranchInCloud(branchId, breachReason).catch(() => {});
            }
        }
    }

    // Restore active state ONLY when Admin explicitly unfreezes the branch
    function restoreActiveState(isServerConfirmed = false) {
        if (!isServerConfirmed) {
            console.warn('[NEXUS Security] Restore ignored: awaiting authoritative server/admin confirmation.');
            return false;
        }
        breachActive = false;
        killSwitchActive = false;
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

        // Reload views smoothly so branch immediately resumes
        setTimeout(() => {
            window.location.reload();
        }, 300);
        return true;
    }

    // 🔒 Remote Kill-Switch / Radical Deactivation Screen
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

    // 1. Context Menu (Inspect Element Protection)
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }, { capture: true });

    // 2. Strict Keyboard Shortcuts Interceptor (F12, Ctrl+Shift+I/J/C, Ctrl+U)
    document.addEventListener('keydown', function (e) {
        const isCtrlOrCmd = e.ctrlKey || e.metaKey;
        const key = e.key ? e.key.toUpperCase() : '';
        const keyCode = e.keyCode || e.which;

        // F12 Pressed -> Immediate Permanent Branch Freeze
        if (keyCode === 123 || key === 'F12') {
            e.preventDefault();
            e.stopPropagation();
            triggerPermanentTamperFreeze('الضغط على زر F12 لمحاولة فتح أدوات المطور');
            return false;
        }

        // Ctrl + Shift + I/J/C (DevTools / Console / Inspector)
        if (isCtrlOrCmd && e.shiftKey && (key === 'I' || key === 'J' || key === 'C' || keyCode === 73 || keyCode === 74 || keyCode === 67)) {
            e.preventDefault();
            e.stopPropagation();
            triggerPermanentTamperFreeze('استخدام اختصار فتح أدوات المطور (Ctrl+Shift+I/J/C)');
            return false;
        }

        // Ctrl + U (View Source Code)
        if (isCtrlOrCmd && (key === 'U' || keyCode === 85)) {
            e.preventDefault();
            e.stopPropagation();
            triggerPermanentTamperFreeze('محاولة عرض الشفرة المصدرية (Ctrl+U)');
            return false;
        }

        // Ctrl + S (Intercept Save Page)
        if (isCtrlOrCmd && (key === 'S' || keyCode === 83)) {
            e.preventDefault();
            e.stopPropagation();
            if (window.manualSave) window.manualSave(true);
            return false;
        }
    }, { capture: true });

    // 3. DevTools Timing & Debugger Detection Trap
    let devtoolsDetectionCounter = 0;
    function runDebuggerDetection() {
        if (breachActive || killSwitchActive) return;
        try {
            const start = performance.now();
            // Function constructor to evade simple static string analysis
            const trap = new Function('debugger');
            trap();
            const elapsed = performance.now() - start;

            if (elapsed > 120) {
                devtoolsDetectionCounter++;
                if (devtoolsDetectionCounter >= 2) {
                    triggerPermanentTamperFreeze('رصد تشغيل مصيدة تصحيح الأخطاء ومحاولة تنقيح الكود (Debugger Trap)');
                }
            } else {
                devtoolsDetectionCounter = 0;
            }
        } catch (e) {}
    }

    // Run periodic detector
    setInterval(runDebuggerDetection, 3500);

    // 4. Console Inspection Probe Trap
    try {
        const probe = new Image();
        Object.defineProperty(probe, 'id', {
            get: function () {
                triggerPermanentTamperFreeze('رصد استدعاء وفحص كائنات وحدة التحكم (Console Probe)');
            }
        });
        // Non-intrusive probe log
        setTimeout(() => {
            console.log('%c ', probe);
        }, 1000);
    } catch (e) {}

    // Immediate pre-enforcement on initial script load
    try {
        const lock = localStorage.getItem('qx716_lockdown');
        const branchRaw = localStorage.getItem('qx716_active_branch');
        let shouldLock = false;
        let lockReason = '';
        if (lock) {
            const l = JSON.parse(lock);
            if (l && l.frozen) {
                shouldLock = true;
                lockReason = l.reason || 'إغلاق أمني دائم مسبق (محاولة تجاوز التجميد عبر التحديث)';
            }
        }
        if (!shouldLock && branchRaw) {
            const b = JSON.parse(branchRaw);
            if (b && b.status === 'frozen') {
                shouldLock = true;
                lockReason = b.frozenReason || 'تم تجميد الفرع بقرار الإدارة المركزية';
            }
        }
        if (shouldLock) {
            triggerPermanentTamperFreeze(lockReason);
        }
    } catch (e) {}

    // Public Security API
    window.SecurityEngine = {
        triggerBreach: triggerPermanentTamperFreeze,
        triggerKillSwitchUI: triggerKillSwitchUI,
        restoreActiveState: restoreActiveState,
        isBreachActive: () => breachActive,
        isKillSwitchActive: () => killSwitchActive
    };

})();
