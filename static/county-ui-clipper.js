// county-ui-clipper.js — Clipper IM UI 模組 (clipperConnect, clipperSendMsg, renderClipperChatRange, etc.)
County.register('ClipperUI', function(C) {
    var U = {};

    var _clipperChatMessages = [];
    var _clipperChatVisible = 15;
    var CLIPPER_CHAT_PAGE = 30;
    var clipper = null;
    var _clipperUnread = 0;
    var _clipperSelectedTargets = new Set();

    U.clipperConnect = function() {
        var url = document.getElementById('clipperServerUrl').value.trim() || 'ws://localhost:8765';
        var room = document.getElementById('clipperRoomCode').value.trim() || '1234';
        var displayName = document.getElementById('clipperDisplayName').textContent.trim() || 'VPRE';

        if (clipper) { clipper.disconnect(); }

        clipper = new ClipperSDK({ server: url, room: room, displayName: displayName });

        clipper.on('connected', function() {
            U.updateClipperStatus('connected', '\uD83D\uDFE2 \u5DF2\u9023\u7DDA');
            U.appendClipperMsg('system', '\u2705 \u5DF2\u52A0\u5165\u623F\u9593');
        });

        clipper.on('disconnected', function() {
            U.updateClipperStatus('disconnected', '\uD83D\uDD34 \u672A\u9023\u7DDA');
            U.appendClipperMsg('system', '\u26A0\uFE0F \u8207\u4F3A\u670D\u5668\u65B7\u7DDA');
        });

        clipper.on('chat', function(msg) {
            if (msg.from === clipper.displayName) return;
            U.appendClipperMsg('peer', msg.text, msg.from);
            U.showClipperNotif(msg.text, msg.from);
        });

        clipper.on('peer-joined', function(peer) {
            var name = peer.displayName || '\u65B0\u6210\u54E1';
            U.appendClipperMsg('system', '\uD83D\uDC64 ' + name + ' \u52A0\u5165\u4E86\u623F\u9593');
        });

        clipper.on('peer-left', function(peer) {
            var leftName = peer.displayName || '\u67D0\u6210\u54E1';
            U.appendClipperMsg('system', '\uD83D\uDC4B ' + leftName + ' \u96E2\u958B\u4E86\u623F\u9593');
        });

        clipper.on('error', function(err) {
            U.appendClipperMsg('system', '\u274C ' + (err.message || '\u672A\u77E5\u932F\u8AA4'));
        });

        // ---- 檔案傳輸事件監聽 + 進度條更新 ----
        clipper.on('file-progress', function(p) {
            var el = document.getElementById('clipper-fp-' + p.fileId);
            if (el) {
                var fill = el.querySelector('.clipper-progress-fill');
                var st = el.querySelector('.clipper-progress-status');
                if (fill) fill.style.width = p.progress + '%';
                if (st) st.textContent = '\uD83D\uDCE4 \u50B3\u9001\u4E2D ' + p.progress + '%';
            }
        });

        clipper.on('file-sent', function(s) {
            var el = document.getElementById('clipper-fp-' + s.fileId);
            if (el) {
                var fill = el.querySelector('.clipper-progress-fill');
                var st = el.querySelector('.clipper-progress-status');
                if (fill) { fill.style.width = '100%'; fill.className = 'clipper-progress-fill done'; }
                if (st) st.textContent = '\u2705 \u5DF2\u5B8C\u6210';
            }
        });

        clipper.on('file-meta', function(meta) {
            var queue = document.getElementById('clipperFileQueue');
            var div = document.createElement('div');
            div.id = 'clipper-fp-' + meta.fileId;
            div.className = 'clipper-progress-item';
            div.innerHTML = '<div class="clipper-progress-header"><span class="clipper-progress-name">\uD83D\uDCE5 ' + C.H.escapeHtml(meta.name) + '</span><span class="clipper-progress-size">' + C.H.formatSize(meta.size) + '</span></div><div class="clipper-progress-bar"><div class="clipper-progress-fill receiving" style="width:0%"></div></div><div class="clipper-progress-status">\uD83D\uDCE5 \u63A5\u6536\u4E2D... 0%</div>';
            queue.appendChild(div);
        });

        clipper.on('file-chunk', function(chunk) {
            var el = document.getElementById('clipper-fp-' + chunk.fileId);
            if (el) {
                var fill = el.querySelector('.clipper-progress-fill');
                var st = el.querySelector('.clipper-progress-status');
                if (fill) fill.style.width = chunk.progress + '%';
                if (st) st.textContent = '\uD83D\uDCE5 \u63A5\u6536\u4E2D... ' + chunk.progress + '%';
            }
        });

        clipper.on('file-done', function(done) {
            var el = document.getElementById('clipper-fp-' + done.fileId);
            if (el) {
                var fill = el.querySelector('.clipper-progress-fill');
                var st = el.querySelector('.clipper-progress-status');
                if (fill) { fill.style.width = '100%'; fill.className = 'clipper-progress-fill done'; }
                if (st) st.textContent = '\u2705 \u63A5\u6536\u5B8C\u6210';
            }
            // 自動下載
            var a = document.createElement('a');
            a.href = URL.createObjectURL(done.blob);
            a.download = done.name;
            document.body.appendChild(a);
            a.click();
            a.remove();
            U.appendClipperMsg('system', '\u2705 ' + done.name + ' \u4E0B\u8F09\u5B8C\u6210 (' + C.H.formatSize(done.size) + ')');
        });

        clipper.on('file-error', function(err) {
            var el = document.getElementById('clipper-fp-' + err.fileId);
            if (el) {
                var fill = el.querySelector('.clipper-progress-fill');
                var st = el.querySelector('.clipper-progress-status');
                if (fill) { fill.style.width = '100%'; fill.className = 'clipper-progress-fill error'; }
                if (st) st.textContent = '\u274C ' + (err.message || '\u932F\u8AA4');
            } else {
                U.appendClipperMsg('system', '\u274C ' + (err.message || '\u6A94\u6848\u50B3\u8F38\u932F\u8AA4'));
            }
        });

        // peer-joined/left/updated/name-updated → 更新目標選擇 UI
        clipper.on('peer-joined', function() { U.updatePeerTargetUI(); });
        clipper.on('peer-left', function() { setTimeout(U.updatePeerTargetUI, 500); });
        clipper.on('peer-updated', function() { U.updatePeerTargetUI(); });
        clipper.on('connected', function() { setTimeout(U.updatePeerTargetUI, 1000); });
        clipper.on('name-updated', function() {
            var nameEl = document.getElementById('clipperDisplayName');
            if (nameEl && clipper) nameEl.textContent = clipper.displayName;
        });

        // 🔥 開始連線！
        clipper.connect();
    };

    U.clipperSendMsg = function() {
        var input = document.getElementById('clipperInput');
        var text = input.value.trim();
        if (!text || !clipper) return;

        if (clipper.sendChat(text)) {
            U.appendClipperMsg('self', text, clipper.displayName);
            input.value = '';
            input.focus();
        } else {
            U.appendClipperMsg('system', '\u274C \u7121\u6CD5\u767C\u9001\uFF0C\u8ACB\u78BA\u8A8D\u5DF2\u9023\u7DDA');
        }
    };

    U.renderClipperChatRange = function() {
        var container = document.getElementById('clipperMessages');
        if (!container) return;

        var showCount = Math.min(_clipperChatVisible, _clipperChatMessages.length);
        var startIdx = Math.max(0, _clipperChatMessages.length - showCount);

        container.innerHTML = '';

        // 載入更多按鈕
        if (startIdx > 0) {
            var loadMore = document.createElement('div');
            loadMore.style.cssText = 'text-align:center;padding:8px;cursor:pointer;color:#38bdf8;font-size:13px;border-bottom:1px solid #1f2937;';
            loadMore.textContent = '\uD83D\uDCDC \u8F09\u5165\u66F4\u591A (' + startIdx + ' \u689D\u8F03\u65E9\u8A0A\u606F)';
            loadMore.onclick = function() {
                _clipperChatVisible = Math.min(_clipperChatVisible + CLIPPER_CHAT_PAGE, _clipperChatMessages.length);
                U.renderClipperChatRange();
                container.scrollTop = 0;
            };
            loadMore.onmouseenter = function() { this.style.background = 'rgba(56,189,248,0.08)'; };
            loadMore.onmouseleave = function() { this.style.background = 'transparent'; };
            container.appendChild(loadMore);
        }

        // 渲染可見訊息
        for (var i = startIdx; i < _clipperChatMessages.length; i++) {
            var m = _clipperChatMessages[i];
            var div = document.createElement('div');
            div.style.cssText = 'padding:6px 8px;margin:2px 0;border-radius:4px;';

            if (m.type === 'system') {
                div.style.cssText += 'text-align:center;color:#64748b;font-size:11px;';
                div.textContent = '[' + m.ts + '] ' + m.text;
            } else if (m.type === 'self') {
                div.style.cssText += 'text-align:right;color:#e2e8f0;background:#1e293b;';
                div.innerHTML = '<span style="font-size:11px;color:#38bdf8;">' + m.from + '</span><br>' + C.H.escapeHtml(m.text);
            } else {
                div.style.cssText += 'text-align:left;color:#e2e8f0;background:#0f172a;';
                div.innerHTML = '<span style="font-size:11px;color:#10b981;">' + m.from + '</span><br>' + C.H.escapeHtml(m.text);
            }
            container.appendChild(div);
        }

        // 自動捲到底部（僅在顯示最新訊息時）
        if (startIdx === 0) {
            container.scrollTop = container.scrollHeight;
        }
    };

    U.appendClipperMsg = function(type, text, from) {
        _clipperChatMessages.push({type: type, text: text, from: from || '', ts: new Date().toLocaleTimeString('zh-HK', {hour12: false})});
        if (_clipperChatVisible < _clipperChatMessages.length) {
            _clipperChatVisible++;
        }
        U.renderClipperChatRange();
    };

    U.showClipperNotif = function(text, from) {
        var clipperPage = document.getElementById('page-clipper');
        if (clipperPage && clipperPage.classList.contains('active')) return;
        _clipperUnread++;
        var badge = document.getElementById('clipperBadge');
        if (badge) { badge.textContent = _clipperUnread; badge.className = 'clipper-badge show'; }
        var old = document.getElementById('clipperToast');
        if (old) old.remove();
        var toast = document.createElement('div');
        toast.id = 'clipperToast';
        toast.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:10000;background:linear-gradient(135deg,#1a3a5c,#0f172a);border:1px solid #38bdf8;border-radius:10px;padding:12px 18px;max-width:340px;box-shadow:0 8px 32px rgba(56,189,248,0.25);cursor:pointer;animation:slideUp 0.25s ease-out;font-family:"Microsoft JhengHei",sans-serif';
        var displayText = text.length > 80 ? text.substring(0, 80) + '...' : text;
        toast.innerHTML = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;"><span style="font-size:16px;">\uD83D\uDCAC</span><span style="font-size:12px;color:#38bdf8;font-weight:bold;">' + C.H.escapeHtml(from || '\u5BF9\u65B9') + '</span></div><div style="font-size:13px;color:#e2e8f0;line-height:1.4;word-break:break-word;">' + C.H.escapeHtml(displayText) + '</div><div style="font-size:10px;color:#64748b;margin-top:4px;">\u70B9\u51FB\u5207\u6362\u81F3 Clipper IM</div>';
        toast.onclick = function() { toast.remove(); switchPage('clipper'); };
        document.body.appendChild(toast);
        setTimeout(function() {
            var t = document.getElementById('clipperToast');
            if (t) { t.style.transition = 'opacity 0.3s'; t.style.opacity = '0'; }
            setTimeout(function() { if (t && t.parentNode) t.remove(); }, 350);
        }, 5000);
    };

    U.updateClipperStatus = function(state, label) {
        var statusEl = document.getElementById('clipperStatus');
        if (!statusEl) return;
        statusEl.textContent = label;
        statusEl.className = 'sync-badge';
        if (state === 'connected') statusEl.className += ' sync-success';
        else if (state === 'connecting') statusEl.className += ' sync-loading';
    };

    U.updatePeerTargetUI = function() {
        var area = document.getElementById('clipperTargetArea');
        var container = document.getElementById('clipperPeerTargets');
        if (!clipper || !clipper.connected || !area || !container) return;

        var peers = [];
        for (const [pid, info] of clipper._peers) {
            if (pid !== clipper._peerId) peers.push({ peerId: pid, displayName: info.displayName || '\u6210\u54E1' });
        }

        if (peers.length === 0) {
            area.style.display = 'none';
            return;
        }
        area.style.display = '';
        container.innerHTML = '';

        // "全部" 按鈕
        var allSelected = peers.length > 0 && peers.every(function(p) { return _clipperSelectedTargets.has(p.peerId); });
        var allBtn = document.createElement('button');
        allBtn.textContent = '\uD83D\uDC65 \u5168\u90E8';
        allBtn.className = 'clipper-peer-btn all-btn' + (allSelected ? ' selected' : '');
        allBtn.onclick = function() {
            if (allSelected) { _clipperSelectedTargets.clear(); }
            else { peers.forEach(function(p) { _clipperSelectedTargets.add(p.peerId); }); }
            U.updatePeerTargetUI();
        };
        container.appendChild(allBtn);

        // 各 peer 按鈕
        for (var i = 0; i < peers.length; i++) {
            (function(peer) {
                var sel = _clipperSelectedTargets.has(peer.peerId);
                var btn = document.createElement('button');
                btn.textContent = '\uD83D\uDDA5 ' + peer.displayName;
                btn.className = 'clipper-peer-btn' + (sel ? ' selected' : '');
                btn.onclick = function() {
                    if (_clipperSelectedTargets.has(peer.peerId)) {
                        _clipperSelectedTargets.delete(peer.peerId);
                    } else {
                        _clipperSelectedTargets.add(peer.peerId);
                    }
                    U.updatePeerTargetUI();
                };
                container.appendChild(btn);
            })(peers[i]);
        }
    };

    U.clipperHandleDrop = function(files) {
        if (!clipper || !clipper.connected) {
            U.appendClipperMsg('system', '\u274C \u8ACB\u5148\u9023\u7DDA\u518D\u50B3\u9001\u6A94\u6848');
            return;
        }
        if (!files || files.length === 0) return;

        // 檢查是否有選取對象
        var targets = [];
        for (const [pid] of clipper._peers) {
            if (pid !== clipper._peerId && _clipperSelectedTargets.has(pid)) {
                targets.push(pid);
            }
        }
        // 若無選取對象但房間有其他人，提示用戶先選對象
        if (targets.length === 0 && clipper._peers.size > 1) {
            U.appendClipperMsg('system', '\uD83D\uDCA1 \u8ACB\u5148\u5728\u4E0A\u65B9\u9078\u53D6\u300C\u50B3\u9001\u5C0D\u8C61\u300D\u518D\u62D6\u653E\u6A94\u6848');
            return;
        }
        if (targets.length === 0) {
            U.appendClipperMsg('system', '\u26A0\uFE0F \u5C1A\u7121\u5176\u4ED6\u6210\u54E1\u5728\u623F\u9593\u5167');
            return;
        }

        // 傳送檔案到每個選取的目標
        for (var i = 0; i < files.length; i++) {
            (function(file) {
                var fileId = clipper._uuid ? clipper._uuid() : 'f' + Date.now();
                // 先在佇列中顯示
                var queue = document.getElementById('clipperFileQueue');
                if (queue) {
                    var div = document.createElement('div');
                    div.id = 'clipper-fp-' + fileId;
                    div.className = 'clipper-progress-item';
                    div.innerHTML = '<div class="clipper-progress-header"><span class="clipper-progress-name">\uD83D\uDCE4 ' + C.H.escapeHtml(file.name) + '</span><span class="clipper-progress-size">' + C.H.formatSize(file.size) + '</span></div><div class="clipper-progress-bar"><div class="clipper-progress-fill" style="width:0%"></div></div><div class="clipper-progress-status">\u23F3 \u7B49\u5F85\u4E2D... (' + targets.length + ' \u5C0D\u8C61)</div>';
                    queue.appendChild(div);
                }
                // 逐個目標傳送
                for (var j = 0; j < targets.length; j++) {
                    clipper.sendFile(targets[j], file);
                }
            })(files[i]);
        }
    };

    return U;
});
