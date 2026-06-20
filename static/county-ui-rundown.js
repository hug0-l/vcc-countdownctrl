// county-ui-rundown.js — 排程頁 UI 模組
County.register('RundownUI', function(C) {
    var R = {};

    R.rundownSortState = { field: null, asc: true };

    // ===== 行事曆 =====
    R.renderGUICalendar = function() {
        var gridBody = document.getElementById('calendarGridBody');
        var monthLabel = document.getElementById('calendarMonthLabel');
        if (!gridBody || !monthLabel) return;

        gridBody.innerHTML = '';
        var calCurrentYear = window.calCurrentYear || new Date().getFullYear();
        var calCurrentMonth = window.calCurrentMonth || new Date().getMonth();
        monthLabel.innerText = calCurrentYear + ' \u5e74 ' + String(calCurrentMonth + 1).padStart(2, '0') + ' \u6708';

        var firstDayIdx = new Date(calCurrentYear, calCurrentMonth, 1).getDay();
        var offset = firstDayIdx;
        var daysInMonth = new Date(calCurrentYear, calCurrentMonth + 1, 0).getDate();
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
            var cellDateStr = calCurrentYear + '-' + String(calCurrentMonth + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
            var count = 0;
            for (var d = 0; d < masterScheduleDB.length; d++) {
                if (typeof isProgramActiveOnDate === 'function') {
                    if (isProgramActiveOnDate(masterScheduleDB[d], cellDateStr)) count++;
                }
            }
            progCountCache[day] = count;
        }

        for (var day2 = 1; day2 <= daysInMonth; day2++) {
            var cellDateStr2 = calCurrentYear + '-' + String(calCurrentMonth + 1).padStart(2, '0') + '-' + String(day2).padStart(2, '0');
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

    R.moveCalendarMonth = function(dir) {
        var calCurrentYear = window.calCurrentYear || new Date().getFullYear();
        var calCurrentMonth = window.calCurrentMonth || new Date().getMonth();
        calCurrentMonth += dir;
        if (calCurrentMonth > 11) { calCurrentMonth = 0; calCurrentYear++; }
        if (calCurrentMonth < 0) { calCurrentMonth = 11; calCurrentYear--; }
        window.calCurrentYear = calCurrentYear;
        window.calCurrentMonth = calCurrentMonth;
        R.renderGUICalendar();
    };

    // ===== 本週縱覽 =====
    R.renderWeekGlance = function() {
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
        var MATRIX_COLORS = window.MATRIX_COLORS || ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#06b6d4','#f97316'];
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
            var progs = (typeof getExpandedRundownForDate === 'function') ? getExpandedRundownForDate(dateStr) : [];
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

    // ===== 週期類型切換 =====
    R.onPeriodicTypeChange = function() {
        var type = document.getElementById('periodicType').value;
        var endGroup = document.getElementById('periodicEndGroup');
        var dayGroup = document.getElementById('periodicDayGroup');
        if (type === 'none') {
            endGroup.style.display = 'none';
            if (dayGroup) dayGroup.style.display = 'none';
        } else {
            endGroup.style.display = 'flex';
            if (!document.getElementById('periodicEndDate').value) {
                document.getElementById('periodicEndDate').value = document.getElementById('progDate').value;
            }
            if (dayGroup) dayGroup.style.display = (type === 'custom') ? 'flex' : 'none';
        }
    };

    // ===== MCR 交通摘要 =====
    R.calculateMCRTrafficSummary = function() {
        var targetDateStr = document.getElementById('globalTargetDate').value;
        var activeList = (typeof getExpandedRundownForDate === 'function') ? getExpandedRundownForDate(targetDateStr) : [];

        var totalCountEl = document.getElementById('homeTotalCount');
        if (totalCountEl) totalCountEl.innerText = activeList.length;

        var hasOverlapConflict = false;
        var previousEndFrames = -1;

        activeList.forEach(function(prog) {
            var startFr = (typeof timecodeToTotalFrames === 'function') ? timecodeToTotalFrames(prog.startTime) : 0;
            var durFr = (typeof timecodeToTotalFrames === 'function') ? timecodeToTotalFrames(prog.duration) : 0;
            var endFr = startFr + durFr;
            if (startFr < previousEndFrames) {
                hasOverlapConflict = true;
            }
            previousEndFrames = Math.max(previousEndFrames, endFr);
        });

        var conflictStatusEl = document.getElementById('homeConflictStatus');
        var conflictBlockEl = document.getElementById('homeConflictBlock');
        if (conflictBlockEl && conflictStatusEl) {
            if (hasOverlapConflict) {
                conflictBlockEl.classList.add('alert-active');
                conflictStatusEl.innerText = '\u26a0\ufe0f \u6642\u5e8f\u91cd\u758a\u885d\u7a81';
                conflictStatusEl.style.color = 'const(--danger)';
            } else {
                conflictBlockEl.classList.remove('alert-active');
                conflictStatusEl.innerText = '\u25cf \u5b89\u5168\u6b63\u5e38';
                conflictStatusEl.style.color = 'const(--success)';
            }
        }
    };

    // ===== 全域日期變更 =====
    R.onGlobalDateChange = function() {
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
        window.calCurrentYear = parseInt(parts[0], 10);
        window.calCurrentMonth = parseInt(parts[1], 10) - 1;

        document.getElementById('progDate').value = selectedDate;

        R.renderGUICalendar();
        R.renderWeekGlance();
        if (typeof calculateMCRTrafficSummary === 'function') calculateMCRTrafficSummary();
        if (typeof renderRundownUI === 'function') renderRundownUI();
        if (window.isTrackingActive && typeof calculateGlobalTimelineMatrix === 'function') calculateGlobalTimelineMatrix(true);
    };

    // ===== 標籤 & 顏色管理 =====
    R.renderColorPicker = function(selectedIdx) {
        var picker = document.getElementById('progColorPicker');
        if (!picker) return;
        picker.innerHTML = '';
        ['\u7121 (\u81ea\u52d5)', '#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#06b6d4','#f97316'].forEach(function(c, idx) {
            var dot = document.createElement('div');
            dot.className = 'clr-opt' + (selectedIdx === idx ? ' active' : '');
            if (idx === 0) { dot.style.cssText = 'width:24px;height:24px;border-radius:4px;cursor:pointer;border:2px solid transparent;font-size:10px;display:flex;align-items:center;justify-content:center;color:#64748b;'; dot.innerText = '\u2715'; }
            else { dot.style.backgroundColor = c; }
            dot.onclick = function() {
                document.querySelectorAll('.clr-opt').forEach(function(o) { o.classList.remove('active'); });
                dot.classList.add('active');
                document.getElementById('progColorLabel').value = idx === 0 ? '' : c;
            };
            picker.appendChild(dot);
        });
    };

    R.renderTagList = function() {
        var list = document.getElementById('progTagList');
        if (!list) return;
        list.innerHTML = '';
        var currentTags = window.currentTags || [];
        currentTags.forEach(function(t, idx) {
            var badge = document.createElement('span');
            badge.className = 'tag-badge';
            badge.style.cssText = 'background:#1f2937;color:#e2e8f0;display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:3px;font-size:11px;';
            badge.innerHTML = t + ' <span style="cursor:pointer;color:#ef4444;font-weight:bold;margin-left:2px;" onclick="removeProgramTag(' + idx + ')">\u2715</span>';
            list.appendChild(badge);
        });
    };

    R.addProgramTag = function() {
        var input = document.getElementById('progTagInput');
        var tag = input.value.trim();
        var currentTags = window.currentTags || [];
        if (!tag || currentTags.indexOf(tag) >= 0) return;
        currentTags.push(tag);
        window.currentTags = currentTags;
        input.value = '';
        R.renderTagList();
    };

    R.removeProgramTag = function(idx) {
        var currentTags = window.currentTags || [];
        currentTags.splice(idx, 1);
        window.currentTags = currentTags;
        R.renderTagList();
    };

    // ===== 排程 CRUD =====
    R.submitProgramForm = function() {
        var name = document.getElementById('progName').value.trim();
        var bDate = document.getElementById('progDate').value;
        var startStr = document.getElementById('startTimeStr').value;
        var durStr = document.getElementById('durationStr').value;
        var pType = document.getElementById('periodicType').value;
        var pEndDate = document.getElementById('periodicEndDate').value;
        var pid = document.getElementById('progPreset').value;
        var periodicDays = (pType === 'custom') ? (typeof getPeriodicDays === 'function' ? getPeriodicDays() : []) : [];
        var masterScheduleDB = window.masterScheduleDB || [];

        if (!name || !bDate || !startStr || !durStr) { alert('\u8acb\u5b8c\u6574\u586b\u5beb\u88fd\u64ad\u6b04\u4f4d\uff01'); return; }
        if (pType !== 'none' && pEndDate < bDate) { alert('\u91cd\u8907\u7d42\u6b62\u65e5\u671f\u4e0d\u5f97\u65e9\u65bc\u8d77\u64ad\u751f\u6548\u65e5\u671f\uff01'); return; }
        if (pType === 'custom' && periodicDays.length === 0) { alert('\u8acb\u81f3\u5c11\u9078\u64c7\u4e00\u5929\uff01'); return; }

        var colorLabel = document.getElementById('progColorLabel').value;
        var tags = (window.currentTags || []).slice();
        var currentEditingId = window.currentEditingId;

        if (currentEditingId !== null) {
            var overrideSingle = document.getElementById('chkOverrideSingle').checked;
            var target = masterScheduleDB.find(function(p) { return p.id === currentEditingId; });
            if (target) {
                if (overrideSingle && target.periodicType !== 'none') {
                    masterScheduleDB.push({
                        id: 'P_' + Date.now(), name: name, broadcastDate: bDate, startTime: startStr,
                        duration: durStr, periodicType: 'none', periodicEndDate: '',
                        presetId: pid, tags: tags, colorLabel: colorLabel, periodicDays: [],
                        _updatedAt: Date.now()
                    });
                    if (typeof writeLog === 'function') writeLog('\U0001f500 \u5df2\u5efa\u7acb\u55ae\u6b21\u8986\u84cb\u7bc0\u76ee\uff08\u539f\u59cb\u9031\u671f\u672a\u8b8a\u66f4\uff09\u3002');
                } else {
                    target.name = name; target.broadcastDate = bDate; target.startTime = startStr;
                    target.duration = durStr; target.periodicType = pType; target.periodicEndDate = (pType === 'none' ? '' : pEndDate);
                    target.presetId = pid; target.tags = tags; target.colorLabel = colorLabel;
                    target.periodicDays = periodicDays;
                    target._updatedAt = Date.now();
                    if (typeof writeLog === 'function') writeLog('\u5df2\u66f4\u65b0\u6392\u7a0b\u8cc7\u6e90\u689d\u76ee\u3002');
                }
            }
            R.exitEditMode();
        } else {
            masterScheduleDB.push({
                id: 'P_' + Date.now(), name: name, broadcastDate: bDate, startTime: startStr,
                duration: durStr, periodicType: pType, periodicEndDate: (pType === 'none' ? '' : pEndDate),
                presetId: pid, tags: tags, colorLabel: colorLabel, periodicDays: periodicDays,
                _updatedAt: Date.now()
            });
            if (typeof writeLog === 'function') writeLog('\u65b0\u589e\u8de8\u671f\u7de8\u6392\u7bc0\u76ee [' + name + '] \u6210\u529f\u3002');
        }
        window.masterScheduleDB = masterScheduleDB;
        if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
        R.renderGUICalendar();
        if (typeof calculateMCRTrafficSummary === 'function') calculateMCRTrafficSummary();
        if (typeof renderRundownUI === 'function') renderRundownUI();
        if (window.isTrackingActive && typeof calculateGlobalTimelineMatrix === 'function') calculateGlobalTimelineMatrix(true);
    };

    R.enterEditMode = function(id) {
        var masterScheduleDB = window.masterScheduleDB || [];
        var target = masterScheduleDB.find(function(p) { return p.id === id; });
        if (!target) return;
        window.currentEditingId = id;
        document.getElementById('progName').value = target.name;
        document.getElementById('progDate').value = target.broadcastDate;
        document.getElementById('startTimeStr').value = target.startTime;
        document.getElementById('durationStr').value = target.duration;
        document.getElementById('periodicType').value = target.periodicType;
        document.getElementById('periodicEndDate').value = target.periodicEndDate || target.broadcastDate;
        document.getElementById('progPreset').value = target.presetId || 'pre_broadcast';
        if (typeof setPeriodicDays === 'function') setPeriodicDays(target.periodicDays || []);
        window.currentTags = target.tags ? target.tags.slice() : [];
        R.renderTagList();
        var clrIdx = 0;
        if (target.colorLabel) {
            var clrOpts = ['', '#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#06b6d4','#f97316'];
            clrIdx = clrOpts.indexOf(target.colorLabel);
            if (clrIdx < 0) clrIdx = 0;
        }
        R.renderColorPicker(clrIdx);
        document.getElementById('progColorLabel').value = target.colorLabel || '';

        var overrideGroup = document.getElementById('overrideSingleGroup');
        if (overrideGroup) {
            overrideGroup.style.display = (target.periodicType !== 'none') ? 'block' : 'none';
        }
        document.getElementById('chkOverrideSingle').checked = false;

        if (typeof onPeriodicTypeChange === 'function') onPeriodicTypeChange();
        document.getElementById('formPanelTitle').innerText = '\u270f\ufe0f \u8b8a\u66f4\u8abf\u5ea6\u4e3b\u6a94 (ID: ' + id + ')';
        var submitBtn = document.getElementById('btnSubmitForm');
        submitBtn.className = 'btn-update'; submitBtn.innerText = '\U0001f4be \u66f4\u65b0\u8b8a\u66f4\u9805\u76ee (Update)';
        document.getElementById('btnCancelEdit').style.display = 'inline-block';
        if (typeof switchPage === 'function') switchPage('rundown');
    };

    R.exitEditMode = function() {
        window.currentEditingId = null;
        document.getElementById('formPanelTitle').innerText = '\u8de8\u671f\u4ea4\u901a\u8abf\u5ea6\u8f38\u5165 (Traffic Entry Input)';
        var submitBtn = document.getElementById('btnSubmitForm');
        submitBtn.className = 'btn-add'; submitBtn.innerText = '\u5132\u5b58\u81f3\u7de8\u6392\u5eab (Save Entry)';
        document.getElementById('btnCancelEdit').style.display = 'none';

        var todayStr = document.getElementById('globalTargetDate').value;
        document.getElementById('progName').value = '\u65b0\u7de8\u6392\u5e38\u898f\u7bc0\u76ee';
        document.getElementById('progDate').value = todayStr;
        if (typeof dateToTimecode === 'function' && typeof getCalibratedDate === 'function') {
            document.getElementById('startTimeStr').value = dateToTimecode(getCalibratedDate());
        }
        document.getElementById('periodicType').value = 'none';
        if (typeof setPeriodicDays === 'function') setPeriodicDays([]);
        window.currentTags = [];
        R.renderTagList();
        R.renderColorPicker(0);
        document.getElementById('progColorLabel').value = '';
        document.getElementById('chkOverrideSingle').checked = false;
        document.getElementById('overrideSingleGroup').style.display = 'none';
        if (typeof onPeriodicTypeChange === 'function') onPeriodicTypeChange();
    };

    R.duplicateProgram = function(id) {
        var masterScheduleDB = window.masterScheduleDB || [];
        var target = masterScheduleDB.find(function(p) { return p.id === id; });
        if (!target) return;
        document.getElementById('progName').value = target.name + ' (\u8907\u88fd)';
        document.getElementById('progDate').value = target.broadcastDate;
        document.getElementById('startTimeStr').value = target.startTime;
        document.getElementById('durationStr').value = target.duration;
        document.getElementById('periodicType').value = target.periodicType;
        document.getElementById('periodicEndDate').value = target.periodicEndDate || target.broadcastDate;
        document.getElementById('progPreset').value = target.presetId || 'pre_broadcast';
        if (typeof setPeriodicDays === 'function') setPeriodicDays(target.periodicDays || []);
        window.currentTags = target.tags ? target.tags.slice() : [];
        R.renderTagList();
        var clrIdx = 0;
        if (target.colorLabel) {
            var clrOpts = ['', '#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#06b6d4','#f97316'];
            clrIdx = clrOpts.indexOf(target.colorLabel);
            if (clrIdx < 0) clrIdx = 0;
        }
        R.renderColorPicker(clrIdx);
        document.getElementById('progColorLabel').value = target.colorLabel || '';
        if (typeof onPeriodicTypeChange === 'function') onPeriodicTypeChange();
        window.currentEditingId = null;
        document.getElementById('formPanelTitle').innerText = '\U0001f4cb \u8907\u88fd\u7bc0\u76ee \u2014 \u8abf\u6574\u5f8c\u5132\u5b58';
        var submitBtn = document.getElementById('btnSubmitForm');
        submitBtn.className = 'btn-add'; submitBtn.innerText = '\U0001f4cb \u53e6\u5b58\u65b0\u7bc0\u76ee (Save as New)';
        document.getElementById('btnCancelEdit').style.display = 'none';
        document.getElementById('chkOverrideSingle').checked = false;
        document.getElementById('overrideSingleGroup').style.display = 'none';
        if (typeof switchPage === 'function') switchPage('rundown');
        if (typeof writeLog === 'function') writeLog('\U0001f4cb \u5df2\u8907\u88fd\u7bc0\u76ee [' + target.name + ']\uff0c\u8acb\u8abf\u6574\u5f8c\u5132\u5b58\u3002', 'info');
    };

    R.deleteProgram = function(id) {
        var masterScheduleDB = window.masterScheduleDB || [];
        if (window.currentEditingId === id) R.exitEditMode();
        masterScheduleDB = masterScheduleDB.filter(function(p) { return p.id !== id; });
        window.masterScheduleDB = masterScheduleDB;
        if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
        R.renderGUICalendar();
        if (typeof calculateMCRTrafficSummary === 'function') calculateMCRTrafficSummary();
        if (typeof renderRundownUI === 'function') renderRundownUI();
        if (window.isTrackingActive && typeof calculateGlobalTimelineMatrix === 'function') calculateGlobalTimelineMatrix(true);
        var API_obj = window.API;
        if (API_obj && typeof API_obj.deleteSchedule === 'function') {
            API_obj.deleteSchedule(id).catch(function() {
                if (typeof _pendingDeletes !== 'undefined') {
                    window._pendingDeletes = window._pendingDeletes || new Set();
                    window._pendingDeletes.add(id);
                }
                if (typeof writeLog === 'function') writeLog('\u23f3 \u522a\u9664\u5df2\u4f70\u5217\uff0c\u6062\u5fa9\u9023\u7dda\u5f8c\u81ea\u52d5\u540c\u6b65', 'warn');
            });
        }
    };

    R.clearAllPrograms = function() {
        if (confirm('\u78ba\u5b9a\u5168\u6e05 County \u7de8\u6392\u5eab\uff1f\u6240\u6709\u5e38\u898f\u8a2d\u5b9a\u5c07\u6d88\u5931\u3002')) {
            var masterScheduleDB = window.masterScheduleDB || [];
            if (window.currentEditingId !== null) R.exitEditMode();
            var API_obj = window.API;
            if (API_obj && typeof API_obj.deleteSchedule === 'function') {
                masterScheduleDB.forEach(function(p) {
                    API_obj.deleteSchedule(p.id).catch(function() {
                        window._pendingDeletes = window._pendingDeletes || new Set();
                        window._pendingDeletes.add(p.id);
                    });
                });
            }
            window.masterScheduleDB = [];
            if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
            R.renderGUICalendar();
            if (typeof calculateMCRTrafficSummary === 'function') calculateMCRTrafficSummary();
            if (typeof renderRundownUI === 'function') renderRundownUI();
            if (window.isTrackingActive && typeof calculateGlobalTimelineMatrix === 'function') calculateGlobalTimelineMatrix(true);
        }
    };

    // ===== 排程匯出/匯入 =====
    R.exportRundown = function() {
        var masterScheduleDB = window.masterScheduleDB || [];
        var dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(masterScheduleDB, null, 2));
        var dl = document.createElement('a');
        dl.setAttribute('href', dataStr);
        dl.setAttribute('download', 'VCC_PRE_Visual_MasterSchedule.json');
        document.body.appendChild(dl); dl.click(); dl.remove();
    };

    R.importRundown = function(input) {
        var file = input.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var imported = JSON.parse(e.target.result);
                if (Array.isArray(imported)) {
                    window.masterScheduleDB = imported;
                    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
                    if (typeof onGlobalDateChange === 'function') onGlobalDateChange();
                    if (typeof writeLog === 'function') writeLog('\u5916\u90e8\u591a\u671f\u4ea4\u901a\u6578\u64da\u96c6\u8996\u89ba\u5316\u6ce8\u5165\u6210\u529f\u3002');
                }
            } catch(err) { alert('\u6a94\u6848\u89e3\u6790\u5931\u6557'); }
        };
        reader.readAsText(file);
        input.value = '';
    };

    // ===== 排程排序 =====
    R.sortRundownTable = function(field) {
        if (R.rundownSortState.field === field) R.rundownSortState.asc = !R.rundownSortState.asc;
        else { R.rundownSortState.field = field; R.rundownSortState.asc = true; }
        document.querySelectorAll('#rundownTable .sort-icon').forEach(function(el) {
            el.textContent = '';
            el.classList.remove('active');
        });
        var iconEl = document.getElementById('sortRundown-' + field);
        if (iconEl) { iconEl.textContent = R.rundownSortState.asc ? '\u25b2' : '\u25bc'; iconEl.classList.add('active'); }
        if (typeof renderRundownUI === 'function') renderRundownUI();
    };

    // ===== 排程表渲染 =====
    R.renderRundownUI = function() {
        var tbody = document.getElementById('rundownTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        var targetDateStr = document.getElementById('globalTargetDate').value;
        var activeList = (typeof getExpandedRundownForDate === 'function') ? getExpandedRundownForDate(targetDateStr) : [];

        if (activeList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #4b5563;">\u26a0\ufe0f \u89c0\u6e2c\u65e5\u671f [' + targetDateStr + '] \u7121\u4efb\u4f55\u55ae\u6b21\u6216\u5e38\u898f\u9031\u671f\u7bc0\u76ee\u3002</td></tr>';
            return;
        }

        if (R.rundownSortState.field) {
            var cuePresets = window.cuePresets || {};
            activeList.sort(function(a, b) {
                var va = a[R.rundownSortState.field], vb = b[R.rundownSortState.field];
                if (R.rundownSortState.field === 'startTime' || R.rundownSortState.field === 'duration' || R.rundownSortState.field === 'endTime') {
                    if (R.rundownSortState.field === 'endTime') {
                        if (typeof computeEndTime === 'function') {
                            va = computeEndTime(va, a.duration);
                            vb = computeEndTime(vb, b.duration);
                        }
                    }
                } else if (R.rundownSortState.field === 'presetId') {
                    va = (cuePresets[va] ? cuePresets[va].name : va || '').toLowerCase();
                    vb = (cuePresets[vb] ? cuePresets[vb].name : vb || '').toLowerCase();
                } else {
                    va = (va || '').toString().toLowerCase();
                    vb = (vb || '').toString().toLowerCase();
                }
                if (va < vb) return R.rundownSortState.asc ? -1 : 1;
                if (va > vb) return R.rundownSortState.asc ? 1 : -1;
                return 0;
            });
        }

        var currentTotalFrames = 0;
        if (typeof timecodeToTotalFrames === 'function' && typeof dateToTimecode === 'function' && typeof getCalibratedDate === 'function') {
            currentTotalFrames = timecodeToTotalFrames(dateToTimecode(getCalibratedDate()));
        }
        var onAirId = null, nextUpId = null;
        activeList.forEach(function(prog) {
            var sf = (typeof timecodeToTotalFrames === 'function') ? timecodeToTotalFrames(prog.startTime) : 0;
            var ef = sf + ((typeof timecodeToTotalFrames === 'function') ? timecodeToTotalFrames(prog.duration) : 0);
            if (currentTotalFrames >= sf && currentTotalFrames <= ef) onAirId = prog.id;
            if (sf > currentTotalFrames && !nextUpId) nextUpId = prog.id;
        });

        var MATRIX_COLORS = window.MATRIX_COLORS || ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#06b6d4','#f97316'];
        var progColorMap = window.progColorMap || {};
        var cuePresets = window.cuePresets || {};

        activeList.forEach(function(prog, idx) {
            if (prog.colorLabel) {
                progColorMap[prog.name] = prog.colorLabel;
            } else {
                progColorMap[prog.name] = idx % 8;
            }
        });
        window.progColorMap = progColorMap;

        tbody.onclick = function(e) {
            var target = e.target;
            while (target && target !== tbody) {
                if (target.tagName === 'BUTTON' || target.tagName === 'A') return;
                if (target.tagName === 'TR' && target.dataset.progId) {
                    if (typeof enterEditMode === 'function') enterEditMode(target.dataset.progId);
                    return;
                }
                target = target.parentNode;
            }
        };

        activeList.forEach(function(prog) {
            var typeLabel = (typeof periodicTypeLabel === 'function') ? periodicTypeLabel(prog.periodicType, prog.periodicDays) : prog.periodicType;
            var typeBadge = (prog.periodicType === 'none') ? 'badge-sched' : 'badge-periodic';
            var currentPresetName = cuePresets[prog.presetId] ? cuePresets[prog.presetId].name : '\u672a\u6307\u5b9a';
            var cIdx = (progColorMap[prog.name] !== undefined) ? progColorMap[prog.name] : 0;
            if (typeof cIdx === 'string') {
                // colorLabel was a hex string, find closest MATRIX_COLORS index
                var bestDiff = Infinity, bestIdx = 0;
                for (var ci = 0; ci < MATRIX_COLORS.length; ci++) {
                    var diff = Math.abs(parseInt(cIdx.slice(1), 16) - parseInt(MATRIX_COLORS[ci].slice(1), 16));
                    if (diff < bestDiff) { bestDiff = diff; bestIdx = ci; }
                }
                cIdx = bestIdx;
            }
            var dotColor = MATRIX_COLORS[cIdx] || MATRIX_COLORS[0];
            var highlightClass = '';
            if (prog.id === onAirId) highlightClass = 'row-onair';
            else if (prog.id === nextUpId) highlightClass = 'row-nextup';

            var tagsHtml = '';
            if (prog.tags && prog.tags.length > 0) {
                prog.tags.forEach(function(tt) {
                    tagsHtml += '<span class="tag-badge" style="background:#1f2937;color:#e2e8f0;">' + tt + '</span>';
                });
            }

            var endTimeStr = prog.startTime;
            if (typeof computeEndTime === 'function') {
                endTimeStr = computeEndTime(prog.startTime, prog.duration);
            }

            tbody.innerHTML += '<tr class="' + highlightClass + '" data-prog-id="' + prog.id + '">' +
                '<td><span class="prog-color-dot" style="background:' + dotColor + ';"></span><b>' + prog.name + '</b> ' + tagsHtml + '</td>' +
                '<td style="color:#9ca3af;">' + prog.broadcastDate + '</td>' +
                '<td style="font-family:monospace; font-weight:bold;">' + prog.startTime + '</td>' +
                '<td style="font-family:monospace;">' + endTimeStr + '</td>' +
                '<td style="font-family:monospace;">' + prog.duration + '</td>' +
                '<td><span class="status-badge ' + typeBadge + '">' + typeLabel + '</span></td>' +
                '<td><span style="color:#38bdf8;">' + currentPresetName + '</span></td>' +
                '<td style="text-align: center; white-space:nowrap;">' +
                    '<button class="btn-action btn-action-edit" onclick="enterEditMode(\'' + prog.id + '\')">\u270f\ufe0f \u7de8\u8f2f</button>' +
                    '<button class="btn-action btn-action-copy" onclick="duplicateProgram(\'' + prog.id + '\')">\U0001f4cb \u8907\u88fd</button>' +
                    '<button class="btn-action btn-action-del" onclick="deleteProgram(\'' + prog.id + '\')">\u274c \u522a\u9664</button>' +
                '</td>' +
                '</tr>';
        });
    };

    // ===== 搜尋排程 =====
    R.filterRundown = function() {
        var query = document.getElementById('searchRundown').value.trim().toLowerCase();
        var rows = document.querySelectorAll('#rundownTableBody tr');
        rows.forEach(function(row) {
            var nameCell = row.querySelector('td:first-child b');
            if (!nameCell) { row.style.display = ''; return; }
            var name = nameCell.textContent.toLowerCase();
            row.style.display = (query === '' || name.indexOf(query) >= 0) ? '' : 'none';
        });
    };

    return R;
});
