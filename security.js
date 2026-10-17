/* ==================================================================
   X00716 NEXUS ENTERPRISE — Security & Self-Destruction Enforcer
   ================================================================== */

(function () {
    'use strict';

    const ADMIN_SECRET_PASS = '19682008';
    const overlay = document.getElementById('security-breach-overlay');
    const killswitchOverlay = document.getElementById('killswitch-overlay');
    const killswitchMsg = document.getElementById('killswitch-msg');
    let breachActive = false;
    let killSwitchActive = false;

    // Execute Immediate Client-Side Data Sanitization & Self-Destruction
    function executeSelfDestruction(reason) {
        try {
            console.error('🚨 SELF-DESTRUCTION ENGAGED:', reason);

            // 1. Purge sensitive active local sessions to prevent data theft
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('qx716_') || key.includes('nexus') || key.includes('branch'))) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
            sessionStorage.clear();

            // 2. Terminate active modals and menus
            document.querySelectorAll('.modal-bd').forEach(m => m.style.display = 'none');
            const drawer = document.getElementById('drawer');
            if (drawer) drawer.classList.remove('open');

            // 3. Display security breach interface
            if (overlay) {
                overlay.classList.remove('hidden');
            }

            // 4. Dispatch cloud security incident log
            if (window.BackendEngine && typeof window.BackendEngine.logAuditEvent === 'function') {
                window.BackendEngine.logAuditEvent('SELF_DESTRUCT_TRIGGERED', `خرق أمني أدى للتدمير الذاتي: ${reason}`);
            }
        } catch (e) {
            console.warn('Silent boundary in self-destruction routine:', e);
        }
    }

    // Trigger Screen Blur & Security Overlay
    function triggerBreach(reason) {
        if (breachActive || killSwitchActive) return;
        breachActive = true;
        executeSelfDestruction(reason);
    }

    // Dismiss Security Overlay & Re-authenticate
    function dismissWarning() {
        if (overlay) {
            overlay.classList.add('hidden');
        }
        breachActive = false;
        window.location.reload();
    }

    // 🔒 Remote Kill-Switch Enforcer
    function triggerKillSwitchUI(reasonText) {
        killSwitchActive = true;
        try {
            if (killswitchMsg) {
                killswitchMsg.textContent = reasonText || 'تم تعليق عمل النظام أو إيقاف ترخيص هذا الفرع بأمر سحابي مركزي طارئ.';
            }
            if (killswitchOverlay) {
                killswitchOverlay.classList.remove('hidden');
            }
            document.querySelectorAll('.modal-bd').forEach(m => m.style.display = 'none');
            const drawer = document.getElementById('drawer');
            if (drawer) drawer.classList.remove('open');
        } catch (e) {}
    }

    // Context Menu Handling
    document.addEventListener('contextmenu', function (e) {
        // Allow normal operation while preventing raw browser menu where appropriate
        e.preventDefault();
        return false;
    }, { capture: true });

    // Shortcut Protection (Prevent default browser inspect/save without destroying session data)
    document.addEventListener('keydown', function (e) {
        const isCtrlOrCmd = e.ctrlKey || e.metaKey;
        const key = e.key ? e.key.toUpperCase() : '';
        const keyCode = e.keyCode || e.which;

        // F12 Key
        if (keyCode === 123 || key === 'F12') {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }

        // Ctrl + Shift + I/J/C (Inspect / Console / Selector)
        if (isCtrlOrCmd && e.shiftKey && (key === 'I' || key === 'J' || key === 'C' || keyCode === 73 || keyCode === 74 || keyCode === 67)) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }

        // Ctrl + U (View Source)
        if (isCtrlOrCmd && (key === 'U' || keyCode === 85)) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }

        // Ctrl + S (Save Page) - redirect to app manual save
        if (isCtrlOrCmd && (key === 'S' || keyCode === 83)) {
            e.preventDefault();
            e.stopPropagation();
            if (window.manualSave) window.manualSave(true);
            return false;
        }
    }, { capture: true });

    // ==================== STEALTH MASTER ADMIN OPERATIONS ====================

    // Secret Password Verification Prompt
    async function promptAdminPassword() {
        try {
            if (!window.DialogEngine || typeof window.DialogEngine.prompt !== 'function') {
                const pass = prompt('🔐 أدخل رمز التحقق السري للأدمن:');
                if (pass === ADMIN_SECRET_PASS) {
                    await openMasterAdminPanel();
                    return true;
                }
                alert('رمز الحماية غير صحيح!');
                return false;
            }

            const inputKey = await window.DialogEngine.prompt(
                'أدخل رمز التحقق السري للدخول إلى لوحة المدير العام (Master Admin):',
                'التحقق الأمني المركزي'
            );

            if (inputKey === ADMIN_SECRET_PASS) {
                await openMasterAdminPanel();
                return true;
            } else if (inputKey !== null) {
                window.DialogEngine.alert('رمز الحماية غير صحيح! تم رفض الوصول وتسجيل المحاولة في سجل الأمان.', 'خطأ أمني');
                if (window.BackendEngine && typeof window.BackendEngine.logAuditEvent === 'function') {
                    window.BackendEngine.logAuditEvent('FAILED_ADMIN_LOGIN', 'محاولة فاشلة لدخول الأدمن برمز خاطئ');
                }
                return false;
            }
        } catch (e) {
            console.warn('Silent error in admin password prompt:', e);
        }
        return false;
    }

    // Open & Populate Master Admin Panel (Full-Page View State)
    async function openMasterAdminPanel() {
        try {
            if (window.switchView) {
                window.switchView('admin-master');
            }
            await refreshAdminData();
        } catch (e) {
            console.warn('Error opening master admin panel:', e);
        }
    }

    // Comprehensive Refresh of Admin Data & Quick Stats
    async function refreshAdminData() {
        try {
            const branches = await renderAdminBranches();
            const logs = await renderAdminAuditLogs();
            updateAdminStats(branches, logs);
        } catch (e) {}
    }

    function updateAdminStats(branches = [], logs = []) {
        try {
            const total = Array.isArray(branches) ? branches.length : 0;
            const active = Array.isArray(branches) ? branches.filter(b => b.status === 'active').length : 0;
            const frozen = Array.isArray(branches) ? branches.filter(b => b.status === 'frozen').length : 0;
            const logCount = Array.isArray(logs) ? logs.length : 0;

            const elTotal = document.getElementById('admin-stat-total-branches');
            const elActive = document.getElementById('admin-stat-active-branches');
            const elFrozen = document.getElementById('admin-stat-frozen-branches');
            const elLogs = document.getElementById('admin-stat-total-logs');
            const elBadge = document.getElementById('admin-branch-count-badge');

            if (elTotal) elTotal.textContent = total;
            if (elActive) elActive.textContent = active;
            if (elFrozen) elFrozen.textContent = frozen;
            if (elLogs) elLogs.textContent = logCount;
            if (elBadge) elBadge.textContent = `${total} فرع مسجل (${active} نشط)`;
        } catch (e) {}
    }

    // Render Branches with Live Status, Freeze, and Delete Actions
    async function renderAdminBranches() {
        const container = document.getElementById('admin-branches-list');
        if (!container || !window.BackendEngine) return [];

        try {
            const branches = await window.BackendEngine.adminLoadBranches();
            if (!branches || branches.length === 0) {
                container.innerHTML = `<div class="text-xs text-gray-500 text-center py-8 font-tajawal glass rounded-xl">لا توجد فروع مسجلة حالياً</div>`;
                updateAdminStats([], []);
                return [];
            }

            container.innerHTML = branches.map(b => {
                const isFrozen = b.status === 'frozen';
                return `
                    <div class="glass p-3.5 flex items-center justify-between gap-3 text-xs font-tajawal hover:border-cyan-400/40 transition-colors">
                        <div>
                            <div class="font-bold text-white flex items-center gap-2">
                                <span class="text-sm font-black">${escapeHtml(b.name)}</span>
                                <span class="badge ${isFrozen ? 'badge-expired' : 'badge-live'} text-[9px]">
                                    ${isFrozen ? 'مجمد ❄️' : 'نشط ●'}
                                </span>
                            </div>
                            <div class="text-[10px] text-cyan-400 font-mono mt-0.5 flex items-center gap-2">
                                <span>user: <b>${escapeHtml(b.username)}</b></span>
                                <span class="text-gray-500">|</span>
                                <span class="text-gray-400">${b.createdAt ? b.createdAt.slice(0, 10) : 'مسجل'}</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <button class="btn btn-ghost py-1.5 px-3 text-[11px] ${isFrozen ? 'text-emerald-400 border-emerald-500/40' : 'text-yellow-400 border-yellow-500/40'}"
                                    data-action="branch-freeze"
                                    data-id="${b.id}"
                                    data-status="${b.status || 'active'}"
                                    title="${isFrozen ? 'إلغاء التجميد' : 'تجميد الفرع'}"
                                    onclick="window.SecurityEngine.toggleBranchFreeze('${b.id}', '${b.status}')">
                                ${isFrozen ? '▶ تفعيل' : '❄️ تجميد'}
                            </button>
                            <button class="btn btn-danger py-1.5 px-3 text-[11px]"
                                    data-action="branch-delete"
                                    data-id="${b.id}"
                                    data-name="${escapeHtml(b.name)}"
                                    title="حذف الفرع وبياناته نهائياً"
                                    onclick="window.SecurityEngine.handleDeleteBranch('${b.id}', '${escapeHtml(b.name)}')">
                                🗑️ حذف
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            return branches;
        } catch (e) {
            container.innerHTML = `<div class="text-xs text-red-400 text-center py-2 font-tajawal">تعذر جلب الفروع</div>`;
            return [];
        }
    }

    // Render Audit Logs
    async function renderAdminAuditLogs() {
        const container = document.getElementById('admin-audit-logs');
        if (!container || !window.BackendEngine) return [];

        try {
            const logs = await window.BackendEngine.adminLoadAuditLogs();
            if (!logs || logs.length === 0) {
                container.innerHTML = `<div class="text-[10px] text-gray-500 text-center py-6 font-tajawal glass rounded-xl">لا توجد سجلات بعد</div>`;
                return [];
            }

            container.innerHTML = logs.map(l => {
                const time = l.timestamp ? new Date(l.timestamp).toLocaleTimeString('en-GB') : '--:--:--';
                const date = l.timestamp ? new Date(l.timestamp).toISOString().slice(0, 10) : '';
                return `
                    <div class="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-start justify-between gap-3 text-xs hover:border-cyan-500/30 transition-colors">
                        <div>
                            <span class="text-cyan-400 font-bold font-mono">[${escapeHtml(l.action)}]</span>
                            <span class="text-gray-200 ml-1.5 font-tajawal">${escapeHtml(l.details || '')}</span>
                            <span class="text-fuchsia-400 block text-[10px] mt-0.5 font-mono">الفرع: ${escapeHtml(l.branchName || 'النظام')} (${escapeHtml(l.branchUser || '-')})</span>
                        </div>
                        <div class="text-right text-[10px] text-gray-500 whitespace-nowrap font-mono">
                            <div>${time}</div>
                            <div class="text-[9px] text-gray-600">${date}</div>
                        </div>
                    </div>
                `;
            }).join('');

            return logs;
        } catch (e) {
            container.innerHTML = `<div class="text-[10px] text-red-400 text-center py-2 font-tajawal">تعذر جلب سجلات المراقبة</div>`;
            return [];
        }
    }

    // Create New Branch Handler (With Instant Real-Time Propagation)
    async function handleAdminCreateBranch() {
        const nameEl = document.getElementById('admin-new-branch-name');
        const userEl = document.getElementById('admin-new-branch-user');
        const passEl = document.getElementById('admin-new-branch-pass');

        const name = nameEl.value.trim();
        const user = userEl.value.trim();
        const pass = passEl.value.trim();

        if (!name || !user || !pass) {
            if (window.DialogEngine) window.DialogEngine.alert('يرجى ملء جميع حقول الفرع الجديد', 'تنبيه');
            return;
        }

        try {
            const newBranch = await window.BackendEngine.adminCreateBranch(name, user, pass);
            nameEl.value = '';
            userEl.value = '';
            passEl.value = '';

            // Instant Real-Time Propagation across the site
            await refreshAdminData();
            window.dispatchEvent(new CustomEvent('nexus:branches-updated', { detail: { action: 'create', branch: newBranch } }));

            if (window.DialogEngine) {
                await window.DialogEngine.alert(`تم إنشاء وتفعيل الفرع بنجاح:\nالاسم: ${name}\nالمستخدم: ${user}\nالبيانات معزولة سحابياً بشكل فوري ومستقل.`, 'نجاح الإنشاء');
            }
        } catch (err) {
            if (window.DialogEngine) window.DialogEngine.alert(err.message, 'خطأ في الإنشاء');
        }
    }

    // Delete Branch Handler (With Instant Real-Time Propagation)
    async function handleDeleteBranch(branchId, branchName) {
        if (!window.DialogEngine || !window.BackendEngine) return;

        const ok = await window.DialogEngine.confirm(
            `⚠️ تحذير نهائي: هل أنت متأكد من حذف فرع "${branchName}" بالكامل؟\n\nسيتم مسح وثيقة الفرع السحابية، وجميع الطاولات والديون والفواتير التابعة له نهائياً بدون إمكانية التراجع!`,
            'حذف فرع نهائياً'
        );

        if (!ok) return;

        try {
            await window.BackendEngine.adminDeleteBranch(branchId);
            
            // Instant Real-Time Propagation across the site
            await refreshAdminData();
            window.dispatchEvent(new CustomEvent('nexus:branches-updated', { detail: { action: 'delete', branchId } }));

            window.DialogEngine.alert(`تم حذف فرع "${branchName}" وكافة بياناته المعزولة بنجاح.`, 'تأكيد الحذف');
        } catch (err) {
            window.DialogEngine.alert(err.message, 'خطأ في الحذف');
        }
    }

    // Toggle Freeze on Branch (With Instant Real-Time Propagation)
    async function toggleBranchFreeze(branchId, currentStatus) {
        if (!window.BackendEngine) return;
        try {
            const newStatus = await window.BackendEngine.adminToggleBranchStatus(branchId, currentStatus);
            
            // Instant Real-Time Propagation across the site
            await refreshAdminData();
            window.dispatchEvent(new CustomEvent('nexus:branches-updated', { detail: { action: 'freeze', branchId, status: newStatus } }));

            // If current tenant was frozen, enforce immediate UI lockdown
            const currentTenant = window.BackendEngine.getCurrentTenant();
            if (currentTenant && currentTenant.id === branchId && newStatus === 'frozen') {
                triggerKillSwitchUI('تم تجميد هذا الفرع بأمر إداري مركزي. يرجى مراجعة الإدارة العامة.');
            }
        } catch (e) {
            console.error('Failed to toggle branch status:', e);
        }
    }

    async function clearAuditLogs() {
        if (!window.DialogEngine || !window.BackendEngine) return;
        const ok = await window.DialogEngine.confirm('هل أنت متأكد من مسح جميع سجلات المراقبة؟', 'مسح السجلات');
        if (!ok) return;

        try {
            localStorage.removeItem('qx716_local_audit_logs');
            await refreshAdminData();
            if (window.DialogEngine) window.DialogEngine.alert('تم مسح السجلات بنجاح.', 'مسح السجلات');
        } catch (e) {}
    }

    function escapeHtml(s) {
        return String(s || '').replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[m]);
    }

    // Global Real-Time Listener for Cross-Component & Cross-Tab Admin Sync
    window.addEventListener('nexus:branches-updated', () => {
        refreshAdminData();
    });
    window.addEventListener('nexus:audit-logs-updated', () => {
        renderAdminAuditLogs();
    });

    // Public Security API
    window.SecurityEngine = {
        dismissWarning,
        triggerKillSwitchUI,
        promptAdminPassword,
        openMasterAdminPanel,
        refreshAdminData,
        renderAdminBranches,
        renderAdminAuditLogs,
        handleAdminCreateBranch,
        handleDeleteBranch,
        toggleBranchFreeze,
        clearAuditLogs
    };
})();
