// county-core.js — County 模組載入器 + 初始化整合 + 自診斷
(function() {
    window.County = window.County || {};
    var C = window.County;
    C.modules = {};

    // 啟動探針 — 全域暴露供 Bootstrap Canary 存取
    window._countyBoot = window._countyBoot || { time: Date.now(), modules: {} };
    var _countyBoot = window._countyBoot;

    C.register = function(name, factory) {
        var entry = { at: new Date().toLocaleTimeString() };
        try {
            C.modules[name] = factory(C);
            entry.status = 'loaded';
            entry.size = factory.toString().length + 'ch';
            console.log('[County] Module loaded:', name);
        } catch(e) {
            console.error('[County] Module FAILED (' + name + '):', e.message);
            entry.status = 'failed';
            entry.error = e.message;
        }
        _countyBoot.modules[name] = entry;
    };
    C.get = function(name) {
        return C.modules[name] || null;
    };
    C.getHealthReport = function() {
        return {
            modules: _countyBoot.modules || {},
            bootTime: _countyBoot.time,
            online: navigator.onLine,
            url: window.location.href,
            userAgent: navigator.userAgent
        };
    };
    // 延遲初始化：所有模組註冊完成後由 DOMContentLoaded 觸發
    C.init = function() {
        _countyBoot.ok = true; // 清除啟動探針
        console.log('[County] ===== System Initialization =====');
        var names = Object.keys(C.modules);
        console.log('[County] Modules registered (' + names.length + '):', names.join(', '));
        names.forEach(function(name) {
            var mod = C.modules[name];
            if (typeof mod.init === 'function') {
                try {
                    mod.init(C);
                    console.log('[County] Module initialized:', name);
                } catch(e) {
                    console.error('[County] Module init FAILED (' + name + '):', e.message);
                }
            }
        });
        console.log('[County] System ready');
    };
    // 自動在 DOMContentLoaded 時呼叫 C.init()（在 window.onload 之前）
    document.addEventListener('DOMContentLoaded', function() {
        C.init();
    });

    // ⛑️ 全局錯誤邊界 — runtime error toast + 上傳後端
    window.addEventListener('error', function(e) {
        var msg = e.message || '未知錯誤';
        var loc = e.filename || '';
        var line = e.lineno || '';
        var errStr = msg + ' at ' + loc + ':' + line;
        var toast = document.getElementById('errorToast') || document.createElement('div');
        if (!toast.id) {
            toast.id = 'errorToast';
            toast.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;background:#dc2626;color:#fff;padding:12px 20px;border-radius:8px;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,0.5);max-width:400px;animation:slideUp 0.3s ease-out;font-family:sans-serif;';
            document.body.appendChild(toast);
        }
        toast.innerHTML = '⚠️ ' + msg + '<br><span style="font-size:10px;color:#fca5a5;">' + loc + ':' + line + '</span>';
        toast.style.display = 'block';
        clearTimeout(toast._timer);
        toast._timer = setTimeout(function(){ toast.style.display = 'none'; }, 8000);
        // 上傳到後端
        try {
            fetch('/api/log/client', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify([{ts: new Date().toISOString(), level:'error', msg: 'Runtime: ' + errStr}])
            });
        } catch(ex) {}
    });
})();
