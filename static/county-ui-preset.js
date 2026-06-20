// county-ui-preset.js — Preset 頁 UI 模組 (addNodeRow, savePresetAction, refreshPresetDropdownUI, etc.)
County.register('PresetUI', function(C) {
    var P = {};

    // 節點排序狀態（模組內部狀態）
    var presetSortState = { field: null, asc: true };

    // ===== 動態節點表格操作 =====
    P.addNodeRow = function(nodeData) {
        var tbody = document.getElementById('presetNodesTbody');
        var row = document.createElement('tr');
        row.className = 'preset-node-row';
        row.draggable = true;
        row.setAttribute('data-drag-idx', tbody.children.length);

        var offsetType = nodeData ? nodeData.offsetType : '\u958b\u59cb\u524d';
        var offsetSec = nodeData ? nodeData.offsetSec : 10;
        var nodeName = nodeData ? nodeData.nodeName : '\u65b0\u7bc0\u9ede';
        var soundId = nodeData ? nodeData.soundId : 'short_beep';

        var soundPresets = window.soundPresets || [];
        var secToMmss = window.secToMmss || function(s) { return String(s); };
        var previewSound = window.previewSound || function() {};
        var removeNodeRow = window.removeNodeRow || function() {};

        // Drag handle TD
        var tdDrag = document.createElement('td');
        tdDrag.style.cssText = 'text-align:center;cursor:grab;';
        tdDrag.textContent = '\u22ee\u22ee';
        tdDrag.className = 'drag-handle';
        row.appendChild(tdDrag);

        var td1 = document.createElement('td');
        var selOffset = document.createElement('select');
        selOffset.className = 'offsetType';
        ['\u958b\u59cb\u524d','\u958b\u59cb\u5f8c','\u7d50\u675f\u524d','\u7d50\u675f\u6642'].forEach(function(o) {
            var opt = document.createElement('option');
            opt.value = o; opt.textContent = o;
            if (o === offsetType) opt.selected = true;
            selOffset.appendChild(opt);
        });
        td1.appendChild(selOffset);
        row.appendChild(td1);

        var td2 = document.createElement('td');
        var inpSec = document.createElement('input');
        inpSec.type = 'text'; inpSec.className = 'offsetSec'; inpSec.placeholder = 'MM:SS'; inpSec.value = secToMmss(offsetSec);
        inpSec.addEventListener('input', function() {
            var digits = inpSec.value.replace(/\D/g, '').slice(0, 4);
            if (digits.length <= 2) { inpSec.value = digits; return; }
            var colonAt = digits.length - 2;
            inpSec.value = digits.substring(0, colonAt) + ':' + digits.substring(colonAt);
        });
        td2.appendChild(inpSec);
        row.appendChild(td2);

        var td3 = document.createElement('td');
        var inpName = document.createElement('input');
        inpName.type = 'text'; inpName.className = 'nodeName'; inpName.placeholder = '\u7bc0\u9ede\u540d\u7a31'; inpName.value = nodeName;
        td3.appendChild(inpName);
        row.appendChild(td3);

        var td4 = document.createElement('td');
        var selSound = document.createElement('select');
        selSound.className = 'soundSelect';
        soundPresets.forEach(function(sp) {
            var opt = document.createElement('option');
            opt.value = sp.id; opt.textContent = sp.label;
            if (sp.id === soundId) opt.selected = true;
            selSound.appendChild(opt);
        });
        td4.appendChild(selSound);
        row.appendChild(td4);

        var td5 = document.createElement('td');
        td5.style.cssText = 'white-space:nowrap;text-align:center;';
        var btnPrev = document.createElement('button');
        btnPrev.textContent = '\U0001f50a';
        btnPrev.className = 'btnNodePreview';
        btnPrev.title = '\u9810\u807d\uff08\u542b\u9577\u77ed\u97ff/\u91cd\u8907\uff09';
        btnPrev.onclick = function() { previewSound(row); };
        td5.appendChild(btnPrev);
        var btnDel = document.createElement('button');
        btnDel.textContent = '\u2715';
        btnDel.className = 'btnNodeRemove';
        btnDel.title = '\u522a\u9664\u7bc0\u9ede';
        btnDel.onclick = function() { removeNodeRow(btnDel); };
        td5.appendChild(btnDel);
        row.appendChild(td5);

        // Drag & Drop 事件
        row.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', Array.from(tbody.children).indexOf(row));
            row.classList.add('dragging');
        });
        row.addEventListener('dragend', function() {
            row.classList.remove('dragging');
            tbody.querySelectorAll('.drag-over').forEach(function(r) { r.classList.remove('drag-over'); });
        });
        row.addEventListener('dragover', function(e) {
            e.preventDefault();
            tbody.querySelectorAll('.drag-over').forEach(function(r) { if (r !== row) r.classList.remove('drag-over'); });
            row.classList.add('drag-over');
        });
        row.addEventListener('dragleave', function() {
            row.classList.remove('drag-over');
        });
        row.addEventListener('drop', function(e) {
            e.preventDefault();
            row.classList.remove('drag-over');
            var fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
            var toIdx = Array.from(tbody.children).indexOf(row);
            if (fromIdx === toIdx) return;
            var rows = Array.from(tbody.children);
            var refRow = (toIdx > fromIdx) ? rows[toIdx + 1] : rows[toIdx];
            tbody.insertBefore(rows[fromIdx], refRow);
        });

        tbody.appendChild(row);
    };

    P.removeNodeRow = function(btn) {
        var row = btn.closest ? btn.closest('tr') : btn.parentNode.parentNode;
        if (row && row.parentNode) row.parentNode.removeChild(row);
    };

    P.renderPresetNodes = function(nodes) {
        var tbody = document.getElementById('presetNodesTbody');
        tbody.innerHTML = '';
        // Reset sort icons
        presetSortState.field = null; presetSortState.asc = true;
        document.querySelectorAll('#presetNodesTable .sort-icon').forEach(function(el) {
            el.textContent = ''; el.classList.remove('active');
        });
        if (!nodes || nodes.length === 0) { P.addNodeRow(); return; }
        var soundPresets = window.soundPresets || [];
        // 按觸發時序排列（估算參考時長 30 分鐘）
        var sortedNodes = nodes.slice().sort(function(a, b) {
            function estAbsSec(n) {
                var os = n.offset;
                if (typeof os === 'number') return os < 0 ? os : os;
                var eNum = parseInt(String(os).replace('e', '').replace('-', '')) || 0;
                if (String(os).startsWith('e-')) return 1800 - eNum;
                if (os === 'e0') return 1800;
                return 1800 + eNum;
            }
            return estAbsSec(a) - estAbsSec(b);
        });
        sortedNodes.forEach(function(n) {
            var offset = n.offset;
            var offsetType = '\u958b\u59cb\u524d';
            var offsetSec = 10;
            if (typeof offset === 'number') {
                if (offset < 0) { offsetType = '\u958b\u59cb\u524d'; offsetSec = Math.abs(offset); }
                else { offsetType = '\u958b\u59cb\u5f8c'; offsetSec = offset; }
            } else if (typeof offset === 'string') {
                var eNum = parseInt(offset.replace('e', '').replace('-', '')) || 0;
                if (offset.startsWith('e-')) { offsetType = '\u7d50\u675f\u524d'; offsetSec = Math.abs(eNum); }
                else if (offset === 'e0') { offsetType = '\u7d50\u675f\u6642'; offsetSec = 0; }
                else { offsetType = '\u958b\u59cb\u524d'; offsetSec = Math.abs(eNum); }
            }
            var freq = n.freq || 1000;
            var soundId = 'tone';
            var bestDiff = Infinity;
            for (var i = 0; i < soundPresets.length; i++) {
                var diff = Math.abs(soundPresets[i].freq - freq);
                if (diff < bestDiff) { bestDiff = diff; soundId = soundPresets[i].id; }
            }
            P.addNodeRow({
                offsetType: offsetType,
                offsetSec: offsetSec,
                nodeName: n.name || '',
                soundId: soundId
            });
        });
    };

    P.sortPresetNodes = function(field) {
        var rows = document.querySelectorAll('#presetNodesTbody tr');
        if (rows.length < 2) return;

        if (presetSortState.field === field) presetSortState.asc = !presetSortState.asc;
        else { presetSortState.field = field; presetSortState.asc = true; }

        document.querySelectorAll('#presetNodesTable .sort-icon').forEach(function(el) {
            el.textContent = ''; el.classList.remove('active');
        });
        var iconEl = document.getElementById('sortIcon-' + field);
        if (iconEl) { iconEl.textContent = presetSortState.asc ? '\u25b2' : '\u25bc'; iconEl.classList.add('active'); }

        var mmssToSec = window.mmssToSec || function(s) { return parseInt(s, 10) || 0; };

        var data = [];
        rows.forEach(function(row) {
            var sec = mmssToSec(row.querySelector('.offsetSec').value);
            var type = row.querySelector('.offsetType').value;
            var REF_DURATION_SEC = 1800;
            var estimatedAbsSec;
            if (type === '\u958b\u59cb\u524d') estimatedAbsSec = -sec;
            else if (type === '\u958b\u59cb\u5f8c') estimatedAbsSec = sec;
            else if (type === '\u7d50\u675f\u524d') estimatedAbsSec = REF_DURATION_SEC - sec;
            else estimatedAbsSec = REF_DURATION_SEC;

            data.push({
                offsetType: type,
                offsetSec: sec,
                nodeName: row.querySelector('.nodeName').value.trim(),
                soundId: row.querySelector('.soundSelect').value,
                chronoKey: estimatedAbsSec
            });
        });

        data.sort(function(a, b) {
            if (field === 'offsetSec') {
                return presetSortState.asc ? (a.chronoKey - b.chronoKey) : (b.chronoKey - a.chronoKey);
            }
            var va = (a[field] || '').toString().toLowerCase();
            var vb = (b[field] || '').toString().toLowerCase();
            return presetSortState.asc ? (va < vb ? -1 : va > vb ? 1 : 0) : (va < vb ? 1 : va > vb ? -1 : 0);
        });

        var tbody = document.getElementById('presetNodesTbody');
        tbody.innerHTML = '';
        data.forEach(function(d) { P.addNodeRow(d); });
    };

    P.onPresetSelectionChange = function() {
        var id = document.getElementById('presetSelector').value;
        var cuePresets = window.cuePresets || {};
        if (!id || !cuePresets[id]) return;
        document.getElementById('presetNameField').value = cuePresets[id].name;
        P.renderPresetNodes(cuePresets[id].nodes);
        P.refreshPresetJsonArea();
    };

    P.savePresetAction = function() {
        var selId = document.getElementById('presetSelector').value;
        var name = document.getElementById('presetNameField').value.trim();
        if (!name) return;
        var cuePresets = window.cuePresets || {};
        var soundPresets = window.soundPresets || [];
        var mmssToSec = window.mmssToSec || function(s) { return parseInt(s, 10) || 0; };
        var API = window.API || {};

        var rows = document.querySelectorAll('#presetNodesTbody tr');
        var parsedNodes = [];
        rows.forEach(function(row) {
            var offsetType = row.querySelector('.offsetType').value;
            var offsetSec = mmssToSec(row.querySelector('.offsetSec').value);
            var nodeName = row.querySelector('.nodeName').value.trim();
            var soundId = row.querySelector('.soundSelect').value;
            if (!nodeName) return;
            var freq = 1000;
            for (var i = 0; i < soundPresets.length; i++) {
                if (soundPresets[i].id === soundId) { freq = soundPresets[i].freq; break; }
            }
            var finalOffset;
            if (offsetType === '\u958b\u59cb\u524d') finalOffset = -offsetSec;
            else if (offsetType === '\u958b\u59cb\u5f8c') finalOffset = offsetSec;
            else if (offsetType === '\u7d50\u675f\u524d') finalOffset = 'e-' + offsetSec;
            else if (offsetType === '\u7d50\u675f\u6642') finalOffset = 'e0';
            parsedNodes.push({ offset: finalOffset, name: nodeName, freq: freq, soundId: soundId });
        });
        var targetId = selId ? selId : 'preset_' + Date.now();
        cuePresets[targetId] = { name: name, nodes: parsedNodes };
        window.cuePresets = cuePresets;
        try { localStorage.setItem('county_presets_v8', JSON.stringify(cuePresets)); } catch(e) {}
        if (API.savePreset) API.savePreset({ id: targetId, name: name, nodes: parsedNodes });
        if (typeof refreshPresetDropdownUI === 'function') refreshPresetDropdownUI();
        document.getElementById('presetSelector').value = targetId;
        P.refreshPresetJsonArea();
        if (typeof markDirty === 'function') markDirty();
        if (window.isTrackingActive && typeof calculateGlobalTimelineMatrix === 'function') calculateGlobalTimelineMatrix(true);
    };

    P.initNewPresetForm = function() {
        document.getElementById('presetSelector').value = '';
        document.getElementById('presetNameField').value = '\u81ea\u8a02\u908f\u8f2f_' + Math.floor(Math.random() * 1000);
        P.renderPresetNodes([
            { offset: -300, name: '\u23f3 \u958b\u59cb\u524d5\u5206', freq: 600, soundId: 'bell' },
            { offset: -180, name: '\u23f3 \u958b\u59cb\u524d3\u5206', freq: 800, soundId: 'short_beep' },
            { offset: -60, name: '\u23f3 \u958b\u59cb\u524d1\u5206', freq: 900, soundId: 'tone' },
            { offset: -30, name: '\U0001f514 \u958b\u59cb\u524d30\u79d2', freq: 1000, soundId: 'double_beep' },
            { offset: -15, name: '\U0001f514 \u958b\u59cb\u524d15\u79d2\u5012\u6578', freq: 1200, soundId: 'triple_beep' },
            { offset: 0, name: '\u25b6 \u958b\u64ad', freq: 2000, soundId: 'alert' },
            { offset: 'e-180', name: '\u23f3 \u7d50\u675f\u524d3\u5206', freq: 800, soundId: 'short_beep' },
            { offset: 'e-60', name: '\u23f3 \u7d50\u675f\u524d1\u5206', freq: 900, soundId: 'tone' },
            { offset: 'e-30', name: '\U0001f514 \u7d50\u675f\u524d30\u79d2', freq: 1000, soundId: 'double_beep' },
            { offset: 'e-15', name: '\U0001f514 \u7d50\u675f\u524d15\u79d2\u5012\u6578', freq: 1200, soundId: 'triple_beep' },
            { offset: 'e0', name: '\u25a0 \u64ad\u653e\u7d50\u675f', freq: 500, soundId: 'bell' }
        ]);
        document.getElementById('presetJsonArea').value = '';
    };

    P.duplicatePreset = function() {
        var id = document.getElementById('presetSelector').value;
        var cuePresets = window.cuePresets || {};
        if (!id || !cuePresets[id]) return;
        var source = cuePresets[id];
        var newId = id + '_copy_' + Date.now();
        var newName = source.name + ' (\u8907\u88fd)';
        cuePresets[newId] = {
            name: newName,
            nodes: JSON.parse(JSON.stringify(source.nodes))
        };
        window.cuePresets = cuePresets;
        try { localStorage.setItem('county_presets_v8', JSON.stringify(cuePresets)); } catch(e) {}
        var API = window.API || {};
        if (API.savePreset) API.savePreset({ id: newId, name: newName, nodes: cuePresets[newId].nodes });
        if (typeof refreshPresetDropdownUI === 'function') refreshPresetDropdownUI();
        document.getElementById('presetSelector').value = newId;
        P.onPresetSelectionChange();
        if (typeof markDirty === 'function') markDirty();
        if (typeof writeLog === 'function') writeLog('\U0001f4cb Preset \u5df2\u8907\u88fd: ' + newName, 'success');
    };

    P.deletePresetAction = function() {
        var id = document.getElementById('presetSelector').value;
        var cuePresets = window.cuePresets || {};
        if (!id || id === 'pre_broadcast') return;
        if (confirm('\u78ba\u5b9a\u522a\u9664\u6b64\u9810\u8a2d\u96c6\uff1f')) {
            var API = window.API || {};
            delete cuePresets[id];
            window.cuePresets = cuePresets;
            try { localStorage.setItem('county_presets_v8', JSON.stringify(cuePresets)); } catch(e) {}
            if (API.deletePreset) API.deletePreset(id);
            var masterScheduleDB = window.masterScheduleDB || [];
            masterScheduleDB.forEach(function(p) { if (p.presetId === id) p.presetId = 'pre_broadcast'; });
            window.masterScheduleDB = masterScheduleDB;
            if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
            if (typeof refreshPresetDropdownUI === 'function') refreshPresetDropdownUI();
            var firstKey = Object.keys(cuePresets)[0];
            if (firstKey) {
                document.getElementById('presetSelector').value = firstKey;
                P.onPresetSelectionChange();
            } else {
                P.initNewPresetForm();
            }
            if (typeof renderRundownUI === 'function') renderRundownUI();
            if (typeof calculateMCRTrafficSummary === 'function') calculateMCRTrafficSummary();
            if (typeof markDirty === 'function') markDirty();
            if (window.isTrackingActive && typeof calculateGlobalTimelineMatrix === 'function') calculateGlobalTimelineMatrix(true);
        }
    };

    // ===== Preset JSON 匯出/匯入 =====
    P.togglePresetJsonArea = function() {
        var area = document.getElementById('presetJsonArea');
        var toggle = document.getElementById('presetJsonToggle');
        if (!area || !toggle) return;
        if (area.style.display === 'none' || area.style.display === '') {
            area.style.display = 'block';
            toggle.innerText = '\u25bc JSON \u4e00\u9375\u532f\u51fa/\u532f\u5165';
            P.refreshPresetJsonArea();
        } else {
            area.style.display = 'none';
            toggle.innerText = '\u25b6 JSON \u4e00\u9375\u532f\u51fa/\u532f\u5165';
        }
    };

    P.refreshPresetJsonArea = function() {
        var area = document.getElementById('presetJsonArea');
        var id = document.getElementById('presetSelector').value;
        var cuePresets = window.cuePresets || {};
        if (!area || !id || !cuePresets[id]) return;
        area.value = JSON.stringify(cuePresets[id], null, 2);
    };

    P.exportPresetAsJson = function() {
        var id = document.getElementById('presetSelector').value;
        var cuePresets = window.cuePresets || {};
        if (!id || !cuePresets[id]) { alert('\u8acb\u5148\u9078\u64c7\u4e00\u500b\u9810\u8a2d\u96c6\uff01'); return; }
        var dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cuePresets[id], null, 2));
        var dl = document.createElement('a'); dl.setAttribute('href', dataStr);
        dl.setAttribute('download', 'VCC_PRE_Preset_' + id + '.json');
        document.body.appendChild(dl); dl.click(); dl.remove();
    };

    P.importPresetFromFile = function(input) {
        var file = input.files[0]; if (!file) return;
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var data = JSON.parse(e.target.result);
                var area = document.getElementById('presetJsonArea');
                if (area) {
                    area.style.display = 'block';
                    document.getElementById('presetJsonToggle').innerText = '\u25bc JSON \u4e00\u9375\u532f\u51fa/\u532f\u5165';
                    area.value = JSON.stringify(data, null, 2);
                    if (typeof writeLog === 'function') writeLog('\u5df2\u8f09\u5165 Preset JSON \u6a94\u6848: ' + file.name, 'info');
                }
            } catch(err) { alert('JSON \u89e3\u6790\u932f\u8aa4: ' + err.message); }
        };
        reader.readAsText(file);
        input.value = '';
    };

    P.applyPresetJson = function() {
        var area = document.getElementById('presetJsonArea');
        if (!area || !area.value.trim()) { alert('JSON \u5167\u5bb9\u70ba\u7a7a\uff01'); return; }
        try {
            var data = JSON.parse(area.value.trim());
            if (!data.name || !Array.isArray(data.nodes)) { alert('JSON \u5fc5\u9808\u5305\u542b name \u8207 nodes \u9663\u5217'); return; }
            for (var i = 0; i < data.nodes.length; i++) {
                var n = data.nodes[i];
                if (n.offset === undefined || !n.name) { alert('\u7bc0\u9ede ' + (i+1) + ' \u7f3a\u5c11 offset \u6216 name'); return; }
            }
            var selId = document.getElementById('presetSelector').value;
            var cuePresets = window.cuePresets || {};
            var targetId = selId && cuePresets[selId] ? selId : 'preset_' + Date.now();
            cuePresets[targetId] = { name: data.name, nodes: data.nodes };
            window.cuePresets = cuePresets;
            try { localStorage.setItem('county_presets_v8', JSON.stringify(cuePresets)); } catch(e) {}
            var API = window.API || {};
            if (API.savePreset) API.savePreset({ id: targetId, name: data.name, nodes: data.nodes });
            if (typeof refreshPresetDropdownUI === 'function') refreshPresetDropdownUI();
            document.getElementById('presetSelector').value = targetId;
            P.onPresetSelectionChange();
            if (typeof markDirty === 'function') markDirty();
            if (window.isTrackingActive && typeof calculateGlobalTimelineMatrix === 'function') calculateGlobalTimelineMatrix(true);
            if (typeof writeLog === 'function') writeLog('\u2705 Preset JSON \u5df2\u5957\u7528: ' + data.name, 'success');
        } catch(err) { alert('JSON \u8a9e\u6cd5\u932f\u8aa4: ' + err.message); }
    };

    P.refreshPresetDropdownUI = function() {
        var cuePresets = window.cuePresets || {};
        var progSelect = document.getElementById('progPreset');
        var mgrSelect = document.getElementById('presetSelector');
        if (!progSelect || !mgrSelect) return;
        var c1 = progSelect.value; var c2 = mgrSelect.value;
        progSelect.innerHTML = ''; mgrSelect.innerHTML = '';
        Object.keys(cuePresets).forEach(function(id) {
            var opt = document.createElement('option'); opt.value = id; opt.innerText = cuePresets[id].name; progSelect.appendChild(opt);
        });
        Object.keys(cuePresets).forEach(function(id) {
            var o2 = document.createElement('option'); o2.value = id; o2.innerText = cuePresets[id].name; mgrSelect.appendChild(o2);
        });
        if (c1 && cuePresets[c1]) progSelect.value = c1;
        if (c2 && cuePresets[c2]) mgrSelect.value = c2;
    };

    return P;
});
