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
                return b.id || 'default_tenant';
            }
        } catch (e) {}
        return 'active_branch';
    }

    // Radical Real Freeze: Permanent Lockdown & Server Synchronization
    async function triggerPermanentTamperFreeze(reason) {
        if (breachActive) return;
        breachActive = true;

        const branchId = getActiveBranchId();
        const now = Date.now();

        // 1. Instantly display security freeze overlay
        if (overlay) {
            overlay.classList.remove('hidden');
        }

        // Close any open modals or menus
        try {
            document.querySelectorAll('.modal-bd').forEach(m => m.style.display = 'none');
            const drawer = document.getElementById('drawer');
            if (drawer) drawer.classList.remove('open');
        } catch (e) {}

        // 2. Report tamper breach to backend immediately to freeze branch in database
        if (now - lastBreachReportTs > 2000) {
            lastBreachReportTs = now;
            try {
                await fetch(`/api/branches/${branchId}/tamper`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        reason: reason || 'محاولة فحص الأكواد أو فتح أدوات المطور (DevTools/Inspect)',
                        clientDetails: {
                            userAgent: navigator.userAgent,
                            screen: `${window.innerWidth}x${window.innerHeight}`,
                            time: new Date().toISOString()
                        }
                    })
                });
            } catch (err) {
                console.warn('Tamper report dispatched locally');
            }
        }

        // 3. Mark locally as frozen as well
        try {
            const raw = localStorage.getItem('qx716_active_branch');
            if (raw) {
                const b = JSON.parse(raw);
                b.status = 'frozen';
                b.frozenReason = reason;
                localStorage.setItem('qx716_active_branch', JSON.stringify(b));
            }
        } catch (e) {}
    }

    // 🔒 Remote Kill-Switch / Radical Deactivation Screen
    function triggerKillSwitchUI(reasonText) {
        killSwitchActive = true;
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

    // Public Security API
    window.SecurityEngine = {
        triggerBreach: triggerPermanentTamperFreeze,
        triggerKillSwitchUI: triggerKillSwitchUI,
        isBreachActive: () => breachActive,
        isKillSwitchActive: () => killSwitchActive
    };

})();
