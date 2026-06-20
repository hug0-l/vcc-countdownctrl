// county-time.js — 時碼轉換、時鐘、NTP 時間模組
County.register('Time', function(C) {
    var T = {};

    // ===== Timecode core (支援動態 FPS) =====

    T.dateToTimecode = function(d) {
        var fr = window.frameRate || 25;
        var hh = String(d.getHours()).padStart(2, '0');
        var mm = String(d.getMinutes()).padStart(2, '0');
        var ss = String(d.getSeconds()).padStart(2, '0');
        var ff = String(Math.floor(d.getMilliseconds() / (1000 / fr))).padStart(2, '0');
        return hh + ':' + mm + ':' + ss + ':' + ff;
    };

    T.timecodeToTotalFrames = function(tc) {
        var parts = tc.split(':');
        if (parts.length !== 4) return 0;
        var fr = window.frameRate || 25;
        return (parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10)) * fr + parseInt(parts[3], 10);
    };

    T.totalFramesToTimecode = function(f) {
        if (f < 0) f = 0;
        var fr = window.frameRate || 25;
        var ff = f % fr;
        var totalSecs = Math.floor(f / fr);
        return String(Math.floor(totalSecs / 3600) % 24).padStart(2, '0') + ':' +
               String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0') + ':' +
               String(totalSecs % 60).padStart(2, '0') + ':' +
               String(ff).padStart(2, '0');
    };

    // ===== Time formatting =====

    T.formatTimeInAppTz = function(isoStr, style) {
        if (!isoStr) return '\u2014';
        var tz = (window.appConfig && window.appConfig.timezone) ? window.appConfig.timezone : Intl.DateTimeFormat().resolvedOptions().timeZone;
        try {
            var d = new Date(isoStr);
            if (style === 'time') return d.toLocaleTimeString('zh-HK', { timeZone: tz, hour12: false });
            if (style === 'datetime') return d.toLocaleString('zh-HK', { timeZone: tz, hour12: false });
            return d.toLocaleString('zh-HK', { timeZone: tz });
        } catch(e) { return isoStr; }
    };

    T.getCalibratedDate = function() {
        var tz = (window.appConfig && window.appConfig.timezone) ? window.appConfig.timezone : Intl.DateTimeFormat().resolvedOptions().timeZone;
        var now = new Date();
        try {
            var opts = { timeZone: tz, hour12: false };
            var dateStr = now.toLocaleDateString('en-CA', opts);
            var timeStr = now.toLocaleTimeString('en-US', opts);
            var dp = dateStr.split('-');
            var tp = timeStr.split(':');
            return new Date(parseInt(dp[0]), parseInt(dp[1]) - 1, parseInt(dp[2]), parseInt(tp[0]), parseInt(tp[1]), parseInt(tp[2]), now.getMilliseconds());
        } catch(e) {
            return new Date(Date.now() + (window.timeOffset || 0));
        }
    };

    T.getTodayStr = function() {
        var tz = (window.appConfig && window.appConfig.timezone) ? window.appConfig.timezone : Intl.DateTimeFormat().resolvedOptions().timeZone;
        try {
            return new Date().toLocaleDateString('en-CA', { timeZone: tz });
        } catch(e) {
            var d = new Date();
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        }
    };

    // ===== Clock display =====

    T.refreshClockOnly = function() {
        var clockEl = document.getElementById('clock');
        if (clockEl) clockEl.innerText = T.dateToTimecode(T.getCalibratedDate());
    };

    // ===== NTP 時間服務管理器 =====

    T.NTPManager = {
        status: 'local',
        offset: 0,
        lastSyncTime: null,
        errorMsg: '',
        config: {
            ntpServerUrl: 'https://worldtimeapi.org/api/timezone/Asia/Hong_Kong',
            ntpAutoSyncInterval: 0
        },
        timerId: null,

        async sync(url) {
            this.status = 'syncing';
            T.updateNtpStatusUI();
            try {
                var result = await window.API.ntpSync();
                if (result && result.status === 'connected') {
                    this.status = 'connected';
                    this.offset = result.offset_ms;
                    this.lastSyncTime = result.last_sync;
                    this.errorMsg = '';
                    window.timeOffset = this.offset;
                    if (window.appConfig) {
                        window.appConfig.ntpLastOffset = this.offset;
                        window.appConfig.ntpLastSyncTime = this.lastSyncTime;
                    }
                    if (typeof saveConfig === 'function') saveConfig();
                } else if (result) {
                    this.status = result.status;
                    this.errorMsg = result.error_msg || 'NTP \u540c\u6b65\u5931\u6557';
                } else {
                    this.status = this.offset !== 0 ? 'fallback' : 'local';
                    this.errorMsg = '\u7121\u6cd5\u9023\u7dda\u81f3\u4f3a\u670d\u5668 NTP \u670d\u52d9';
                }
            } catch(err) {
                this.status = this.offset !== 0 ? 'fallback' : 'local';
                this.errorMsg = err.message || 'NTP \u540c\u6b65\u4f8b\u5916\u932f\u8aa4';
            }
            T.updateNtpStatusUI();
        }
    };

    // ===== NTP UI =====

    T.updateSettingsNtpUI = function() {
        var statusEl = document.getElementById('settingsNtpStatus');
        var lastSyncEl = document.getElementById('settingsNtpLastSync');
        if (!statusEl) return;

        var s = T.NTPManager.status;
        if (s === 'connected') {
            statusEl.innerHTML = '\ud83d\udfe2 <span style="color:#34d399;">\u5df2\u540c\u6b65 \u2014 \u4f3a\u670d\u5668\u771f\u5be6 NTP</span>';
        } else if (s === 'syncing') {
            statusEl.innerHTML = '\ud83d\udd04 <span style="color:#60a5fa;">\u540c\u6b65\u4e2d\u2026</span>';
        } else if (s === 'fallback') {
            statusEl.innerHTML = '\ud83d\udfe1 <span style="color:#fbbf24;">\u5df2\u964d\u7d1a (\u4fdd\u7559\u524d\u6b21\u504f\u79fb)</span>';
        } else if (s === 'error') {
            statusEl.innerHTML = '\ud83d\udd34 <span style="color:#f87171;">\u932f\u8aa4</span>';
        } else {
            statusEl.innerHTML = '\u26aa <span style="color:#9ca3af;">\u672a\u540c\u6b65 (\u672c\u5730\u6642\u9418)</span>';
        }
        if (T.NTPManager.errorMsg) {
            statusEl.innerHTML += '<br><span style="font-size:11px; color:#ef4444;">' + T.NTPManager.errorMsg + '</span>';
        }
        if (lastSyncEl) {
            lastSyncEl.innerText = T.formatTimeInAppTz(T.NTPManager.lastSyncTime, 'datetime');
        }
    };

    T.updateNtpStatusUI = function() {
        T.updateSettingsNtpUI();

        var badge = document.getElementById('syncBadge');
        var ntpStatusEl = document.getElementById('ntpStatus');
        if (!badge) return;

        var status = T.NTPManager.status;
        var offset = T.NTPManager.offset;
        var lastSync = T.NTPManager.lastSyncTime;
        var errorMsg = T.NTPManager.errorMsg;

        if (status === 'syncing') {
            badge.className = 'sync-badge sync-loading';
            badge.innerText = '\ud83d\udd04 NTP \u540c\u6b65\u4e2d\u2026';
            if (ntpStatusEl) ntpStatusEl.innerText = '';
        } else if (status === 'connected') {
            badge.className = 'sync-badge sync-success';
            var offsetMs = Math.round(offset);
            var sign = offsetMs >= 0 ? '+' : '';
            badge.innerText = '\ud83d\udd52 NTP \u5df2\u540c\u6b65 (' + sign + offsetMs + 'ms)';
            if (ntpStatusEl) {
                var url = T.NTPManager.config.ntpServerUrl;
                var timeStr = T.formatTimeInAppTz(lastSync, 'time');
                ntpStatusEl.innerText = '\u4f86\u6e90: ' + url + ' | \u6700\u5f8c\u540c\u6b65: ' + timeStr;
            }
        } else if (status === 'fallback') {
            badge.className = 'sync-badge sync-success';
            var offsetMs2 = Math.round(offset);
            badge.innerText = '\ud83d\udda5\ufe0f \u672c\u5730\u6642\u9418 (\u4fdd\u7559\u504f\u79fb ' + (offsetMs2 >= 0 ? '+' : '') + offsetMs2 + 'ms)';
            if (ntpStatusEl) {
                ntpStatusEl.innerText = '\u26a0\ufe0f NTP \u540c\u6b65\u5931\u6557 \u2014 ' + errorMsg;
            }
        } else if (status === 'error') {
            badge.className = 'sync-badge sync-success';
            badge.innerText = '\ud83d\udda5\ufe0f \u672c\u5730\u6642\u9418';
            if (ntpStatusEl) ntpStatusEl.innerText = '\u26a0\ufe0f NTP \u932f\u8aa4 \u2014 ' + errorMsg;
        } else {
            badge.className = 'sync-badge sync-success';
            badge.innerText = '\ud83d\udda5\ufe0f \u672c\u5730\u6642\u9418';
            if (ntpStatusEl) ntpStatusEl.innerText = '';
        }
    };

    T.restartAutoSync = function() {
        if (T.NTPManager.timerId) {
            clearInterval(T.NTPManager.timerId);
            T.NTPManager.timerId = null;
        }
        var interval = parseInt(document.getElementById('cfgNtpInterval').value) || 0;
        T.NTPManager.config.ntpAutoSyncInterval = interval;
        if (interval > 0) {
            T.NTPManager.timerId = setInterval(function() {
                T.NTPManager.sync();
            }, interval * 1000);
        }
    };

    T.handleManualNtpSync = function() {
        var btn = document.getElementById('btnNtpSync');
        if (btn) {
            btn.disabled = true;
            btn.innerText = '\u23f3 \u540c\u6b65\u4e2d\u2026';
        }
        T.NTPManager.sync().finally(function() {
            if (btn) {
                btn.disabled = false;
                btn.innerText = '\ud83d\udd04 \u7acb\u5373\u540c\u6b65';
            }
            T.updateSettingsNtpUI();
        });
    };

    T.checkNtpStatus = function() {
        T.updateNtpStatusUI();
        if (window.API) {
            window.API.ntpStatus().then(function(result) {
                if (result && result.status === 'connected') {
                    T.NTPManager.status = 'connected';
                    T.NTPManager.offset = result.offset_ms || 0;
                    T.NTPManager.lastSyncTime = result.last_sync;
                    T.NTPManager.errorMsg = '';
                    window.timeOffset = T.NTPManager.offset;
                } else if (result) {
                    T.NTPManager.status = result.status;
                    T.NTPManager.errorMsg = result.error_msg || 'NTP \u540c\u6b65\u5931\u6557';
                } else {
                    T.NTPManager.status = T.NTPManager.offset !== 0 ? 'fallback' : 'local';
                    T.NTPManager.errorMsg = '\u7121\u6cd5\u9023\u7dda\u81f3\u4f3a\u670d\u5668 NTP \u670d\u52d9';
                }
                T.updateNtpStatusUI();
            }).catch(function() {
                T.NTPManager.status = T.NTPManager.offset !== 0 ? 'fallback' : 'local';
                T.NTPManager.errorMsg = 'NTP \u72c0\u614b\u67e5\u8a62\u4f8b\u5916';
                T.updateNtpStatusUI();
            });
        }
    };

    T.syncWithNetworkTime = function(callback) {
        if (window.API) {
            window.API.ntpStatus().then(function(statusResult) {
                if (statusResult && statusResult.status === 'connected') {
                    T.NTPManager.status = 'connected';
                    T.NTPManager.offset = statusResult.offset_ms || 0;
                    T.NTPManager.lastSyncTime = statusResult.last_sync || '';
                    T.NTPManager.errorMsg = '';
                    window.timeOffset = T.NTPManager.offset;
                } else {
                    T.NTPManager.status = statusResult && statusResult.status === 'error' ? 'error' : 'fallback';
                    T.NTPManager.errorMsg = (statusResult && statusResult.error_msg) || 'NTP \u672a\u540c\u6b65';
                }
            }).catch(function() {
                T.NTPManager.status = T.NTPManager.offset !== 0 ? 'fallback' : 'local';
                T.NTPManager.errorMsg = '\u7121\u6cd5\u9023\u7dda\u81f3\u4f3a\u670d\u5668';
            }).finally(function() {
                if (callback) callback();
                T.restartAutoSync();
            });
        } else {
            if (callback) callback();
            T.restartAutoSync();
        }
    };

    // ===== Utility =====

    T.setStartTimeOneMinLater = function() {
        var now = T.getCalibratedDate();
        var later = new Date(now.getTime() + 60 * 1000);
        document.getElementById('startTimeStr').value = T.dateToTimecode(later);
        if (typeof writeLog === 'function') writeLog('\u23f1 \u5df2\u586b\u5165\u300c\u4e00\u5206\u9418\u5f8c\u300d\u6642\u78bc: ' + T.dateToTimecode(later), 'info');
    };

    return T;
});
