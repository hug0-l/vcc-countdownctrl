// county-log.js — 日誌管理模組
County.register('Log', function(C) {
    var log = {};

    var CLIENT_LOG_KEY = 'vcc_client_logs';
    var CLIENT_LOG_MAX = 1000;
    var CLIENT_LOG_TRIM = 500;
    var _clientLogUploadBuffer = [];
    var CLIENT_LOG_UPLOAD_INTERVAL = 30000;

    log._clientLogUploadBuffer = _clientLogUploadBuffer;

    log.persistClientLog = function(isoTimestamp, type, message) {
        try {
            var logs = [];
            var raw = localStorage.getItem(CLIENT_LOG_KEY);
            if (raw) {
                try { logs = JSON.parse(raw); } catch(e) { logs = []; }
            }
            var cutoff = Date.now() - 86400000;
            logs = logs.filter(function(entry) {
                return new Date(entry.t).getTime() > cutoff;
            });
            logs.push({ t: isoTimestamp, l: type, m: message });
            if (logs.length > CLIENT_LOG_MAX) {
                logs = logs.slice(logs.length - CLIENT_LOG_TRIM);
            }
            localStorage.setItem(CLIENT_LOG_KEY, JSON.stringify(logs));
        } catch(e) {
            var consoleEl = document.getElementById('consoleTerminal');
            if (consoleEl) consoleEl.innerHTML += '<div class="console-line" style="color:#ef4444;">\u26a0\ufe0f \u65e5\u8a8c\u7de9\u885d\u5340\u5beb\u5165\u5931\u6557</div>';
        }
    };

    log.writeLog = function(message, type) {
        if (type === undefined) type = 'info';
        var consoleEl = document.getElementById('consoleTerminal');
        var now = new Date();
        var timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');

        if (consoleEl) {
            var line = document.createElement('div');
            line.className = 'console-line';
            if (type === 'error') line.style.color = '#ef4444';
            if (type === 'warn') line.style.color = '#f59e0b';
            line.innerHTML = '<span class="console-time">[' + timeStr + ']</span>' + message;
            consoleEl.appendChild(line);
            consoleEl.scrollTop = consoleEl.scrollHeight;
        }

        if (type === 'error') console.error('[VCC]', message);
        else if (type === 'warn') console.warn('[VCC]', message);
        else console.log('[VCC]', message);

        log.persistClientLog(now.toISOString(), type, message);
        _clientLogUploadBuffer.push({ ts: now.toISOString(), level: type, msg: message });
    };

    log.exportClientLog = function() {
        try {
            var raw = localStorage.getItem(CLIENT_LOG_KEY);
            if (!raw) { alert('\u5c1a\u7121\u65e5\u8a8c\u8a18\u9304'); return; }
            var logs = JSON.parse(raw);
            var text = '# County Client Log \u2014 ' + new Date().toISOString().split('T')[0] + '\n';
            text += '# Lines: ' + logs.length + '\n';
            text += '# Generated: ' + new Date().toISOString() + '\n';
            text += '# ========================================\n\n';
            logs.forEach(function(entry) {
                var levelMap = { info:'INFO', warn:'WARN', error:'ERROR', success:'INFO' };
                var level = levelMap[entry.l] || entry.l.toUpperCase();
                text += '[' + entry.t + '] [' + level + '] ' + entry.m + '\n';
            });
            var blob = new Blob([text], { type: 'text/plain' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'county_client_log_' + new Date().toISOString().split('T')[0] + '.log';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            log.writeLog('\U0001f4cb \u5ba2\u6236\u7aef\u65e5\u8a8c\u5df2\u532f\u51fa (' + logs.length + ' \u884c)', 'success');
        } catch(e) {
            alert('\u532f\u51fa\u5931\u6557: ' + e.message);
        }
    };

    log.fetchServerLog = function() {
        var area = document.getElementById('serverLogArea');
        var btn = document.getElementById('btnFetchServerLog');
        if (!area) return;
        if (btn) { btn.innerText = '\u23f3 \u8f09\u5165\u4e2d\u2026'; btn.disabled = true; }
        fetch('/api/log/recent?lines=200', { signal: AbortSignal.timeout(5000) })
            .then(function(res) { return res.text(); })
            .then(function(text) {
                area.value = text;
                var lineCount = text.split('\n').filter(function(l){ return l.trim(); }).length;
                var countEl = document.getElementById('serverLogLines');
                if (countEl) countEl.textContent = lineCount;
            })
            .catch(function() {
                area.value = '\u26a0\ufe0f \u7121\u6cd5\u9023\u7dda\u81f3\u4f3a\u670d\u5668\uff0c\u8acb\u78ba\u8a8d server.py \u6b63\u5728\u57f7\u884c';
            })
            .finally(function() {
                if (btn) { btn.innerText = '\U0001f504 \u5237\u65b0'; btn.disabled = false; }
            });
    };

    log.downloadServerLog = function() {
        var area = document.getElementById('serverLogArea');
        if (!area || !area.value.trim()) { alert('\u5c1a\u7121\u65e5\u8a8c\u5167\u5bb9\uff0c\u8acb\u5148\u9ede\u64ca\u300c\u5237\u65b0\u300d'); return; }
        var blob = new Blob([area.value], { type: 'text/plain' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'county_server_log_' + new Date().toISOString().split('T')[0] + '.log';
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        log.writeLog('\u2b07 \u4f3a\u670d\u5668\u65e5\u8a8c\u5df2\u532f\u51fa', 'success');
    };

    // Auto-upload timer for client logs
    setInterval(function() {
        if (_clientLogUploadBuffer.length === 0) return;
        var batch = _clientLogUploadBuffer.splice(0, _clientLogUploadBuffer.length);
        var body = JSON.stringify(batch);
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/log/client', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(body);
        xhr.onerror = function() {
            _clientLogUploadBuffer = batch.concat(_clientLogUploadBuffer);
            if (_clientLogUploadBuffer.length > 5000) {
                _clientLogUploadBuffer = _clientLogUploadBuffer.slice(-5000);
            }
        };
    }, CLIENT_LOG_UPLOAD_INTERVAL);

    return log;
});
