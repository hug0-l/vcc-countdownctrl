// county-data.js — 資料層模組 (masterScheduleDB, cuePresets, 行事曆, 週期邏輯)
County.register('Data', function(C) {
    var D = {};

    D.MATRIX_COLORS = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#06b6d4','#f97316'];
    D.calCurrentYear = new Date().getFullYear();
    D.calCurrentMonth = new Date().getMonth();

    // ===== 資料集匯出/匯入 =====

    D.getDataSet = function() {
        var cuePresets = window.cuePresets || {};
        var masterScheduleDB = window.masterScheduleDB || [];
        var appConfig = window.appConfig || {};
        return {
            version: 2,
            exportedAt: new Date().toISOString(),
            presets: cuePresets,
            schedule: masterScheduleDB,
            config: appConfig
        };
    };

    D.applyDataSet = function(ds) {
        if (!ds) return;
        var cuePresets = window.cuePresets || {};
        var masterScheduleDB = window.masterScheduleDB || [];
        var appConfig = window.appConfig || {};
        var frameRate = window.frameRate || 25;
        var timelineRange = window.timelineRange;
        if (ds.presets && typeof ds.presets === 'object') {
            cuePresets = ds.presets;
            window.cuePresets = cuePresets;
            try { localStorage.setItem('county_presets_v8', JSON.stringify(cuePresets)); } catch(e) {}
        }
        if (Array.isArray(ds.schedule)) {
            masterScheduleDB = ds.schedule;
            window.masterScheduleDB = masterScheduleDB;
            try { localStorage.setItem('county_master_db_v8', JSON.stringify(masterScheduleDB)); } catch(e) {}
        }
        if (ds.config) {
            appConfig = ds.config;
            window.appConfig = appConfig;
            try { localStorage.setItem('county_config_v8', JSON.stringify(appConfig)); } catch(e) {}
            frameRate = appConfig.frameRate || 25;
            window.frameRate = frameRate;
            var frEl = document.getElementById('cfgFrameRate');
            if (frEl) frEl.value = frameRate;
            var bfEl = document.getElementById('cfgBeepFreq');
            if (bfEl) bfEl.value = appConfig.beepFreq || 1500;
            var bdEl = document.getElementById('cfgBeepDur');
            if (bdEl) bdEl.value = appConfig.beepDur || 0.5;
            var tzEl = document.getElementById('cfgTimezone');
            if (tzEl && appConfig.timezone) tzEl.value = appConfig.timezone;
            if (timelineRange) timelineRange.maxFrames = 86400 * frameRate;
        }
    };

    // ===== 資料儲存 & 同步 =====

    D.markDirty = function() {
        var cuePresets = window.cuePresets || {};
        var masterScheduleDB = window.masterScheduleDB || [];
        var appConfig = window.appConfig || {};
        try {
            localStorage.setItem('county_presets_v8', JSON.stringify(cuePresets));
            localStorage.setItem('county_master_db_v8', JSON.stringify(masterScheduleDB));
            localStorage.setItem('county_config_v8', JSON.stringify(appConfig));
        } catch(e) {}
        var indicator = document.getElementById('dataDirtyIndicator');
        if (indicator) indicator.innerText = '\u2705 \u5df2\u5132\u5b58';
    };

    D.saveToLocalStorage = function() {
        try {
            localStorage.setItem('county_master_db_v8', JSON.stringify(window.masterScheduleDB || []));
        } catch(e) {}
        if (typeof refreshJsonInspectorProbe === 'function') refreshJsonInspectorProbe();
        D.markDirty();
        clearTimeout(window._saveThrottle);
        window._saveThrottle = setTimeout(function() {
            if (typeof syncAllToServer === 'function') syncAllToServer();
        }, 2000);
    };

    D.updateFileStatus = function(text) {
        var el = document.getElementById('fileStatus');
        if (el) el.innerText = text;
    };

    D.loadDataFromFile = function() {
        document.getElementById('dataFileInput').click();
    };

    D.handleFileOpen = function(input) {
        var file = input.files[0];
        if (!file) return;
        var API_module = window.API || (window.County && window.County.get && window.County.get('API'));
        if (API_module && API_module.restoreBackup) {
            API_module.restoreBackup(file).then(function(result) {
                if (result && result.status === 'ok') {
                    D.updateFileStatus('\u2601\ufe0f \u4f3a\u670d\u5668');
                    if (typeof writeLog === 'function') writeLog('\u2705 \u96f2\u7aef\u9084\u539f\u5099\u4efd\u6210\u529f', 'success');
                    if (API_module.loadSchedules) {
                        API_module.loadSchedules().then(function(apiData) {
                            if (apiData && apiData.length > 0) {
                                window.masterScheduleDB = apiData.map(function(s) {
                                    if (API_module.normalizeScheduleFromApi) return API_module.normalizeScheduleFromApi(s);
                                    return s;
                                });
                                try { localStorage.setItem('county_master_db_v8', JSON.stringify(window.masterScheduleDB)); } catch(e) {}
                            }
                            D.renderGUICalendar(); D.renderWeekGlance();
                            if (typeof calculateMCRTrafficSummary === 'function') calculateMCRTrafficSummary();
                            if (typeof renderRundownUI === 'function') renderRundownUI();
                            D.refreshPresetDropdownUI();
                            if (typeof onPresetSelectionChange === 'function') onPresetSelectionChange();
                            if (window.isTrackingActive && typeof calculateGlobalTimelineMatrix === 'function') calculateGlobalTimelineMatrix(true);
                        });
                    }
                } else {
                    D._restoreFromFile(file);
                }
            });
        } else {
            D._restoreFromFile(file);
        }
        input.value = '';
    };

    D._restoreFromFile = function(file) {
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var ds = JSON.parse(e.target.result);
                if (!ds.version) { alert('\u7121\u6548\u7684\u8cc7\u6599\u6a94\u683c\u5f0f'); return; }
                D.applyDataSet(ds);
                D.updateFileStatus('\U0001f4c4 ' + file.name);
                if (typeof writeLog === 'function') writeLog('\u2705 \u5df2\u8f09\u5165\u5099\u4efd\u6a94: ' + file.name, 'success');
                D.renderGUICalendar(); D.renderWeekGlance();
                if (typeof calculateMCRTrafficSummary === 'function') calculateMCRTrafficSummary();
                if (typeof renderRundownUI === 'function') renderRundownUI();
                D.refreshPresetDropdownUI();
                if (typeof onPresetSelectionChange === 'function') onPresetSelectionChange();
                if (window.isTrackingActive && typeof calculateGlobalTimelineMatrix === 'function') calculateGlobalTimelineMatrix(true);
            } catch(err) { alert('\u6a94\u6848\u89e3\u6790\u932f\u8aa4: ' + err.message); }
        };
        reader.readAsText(file);
    };

    D.saveDataToFile = function(silent) {
        var API_module = window.API || (window.County && window.County.get && window.County.get('API'));
        if (API_module && API_module.downloadBackup) {
            API_module.downloadBackup().then(function(blob) {
                if (blob) {
                    var url = URL.createObjectURL(blob);
                    var a = document.createElement('a');
                    a.download = 'VCC_PRE_Backup_' + new Date().toISOString().split('T')[0] + '.json';
                    document.body.appendChild(a); a.click(); a.remove();
                    URL.revokeObjectURL(url);
                    if (!silent && typeof writeLog === 'function') writeLog('\U0001f4be \u96f2\u7aef\u5099\u4efd\u5df2\u4e0b\u8f09', 'success');
                } else {
                    D._exportToFile(silent);
                }
            });
        } else {
            D._exportToFile(silent);
        }
    };

    D._exportToFile = function(silent) {
        var ds = D.getDataSet();
        var json = JSON.stringify(ds, null, 2);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'VCC_PRE_Backup_' + new Date().toISOString().split('T')[0] + '.json';
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        if (!silent && typeof writeLog === 'function') writeLog('\U0001f4be \u672c\u5730\u5099\u4efd\u5df2\u4e0b\u8f09', 'success');
    };

    // ===== 週期邏輯 =====

    D.getPeriodicDays = function() {
        var cbs = document.querySelectorAll('.day-cb');
        var days = [];
        cbs.forEach(function(cb) { if (cb.checked) days.push(parseInt(cb.value, 10)); });
        return days;
    };

    D.setPeriodicDays = function(days) {
        var cbs = document.querySelectorAll('.day-cb');
        cbs.forEach(function(cb) {
            cb.checked = days.indexOf(parseInt(cb.value, 10)) >= 0;
        });
    };

    D.periodicTypeLabel = function(pt, days) {
        if (pt === 'none') return '\u55ae\u6b21';
        if (pt === 'daily') return '\u6bcf\u65e5';
        if (pt === 'weekdays') return '\u5de5\u4f5c\u65e5';
        if (pt === 'weekly') return '\u6bcf\u9031';
        if (pt === 'custom') {
            var names = ['\u65e5','\u4e00','\u4e8c','\u4e09','\u56db','\u4e94','\u516d'];
            return '\u6bcf\u9031 ' + (days || []).map(function(d) { return names[d]; }).join('');
        }
        return pt;
    };

    D.isProgramActiveOnDate = function(prog, targetDateStr) {
        if (targetDateStr < prog.broadcastDate) return false;
        if (prog.periodicType === 'none') {
            return prog.broadcastDate === targetDateStr;
        }
        if (prog.periodicEndDate && targetDateStr > prog.periodicEndDate) return false;
        var targetDateObj = new Date(targetDateStr);
        var dayOfWeek = targetDateObj.getDay();
        if (prog.periodicType === 'daily') return true;
        if (prog.periodicType === 'weekdays') return dayOfWeek >= 1 && dayOfWeek <= 5;
        if (prog.periodicType === 'weekly') {
            var baseDateObj = new Date(prog.broadcastDate);
            return baseDateObj.getDay() === dayOfWeek;
        }
        if (prog.periodicType === 'custom') {
            return (prog.periodicDays || []).indexOf(dayOfWeek) >= 0;
        }
        return false;
    };

    D.getExpandedRundownForDate = function(targetDateStr) {
        var masterScheduleDB = window.masterScheduleDB || [];
        var activeList = [];
        masterScheduleDB.forEach(function(prog) {
            if (D.isProgramActiveOnDate(prog, targetDateStr)) {
                var instance = {};
                for (var k in prog) { instance[k] = prog[k]; }
                instance.computedDate = targetDateStr;
                activeList.push(instance);
            }
        });
        activeList.sort(function(a, b) { return a.startTime.localeCompare(b.startTime); });
        return activeList;
    };

    // ===== Preset 管理 =====

    D.loadDefaultPresets = function() {
        var presets = D.getDefaultPresets();
        window.cuePresets = presets;
        try { localStorage.setItem('county_presets_v8', JSON.stringify(presets)); } catch(e) {}
        var API_module = window.API || (window.County && window.County.get && window.County.get('API'));
        if (API_module && API_module.savePreset) {
            for (var pid in presets) {
                API_module.savePreset({ id: pid, name: presets[pid].name, nodes: presets[pid].nodes });
            }
        }
    };

    D.getDefaultPresets = function() {
        return {
            "pre_broadcast": {
                name: "\u64ad\u51fa\u524d\u5012\u6578",
                nodes: [
                    { offset: -300, name: "\u23f3 \u64ad\u51fa\u524d\u4e94\u5206", freq: 600, soundId: "bell" },
                    { offset: -180, name: "\u23f3 \u64ad\u51fa\u524d\u4e09\u5206", freq: 800, soundId: "short_beep" },
                    { offset: -60, name: "\u23f3 \u64ad\u51fa\u524d\u4e00\u5206", freq: 900, soundId: "tone" },
                    { offset: -30, name: "\U0001f514 \u64ad\u51fa\u524d30\u79d2", freq: 1000, soundId: "double_beep" },
                    { offset: -15, name: "\U0001f514 \u64ad\u51fa\u524d15\u79d2\u5012\u6578", freq: 1200, soundId: "triple_beep" },
                    { offset: 0, name: "\u25b6 \u64ad\u51fa", freq: 2000, soundId: "alert" }
                ]
            },
            "pre_end": {
                name: "\u7d50\u675f\u524d\u5012\u6578",
                nodes: [
                    { offset: "e-180", name: "\u23f3 \u7d50\u675f\u524d\u4e09\u5206", freq: 800, soundId: "short_beep" },
                    { offset: "e-60", name: "\u23f3 \u7d50\u675f\u524d\u4e00\u5206", freq: 900, soundId: "tone" },
                    { offset: "e-30", name: "\U0001f514 \u7d50\u675f\u524d30\u79d2", freq: 1000, soundId: "double_beep" },
                    { offset: "e-15", name: "\U0001f514 \u7d50\u675f\u524d15\u79d2\u5012\u6578", freq: 1200, soundId: "triple_beep" },
                    { offset: "e0", name: "\u25a0 \u7d50\u675f", freq: 500, soundId: "bell" }
                ]
            },
            "news_program": {
                name: "\u65b0\u805e\u7bc0\u76ee\uff08\u4e00\u822c\uff09",
                nodes: [
                    { offset: -300, name: "\u23f3 \u958b\u59cb\u524d5\u5206", freq: 600, soundId: "bell" },
                    { offset: -180, name: "\u23f3 \u958b\u59cb\u524d3\u5206", freq: 800, soundId: "short_beep" },
                    { offset: -60, name: "\u23f3 \u958b\u59cb\u524d1\u5206", freq: 900, soundId: "tone" },
                    { offset: -30, name: "\U0001f514 \u958b\u59cb\u524d30\u79d2", freq: 1000, soundId: "double_beep" },
                    { offset: -15, name: "\U0001f514 \u958b\u59cb\u524d15\u79d2\u5012\u6578", freq: 1200, soundId: "triple_beep" },
                    { offset: 0, name: "\u25b6 \u958b\u64ad", freq: 2000, soundId: "alert" },
                    { offset: "e-180", name: "\u23f3 \u7d50\u675f\u524d3\u5206", freq: 800, soundId: "short_beep" },
                    { offset: "e-60", name: "\u23f3 \u7d50\u675f\u524d1\u5206", freq: 900, soundId: "tone" },
                    { offset: "e-30", name: "\U0001f514 \u7d50\u675f\u524d30\u79d2", freq: 1000, soundId: "double_beep" },
                    { offset: "e-15", name: "\U0001f514 \u7d50\u675f\u524d15\u79d2\u5012\u6578", freq: 1200, soundId: "triple_beep" },
                    { offset: "e0", name: "\u25a0 \u64ad\u653e\u7d50\u675f", freq: 500, soundId: "bell" }
                ]
            }
        };
    };

    D.refreshPresetDropdownUI = function() {
        var cuePresets = window.cuePresets || {};
        var progSelect = document.getElementById('progPreset');
        var mgrSelect = document.getElementById('presetSelector');
        if (!progSelect || !mgrSelect) return;
        var c1 = progSelect.value;
        var c2 = mgrSelect.value;
        progSelect.innerHTML = '';
        mgrSelect.innerHTML = '';
        var ids = Object.keys(cuePresets);
        ids.forEach(function(id) {
            var opt = document.createElement('option');
            opt.value = id;
            opt.innerText = cuePresets[id].name;
            progSelect.appendChild(opt);
        });
        ids.forEach(function(id) {
            var o2 = document.createElement('option');
            o2.value = id;
            o2.innerText = cuePresets[id].name;
            mgrSelect.appendChild(o2);
        });
        if (c1 && cuePresets[c1]) progSelect.value = c1;
        if (c2 && cuePresets[c2]) mgrSelect.value = c2;
    };

    // ===== 行事曆 =====

    D.renderGUICalendar = function() {
        var gridBody = document.getElementById('calendarGridBody');
        var monthLabel = document.getElementById('calendarMonthLabel');
        if (!gridBody || !monthLabel) return;

        gridBody.innerHTML = '';
        monthLabel.innerText = D.calCurrentYear + ' \u5e74 ' + String(D.calCurrentMonth + 1).padStart(2, '0') + ' \u6708';

        var firstDayIdx = new Date(D.calCurrentYear, D.calCurrentMonth, 1).getDay();
        var offset = firstDayIdx;
        var daysInMonth = new Date(D.calCurrentYear, D.calCurrentMonth + 1, 0).getDate();
        var selectedDateStr = document.getElementById('globalTargetDate').value;
        var todayStr = (typeof getTodayStr === 'function') ? getTodayStr() : new Date().toISOString().split('T')[0];
        var masterScheduleDB = window.masterScheduleDB || [];

        for (var i = 0; i < offset; i++) {
            var emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-day-cell empty';
            gridBody.appendChild(emptyCell);
        }

        var progCountCache = {};
        for (var day = 1; day <= daysInMonth; day++) {
            var cellDateStr = D.calCurrentYear + '-' + String(D.calCurrentMonth + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
            var count = 0;
            for (var d = 0; d < masterScheduleDB.length; d++) {
                if (D.isProgramActiveOnDate(masterScheduleDB[d], cellDateStr)) count++;
            }
            progCountCache[day] = count;
        }

        for (var day2 = 1; day2 <= daysInMonth; day2++) {
            var cellDateStr2 = D.calCurrentYear + '-' + String(D.calCurrentMonth + 1).padStart(2, '0') + '-' + String(day2).padStart(2, '0');
            var count2 = progCountCache[day2];

            var cell = document.createElement('div');
            cell.className = 'calendar-day-cell';
            cell.dataset.date = cellDateStr2;

            var daySpan = document.createElement('span');
            daySpan.style.cssText = 'font-size:13px;font-weight:bold;line-height:1.2;';
            daySpan.innerText = day2;
            cell.appendChild(daySpan);

            var countSpan = document.createElement('span');
            countSpan.className = 'calendar-prog-count';
            countSpan.innerText = count2 > 0 ? count2 + ' \u7bc0\u76ee' : '\u2014';
            cell.appendChild(countSpan);

            if (cellDateStr2 === selectedDateStr) cell.classList.add('selected');
            if (cellDateStr2 === todayStr) cell.classList.add('today');
            if (count2 > 0) cell.classList.add('has-progs');

            cell.onclick = function() {
                document.getElementById('globalTargetDate').value = this.dataset.date;
                if (typeof onGlobalDateChange === 'function') onGlobalDateChange();
            };

            gridBody.appendChild(cell);
        }
    };

    D.moveCalendarMonth = function(dir) {
        D.calCurrentMonth += dir;
        if (D.calCurrentMonth > 11) { D.calCurrentMonth = 0; D.calCurrentYear++; }
        if (D.calCurrentMonth < 0) { D.calCurrentMonth = 11; D.calCurrentYear--; }
        D.renderGUICalendar();
    };

    // ===== 本週縱覽 =====

    D.renderWeekGlance = function() {
        var container = document.getElementById('weekGlanceContainer');
        var label = document.getElementById('weekGlanceLabel');
        if (!container) return;

        var selectedDate = document.getElementById('globalTargetDate').value;
        if (!selectedDate) return;
        var sel = new Date(selectedDate);
        var sunday = new Date(sel);
        sunday.setDate(sunday.getDate() - sunday.getDay());
        var weekDays = [];
        var dayNames = ['\u9031\u65e5','\u9031\u4e00','\u9031\u4e8c','\u9031\u4e09','\u9031\u56db','\u9031\u4e94','\u9031\u516d'];
        for (var i = 0; i < 7; i++) {
            var d = new Date(sunday);
            d.setDate(sunday.getDate() + i);
            weekDays.push(d);
        }
        if (label) {
            var weekStart = (sunday.getMonth() + 1) + '/' + sunday.getDate();
            var weekEnd = weekDays[6];
            label.innerText = '\u9031' + weekStart + ' \u2014 ' + (weekEnd.getMonth() + 1) + '/' + weekEnd.getDate();
        }

        var todayStr = (typeof getTodayStr === 'function') ? getTodayStr() : new Date().toISOString().split('T')[0];
        var MATRIX_COLORS = D.MATRIX_COLORS;
        var progColorIdx = {};

        container.innerHTML = '';
        weekDays.forEach(function(d) {
            var dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            var header = document.createElement('div');
            header.className = 'week-day-header' + (dateStr === todayStr ? ' today' : '');
            header.innerHTML = dayNames[d.getDay()] + '<span>' + d.getDate() + '</span>';
            container.appendChild(header);
        });

        weekDays.forEach(function(d) {
            var dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            var cell = document.createElement('div');
            cell.className = 'week-day-cell';
            var progs = D.getExpandedRundownForDate(dateStr);
            progs.sort(function(a, b) { return a.startTime.localeCompare(b.startTime); });
            progs.forEach(function(p) {
                if (!progColorIdx[p.name]) {
                    if (p.colorLabel) {
                        var bestDiff = Infinity, bestIdx = 0;
                        for (var ci2 = 0; ci2 < MATRIX_COLORS.length; ci2++) {
                            var diff = Math.abs(parseInt(p.colorLabel.slice(1), 16) - parseInt(MATRIX_COLORS[ci2].slice(1), 16));
                            if (diff < bestDiff) { bestDiff = diff; bestIdx = ci2; }
                        }
                        progColorIdx[p.name] = bestIdx;
                    } else {
                        progColorIdx[p.name] = Object.keys(progColorIdx).length % 8;
                    }
                }
                var ci = progColorIdx[p.name];
                var block = document.createElement('div');
                block.className = 'week-prog-block';
                block.style.borderLeftColor = MATRIX_COLORS[ci];
                block.style.backgroundColor = MATRIX_COLORS[ci] + '15';
                block.dataset.progId = p.id;
                var tagHtml = '';
                if (p.tags && p.tags.length > 0) {
                    tagHtml = '<div class="wp-tags">' + p.tags.map(function(t) {
                        return '<span class="tag-badge" style="background:#1f2937;color:#e2e8f0;">' + t + '</span>';
                    }).join('') + '</div>';
                }
                block.innerHTML = '<div class="wp-time">' + p.startTime.substring(0, 5) + ' - ' + p.duration.substring(0, 5) + '</div><div class="wp-name">' + p.name + '</div>' + tagHtml;
                block.onclick = function(e) {
                    e.stopPropagation();
                    if (typeof enterEditMode === 'function') enterEditMode(this.dataset.progId);
                };
                cell.appendChild(block);
            });
            if (progs.length === 0) {
                var empty = document.createElement('div');
                empty.style.cssText = 'color:#374151; font-size:9px; text-align:center; padding-top:20px;';
                empty.innerText = '\u2014';
                cell.appendChild(empty);
            }
            container.appendChild(cell);
        });
    };

    // ===== 全域日期變更 =====

    D.onGlobalDateChange = function() {
        var selectedDate = document.getElementById('globalTargetDate').value;
        if (typeof saveConfig === 'function') saveConfig();
        if (typeof writeLog === 'function') writeLog('\u5de5\u4f5c\u53f0\u5168\u57df\u89c0\u6e2c\u65e5\u671f\u5207\u63db\u81f3\uff1a' + selectedDate, 'warn');

        var matrixTitleEl = document.getElementById('matrixTitle');
        var rundownListTitleEl = document.getElementById('rundownListTitle');
        var globalDateDisplayEl = document.getElementById('lblGlobalDateDisplay');

        if (matrixTitleEl) matrixTitleEl.innerText = '\u6838\u5fc3\u6642\u5e8f\u805a\u7126\u77e9\u9635 (' + selectedDate + ' \u89c0\u6e2c\u7248)';
        if (rundownListTitleEl) rundownListTitleEl.innerText = '\u52d5\u614b\u7bc0\u76ee\u8868\u5feb\u7167 (' + selectedDate + ' Traffic Log)';
        if (globalDateDisplayEl) globalDateDisplayEl.innerText = selectedDate;

        var parts = selectedDate.split('-');
        D.calCurrentYear = parseInt(parts[0], 10);
        D.calCurrentMonth = parseInt(parts[1], 10) - 1;

        document.getElementById('progDate').value = selectedDate;

        D.renderGUICalendar();
        D.renderWeekGlance();
        if (typeof calculateMCRTrafficSummary === 'function') calculateMCRTrafficSummary();
        if (typeof renderRundownUI === 'function') renderRundownUI();
        if (window.isTrackingActive && typeof calculateGlobalTimelineMatrix === 'function') calculateGlobalTimelineMatrix(true);
    };

    return D;
});
