#!/usr/bin/env python3
"""
County — Backend Server
FastAPI + SQLite + ntplib NTP syncing
Single-file server. python server.py to start.
"""

import json
import os
import sqlite3
import sys
import threading
import time
import webbrowser
from datetime import date, datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Request, UploadFile, Query
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

LOGS_DIR = Path(__file__).parent / "logs"
LOGS_DIR.mkdir(exist_ok=True)

# Current server log file path (one log per day for 24h retention)
def _current_log_path() -> Path:
    return LOGS_DIR / f"county_{date.today().isoformat()}.log"


# Client log file (dedicated file, collected from frontend)
CLIENT_LOG_FILE = LOGS_DIR / "client_logs.log"


def _append_log(level: str, msg: str):
    """Append a log line to the daily log file + print to stderr."""
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"{ts} [{level:<7}] {msg}"
    print(line, file=sys.stderr)  # stderr = visible in process output
    log_path = _current_log_path()
    try:
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass  # non-critical


# Convenience helpers
def log_info(msg: str):    _append_log("INFO", msg)
def log_warn(msg: str):    _append_log("WARN", msg)
def log_error(msg: str):   _append_log("ERROR", msg)


def db_append_client_log(entries: list):
    """Append client log entries to a dedicated log file + print to stderr."""
    for entry in entries:
        ts = entry.get('ts', datetime.now(timezone.utc).isoformat())
        level = entry.get('level', 'INFO').upper()
        msg = entry.get('msg', '')
        line = f"[{ts}] [CLIENT-{level}] {msg}"
        print(line, file=sys.stderr)
        try:
            with open(CLIENT_LOG_FILE, 'a', encoding='utf-8') as f:
                f.write(line + '\n')
        except Exception:
            pass


# Clean up log files older than 24 hours
def _clean_old_logs():
    now = time.time()
    cutoff = now - 86400
    for f in LOGS_DIR.iterdir():
        if f.suffix == ".log" and f.stat().st_mtime < cutoff:
            try:
                f.unlink()
                _append_log("INFO", f"🧹 Removed old log: {f.name}")
            except Exception:
                pass


_clean_old_logs()

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

DB_PATH = Path(__file__).parent / "county.db"


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS schedules (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            broadcast_date TEXT NOT NULL,
            start_time TEXT NOT NULL,
            duration TEXT NOT NULL,
            periodic_type TEXT DEFAULT 'none',
            periodic_end_date TEXT DEFAULT '',
            periodic_days TEXT DEFAULT '[]',
            preset_id TEXT DEFAULT 'pre_broadcast',
            tags TEXT DEFAULT '[]',
            color_label TEXT DEFAULT '',
            updated_at TEXT DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS presets (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            nodes_json TEXT NOT NULL DEFAULT '[]'
        );

        CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS ntp_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            status TEXT NOT NULL,
            offset_ms REAL DEFAULT 0,
            server_url TEXT DEFAULT '',
            error_msg TEXT DEFAULT ''
        );
    """)
    conn.commit()
    # Migration: add updated_at column for existing databases
    try:
        conn.execute("ALTER TABLE schedules ADD COLUMN updated_at TEXT DEFAULT ''")
        conn.commit()
    except Exception:
        pass  # column already exists
    conn.close()


# ---------------------------------------------------------------------------
# Database Helpers
# ---------------------------------------------------------------------------


def generate_id(prefix='P_'):
    return f"{prefix}{int(time.time() * 1000)}"


def db_get_schedules() -> list:
    """Return all schedules as list of dicts."""
    conn = get_db()
    rows = conn.execute('SELECT * FROM schedules ORDER BY broadcast_date, start_time').fetchall()
    result = []
    for row in rows:
        d = dict(row)
        d['tags'] = json.loads(d.get('tags', '[]'))
        d['periodicDays'] = json.loads(d.get('periodic_days', '[]'))
        result.append(d)
    conn.close()
    return result


def db_get_schedule(id: str) -> dict | None:
    conn = get_db()
    row = conn.execute('SELECT * FROM schedules WHERE id=?', (id,)).fetchone()
    conn.close()
    if row:
        d = dict(row)
        d['tags'] = json.loads(d.get('tags', '[]'))
        d['periodicDays'] = json.loads(d.get('periodic_days', '[]'))
        return d
    return None


def db_upsert_schedule(data: dict) -> dict:
    conn = get_db()
    now = datetime.now(timezone.utc).isoformat()
    tags_json = json.dumps(data.get('tags', []), ensure_ascii=False)
    days_json = json.dumps(data.get('periodicDays', []))
    conn.execute('''INSERT OR REPLACE INTO schedules 
        (id, name, broadcast_date, start_time, duration, periodic_type, 
         periodic_end_date, periodic_days, preset_id, tags, color_label, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)''',
        (data['id'], data['name'], data.get('broadcastDate', ''),
         data.get('startTime', ''), data.get('duration', ''),
         data.get('periodicType', 'none'), data.get('periodicEndDate', ''),
         days_json, data.get('presetId', 'pre_broadcast'),
         tags_json, data.get('colorLabel', ''), now))
    conn.commit()
    conn.close()
    return db_get_schedule(data['id'])


def db_delete_schedule(id: str) -> bool:
    conn = get_db()
    conn.execute('DELETE FROM schedules WHERE id=?', (id,))
    affected = conn.total_changes
    conn.commit()
    conn.close()
    return affected > 0


def db_get_presets() -> list:
    conn = get_db()
    rows = conn.execute('SELECT * FROM presets').fetchall()
    result = [dict(r) for r in rows]
    for r in result:
        r['nodes'] = json.loads(r.pop('nodes_json', '[]'))
    conn.close()
    return result


def db_get_preset(id: str) -> dict | None:
    conn = get_db()
    row = conn.execute('SELECT * FROM presets WHERE id=?', (id,)).fetchone()
    conn.close()
    if row:
        d = dict(row)
        d['nodes'] = json.loads(d.pop('nodes_json', '[]'))
        return d
    return None


def db_upsert_preset(data: dict) -> dict:
    conn = get_db()
    nodes_json = json.dumps(data.get('nodes', []), ensure_ascii=False)
    conn.execute('''INSERT OR REPLACE INTO presets (id, name, nodes_json)
        VALUES (?,?,?)''', (data['id'], data['name'], nodes_json))
    conn.commit()
    conn.close()
    return db_get_preset(data['id'])


def db_delete_preset(id: str) -> bool:
    conn = get_db()
    conn.execute('DELETE FROM presets WHERE id=?', (id,))
    affected = conn.total_changes
    conn.commit()
    conn.close()
    return affected > 0


def db_import_legacy(schedules: list, presets: dict):
    """Import from legacy localStorage dump."""
    for pid, pdata in presets.items():
        db_upsert_preset({
            'id': pid,
            'name': pdata.get('name', ''),
            'nodes': pdata.get('nodes', [])
        })
    for s in schedules:
        db_upsert_schedule(s)


# ---------------------------------------------------------------------------
# Config DB Helpers
# ---------------------------------------------------------------------------


def db_get_all_config() -> dict:
    conn = get_db()
    rows = conn.execute('SELECT key, value FROM config').fetchall()
    config = {row['key']: row['value'] for row in rows}
    conn.close()
    return config


def db_set_config(key: str, value: str):
    conn = get_db()
    conn.execute('INSERT OR REPLACE INTO config (key, value) VALUES (?,?)', (key, str(value)))
    conn.commit()
    conn.close()


def db_set_config_many(pairs: dict):
    conn = get_db()
    for key, value in pairs.items():
        conn.execute('INSERT OR REPLACE INTO config (key, value) VALUES (?,?)', (key, str(value)))
    conn.commit()
    conn.close()


def db_clear_config():
    conn = get_db()
    conn.execute('DELETE FROM config')
    conn.commit()
    conn.close()


def db_get_ntp_logs(limit=50):
    conn = get_db()
    conn.row_factory = sqlite3.Row
    rows = conn.execute('SELECT * FROM ntp_logs ORDER BY id DESC LIMIT ?', (limit,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# NTP Manager
# ---------------------------------------------------------------------------


class NTPManager:
    def __init__(self):
        self.status = 'local'  # 'connected' | 'fallback' | 'local' | 'syncing' | 'error'
        self.offset_ms = 0.0
        self.last_sync_time = None
        self.server_url = 'stdtime.gov.hk'
        self.error_msg = ''

    def sync(self) -> dict:
        """Sync with NTP server using ntplib (UDP 123). Returns status dict."""
        self.status = 'syncing'
        try:
            import ntplib
            client = ntplib.NTPClient()
            response = client.request(self.server_url, version=4, timeout=5)
            self.offset_ms = response.offset * 1000  # seconds → ms
            self.last_sync_time = datetime.now(timezone.utc).isoformat()
            self.status = 'connected'
            self.error_msg = ''
            self._log_sync()
        except ImportError:
            self.error_msg = 'ntplib not installed'
            self.status = 'error' if self.offset_ms == 0 else 'fallback'
        except ntplib.NTPException as e:
            self.error_msg = str(e)
            self.status = 'fallback' if self.offset_ms != 0 else 'error'
        except Exception as e:
            self.error_msg = str(e)
            self.status = 'fallback' if self.offset_ms != 0 else 'error'
        return self.get_status()

    def get_status(self) -> dict:
        return {
            'status': self.status,
            'offset_ms': round(self.offset_ms, 2),
            'server': self.server_url,
            'last_sync': self.last_sync_time or '',
            'error_msg': self.error_msg
        }

    def _log_sync(self):
        try:
            conn = get_db()
            conn.execute(
                "INSERT INTO ntp_logs (timestamp, status, offset_ms, server_url, error_msg) "
                "VALUES (?, ?, ?, ?, ?)",
                (self.last_sync_time or datetime.now(timezone.utc).isoformat(),
                 self.status,
                 self.offset_ms,
                 self.server_url,
                 self.error_msg)
            )
            conn.commit()
            conn.close()
        except Exception:
            pass  # non-critical


# Global NTP manager instance
ntp_manager = NTPManager()

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(title="County Backend", version="0.1")

# CORS — allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static directory
BASE_DIR = Path(__file__).parent
BACKUP_DIR = BASE_DIR / "backups"
static_dir = BASE_DIR / "static"
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


# ---------------------------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------------------------


class ScheduleCreate(BaseModel):
    id: Optional[str] = None
    name: str
    broadcastDate: str
    startTime: str
    duration: str
    periodicType: str = 'none'
    periodicEndDate: str = ''
    periodicDays: list = []
    presetId: str = 'pre_broadcast'
    tags: list = []
    colorLabel: str = ''
    updatedAt: str = ''


class PresetCreate(BaseModel):
    id: Optional[str] = None
    name: str
    nodes: list = []


# ---------------------------------------------------------------------------
# NTP Auto-Sync (background thread)
# ---------------------------------------------------------------------------

NTP_SYNC_INTERVAL = 600  # default seconds between syncs


def _ntp_auto_sync_loop():
    """Background thread: periodically sync NTP and sleep."""
    while True:
        try:
            # Read interval and server URL from config table (allows runtime changes)
            config = db_get_all_config()
            interval = int(config.get('ntpAutoSyncInterval', str(NTP_SYNC_INTERVAL)))
            if interval <= 0:
                interval = NTP_SYNC_INTERVAL  # fallback default
            # Allow server_url to be updated from config at runtime
            config_url = config.get('ntpServerUrl', '')
            if config_url:
                ntp_manager.server_url = config_url
        except Exception:
            interval = NTP_SYNC_INTERVAL
        time.sleep(interval)
        try:
            result = ntp_manager.sync()
            status = result.get('status', 'unknown')
            offset = result.get('offset_ms', 0)
            if status == 'connected':
                log_info(f"🕒 NTP auto-sync: {status} (offset={offset}ms)")
            else:
                log_warn(f"⚠️ NTP auto-sync: {status} — {result.get('error_msg', '')}")
        except Exception as e:
            log_error(f"⚠️ NTP auto-sync error: {e}")



# ---------------------------------------------------------------------------
# Validation Helpers
# ---------------------------------------------------------------------------


def _validate_timecode(tc: str) -> bool:
    """Validate timecode format HH:MM:SS:FF. Hours 0-23, frames 0-24 (PAL 25fps)."""
    import re
    if not re.match(r'^\d{2}:\d{2}:\d{2}:\d{2}$', tc):
        return False
    parts = tc.split(':')
    h, m, s, f = int(parts[0]), int(parts[1]), int(parts[2]), int(parts[3])
    return 0 <= h <= 23 and 0 <= m <= 59 and 0 <= s <= 59 and 0 <= f <= 24

def _tc_to_seconds(tc: str) -> float:
    """Convert HH:MM:SS:FF to total seconds (approximate, 25fps)."""
    parts = tc.split(':')
    h, m, s, f = int(parts[0]), int(parts[1]), int(parts[2]), int(parts[3])
    return h * 3600 + m * 60 + s + f / 25.0


def _normalize_schedule_keys(d: dict) -> dict:
    """Convert camelCase schedule keys to snake_case for internal comparison."""
    mapping = {
        'broadcastDate': 'broadcast_date',
        'startTime': 'start_time',
        'periodicEndDate': 'periodic_end_date',
        'periodicType': 'periodic_type',
        'periodicDays': 'periodic_days',
        'presetId': 'preset_id',
        'colorLabel': 'color_label',
    }
    result = dict(d)
    for camel, snake in mapping.items():
        if camel in result and snake not in result:
            result[snake] = result[camel]
    return result


def _has_time_overlap(a: dict, b: dict) -> bool:
    """Check if two schedule entries overlap in time (same date + overlapping intervals)."""
    a = _normalize_schedule_keys(a)
    b = _normalize_schedule_keys(b)
    if a.get('broadcast_date') != b.get('broadcast_date'):
        return False
    a_start = _tc_to_seconds(a.get('start_time', '00:00:00:00'))
    a_end = a_start + _tc_to_seconds(a.get('duration', '00:00:00:00'))
    b_start = _tc_to_seconds(b.get('start_time', '00:00:00:00'))
    b_end = b_start + _tc_to_seconds(b.get('duration', '00:00:00:00'))
    return a_start < b_end and b_start < a_end


def _find_schedule_conflicts(schedule: dict) -> list:
    """Find existing schedules that overlap with the given schedule (excluding itself)."""
    s = _normalize_schedule_keys(schedule)
    conn = get_db()
    rows = conn.execute(
        'SELECT * FROM schedules WHERE broadcast_date=?',
        (s.get('broadcast_date', ''),)
    ).fetchall()
    conn.close()
    conflicts = []
    for row in rows:
        other = dict(row)
        if other['id'] == s.get('id'):
            continue
        other['tags'] = json.loads(other.get('tags', '[]'))
        other['periodicDays'] = json.loads(other.get('periodic_days', '[]'))
        if _has_time_overlap(s, other):
            conflicts.append({
                'id': other['id'],
                'name': other['name'],
                'startTime': other['start_time'],
                'duration': other.get('duration', '')
            })
    return conflicts

@app.on_event("startup")
def startup():
    init_db()
    # Auto-backup on server start
    os.makedirs(BACKUP_DIR, exist_ok=True)
    today = date.today().isoformat()
    backup_path = os.path.join(BACKUP_DIR, f'county_{today}.json')
    if not os.path.exists(backup_path):
        try:
            data = {
                'version': '0.6',
                'exported_at': datetime.now(timezone.utc).isoformat(),
                'schedules': db_get_schedules(),
                'presets': [{**p, 'nodes_json': json.dumps(p.get('nodes', []))} for p in db_get_presets()],
                'config': db_get_all_config()
            }
            with open(backup_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            log_info(f"📦 Auto-backup saved: {backup_path}")
        except Exception as e:
            log_warn(f"⚠️ Auto-backup failed: {e}")

    # ===== NTP auto-sync on startup =====
    log_info(f"🕒 NTP syncing to {ntp_manager.server_url}...")
    try:
        result = ntp_manager.sync()
        status = result.get('status', 'unknown')
        offset = result.get('offset_ms', 0)
        if status == 'connected':
            log_info(f"✅ NTP synced: offset={offset}ms")
        else:
            log_warn(f"⚠️ NTP initial sync: {status} — {result.get('error_msg', '')}")
    except Exception as e:
        log_error(f"⚠️ NTP initial sync error: {e}")

    # ===== Start background periodic sync thread =====
    thread = threading.Thread(target=_ntp_auto_sync_loop, daemon=True)
    thread.start()
    log_info(f"🔄 NTP auto-sync thread started (interval: {NTP_SYNC_INTERVAL}s)")


INDEX_HTML = BASE_DIR / "templates" / "index.html"


@app.get("/")
async def index():
    from fastapi.responses import Response
    content = INDEX_HTML.read_bytes()
    return Response(content=content, media_type="text/html",
                    headers={"Cache-Control": "no-cache, no-store, must-revalidate",
                             "Pragma": "no-cache", "Expires": "0"})


@app.get("/api/ntp/status")
async def ntp_status():
    return JSONResponse(content=ntp_manager.get_status())


@app.post("/api/ntp/sync")
async def ntp_sync():
    result = ntp_manager.sync()
    return JSONResponse(content=result)


@app.get("/api/health")
async def health():
    return {"status": "ok", "db": str(DB_PATH.exists())}


@app.post("/api/schedule/validate")
async def validate_schedule(data: dict):
    """Validate schedule data completeness and correctness."""
    errors = []
    # Timecode format check
    start_time = data.get('startTime', '')
    duration = data.get('duration', '')
    if not _validate_timecode(start_time):
        errors.append(f"無效的開始時間格式: {start_time}")
    if not _validate_timecode(duration):
        errors.append(f"無效的長度格式: {duration}")
    elif _tc_to_seconds(duration) <= 0:
        errors.append("長度必須大於 0")
    # Date range check
    periodic_type = data.get('periodicType', 'none')
    periodic_end = data.get('periodicEndDate', '')
    broadcast_date = data.get('broadcastDate', '')
    if periodic_type != 'none' and periodic_end:
        if periodic_end < broadcast_date:
            errors.append("週期終止日不能早於開始日")
    # Periodic consistency: custom type needs periodicDays
    if periodic_type == 'custom':
        days = data.get('periodicDays', [])
        if not days or not isinstance(days, list) or len(days) == 0:
            errors.append("自訂週期類型需要至少一個週期日")
    return {"valid": len(errors) == 0, "errors": errors}


@app.post("/api/preset/validate")
async def validate_preset(data: dict):
    """Validate preset data completeness and correctness."""
    errors = []
    # id and name must not be empty
    pid = data.get('id', '')
    name = data.get('name', '')
    if not pid:
        errors.append("Preset ID 不可為空")
    if not name:
        errors.append("Preset name 不可為空")
    # nodes must be an array
    nodes = data.get('nodes')
    if nodes is None:
        errors.append("nodes 必須是陣列")
    elif not isinstance(nodes, list):
        errors.append("nodes 必須是陣列")
    else:
        for i, node in enumerate(nodes):
            if not isinstance(node, dict):
                errors.append(f"節點 {i} 必須是物件")
                continue
            if 'nodeName' not in node or not node.get('nodeName'):
                errors.append(f"節點 {i} 缺少 nodeName")
            if 'offsetType' not in node:
                errors.append(f"節點 {i} 缺少 offsetType")
            if 'offsetSec' not in node:
                errors.append(f"節點 {i} 缺少 offsetSec")
            elif not isinstance(node.get('offsetSec'), (int, float)) or node['offsetSec'] < 0:
                errors.append(f"節點 {i} 的 offsetSec 必須 >= 0")
    return {"valid": len(errors) == 0, "errors": errors}



# ---------------------------------------------------------------------------
# Config CRUD
# ---------------------------------------------------------------------------


@app.get('/api/config')
def get_config():
    """Return all config as a flat JSON object."""
    config = db_get_all_config()
    defaults = {
        'frameRate': '25',
        'timezone': 'Asia/Hong_Kong',
        'beepFreq': '1500',
        'beepDur': '0.5',
        'retentionSeconds': '5',
        'ntpServerUrl': 'stdtime.gov.hk',
        'ntpAutoSyncInterval': '600',
        'ntpLastOffset': '0',
        'ntpLastSyncTime': '',
        'lastSelectedDate': '',
        'clipper_name': 'VPRE',
        'app_version': '0.7',
    }
    for k, v in defaults.items():
        if k not in config:
            config[k] = v
    return config


@app.put('/api/config')
def update_config(data: dict):
    """Update config (partial merge). Accepts flat JSON object."""
    db_set_config_many(data)
    return db_get_all_config()


# ---------------------------------------------------------------------------
# Backup / Restore
# ---------------------------------------------------------------------------


@app.get('/api/backup/download')
def download_backup():
    schedules = db_get_schedules()
    presets = db_get_presets()
    config = db_get_all_config()
    ntp_logs = db_get_ntp_logs()
    backup = {
        'version': '0.6',
        'exported_at': datetime.now(timezone.utc).isoformat(),
        'schedules': schedules,
        'presets': presets,
        'config': config,
        'ntp_logs': ntp_logs
    }
    return JSONResponse(
        content=backup,
        headers={'Content-Disposition': 'attachment; filename="county_backup.json"'}
    )


@app.post('/api/backup/restore')
async def restore_backup(file: UploadFile):
    content = await file.read()
    data = json.loads(content)
    # Clear existing
    conn = get_db()
    conn.execute('DELETE FROM schedules')
    conn.execute('DELETE FROM presets')
    conn.execute('DELETE FROM config')
    conn.commit()
    conn.close()
    # Import
    db_import_legacy(data.get('schedules', []),
                     {p['id']: p for p in data.get('presets', [])})
    if 'config' in data:
        db_set_config_many(data['config'])
    return {'status': 'ok', 'schedules': len(data.get('schedules', [])), 'presets': len(data.get('presets', []))}


# ---------------------------------------------------------------------------
# Schedule CRUD
# ---------------------------------------------------------------------------


@app.get("/api/schedule")
async def list_schedules():
    return db_get_schedules()


@app.get("/api/schedule/{schedule_id}")
async def get_schedule(schedule_id: str):
    s = db_get_schedule(schedule_id)
    if s is None:
        return JSONResponse(status_code=404, content={"error": "not found"})
    return s


@app.post("/api/schedule")
async def create_schedule(data: ScheduleCreate):
    doc = data.model_dump()
    if not doc.get('id'):
        doc['id'] = generate_id('SCH_')
    return db_upsert_schedule(doc)


@app.put("/api/schedule/{schedule_id}")
async def update_schedule(schedule_id: str, data: ScheduleCreate):
    existing = db_get_schedule(schedule_id)
    if existing is None:
        return JSONResponse(status_code=404, content={"error": "not found"})

    # Optimistic locking: check if schedule was modified by another user
    if data.updatedAt:
        stored = existing.get('updated_at', '')
        if stored and data.updatedAt < stored:
            return JSONResponse(status_code=409, content={
                "error": "conflict",
                "message": "此排程已被其他用戶修改，請重新載入頁面",
                "server_updated_at": stored
            })

    doc = data.model_dump()
    doc['id'] = schedule_id
    saved = db_upsert_schedule(doc)

    # Conflict detection: check for overlapping schedules on the same date
    conflicts = _find_schedule_conflicts(doc)
    result = dict(saved)
    if conflicts:
        result['conflicts'] = conflicts
    return result

 
@app.delete("/api/schedule/{schedule_id}")
async def delete_schedule(schedule_id: str):
    if db_delete_schedule(schedule_id):
        return {"deleted": True}
    return JSONResponse(status_code=404, content={"error": "not found"})


# ---------------------------------------------------------------------------
# Preset CRUD
# ---------------------------------------------------------------------------


@app.get("/api/preset")
async def list_presets():
    return db_get_presets()


@app.get("/api/preset/{preset_id}")
async def get_preset(preset_id: str):
    p = db_get_preset(preset_id)
    if p is None:
        return JSONResponse(status_code=404, content={"error": "not found"})
    return p


@app.post("/api/preset")
async def create_preset(data: PresetCreate):
    doc = data.model_dump()
    if not doc.get('id'):
        doc['id'] = generate_id('PRS_')
    return db_upsert_preset(doc)


@app.put("/api/preset/{preset_id}")
async def update_preset(preset_id: str, data: PresetCreate):
    existing = db_get_preset(preset_id)
    if existing is None:
        return JSONResponse(status_code=404, content={"error": "not found"})
    doc = data.model_dump()
    doc['id'] = preset_id
    return db_upsert_preset(doc)


@app.delete("/api/preset/{preset_id}")
async def delete_preset(preset_id: str):
    if db_delete_preset(preset_id):
        return {"deleted": True}
    return JSONResponse(status_code=404, content={"error": "not found"})


# ---------------------------------------------------------------------------
# Import Legacy
# ---------------------------------------------------------------------------


class LegacyImport(BaseModel):
    schedules: list = []
    presets: dict = {}


@app.post("/api/import-legacy")
async def import_legacy(data: LegacyImport):
    db_import_legacy(data.schedules, data.presets)
    return {"imported": True, "schedules": len(data.schedules), "presets": len(data.presets)}


# ---------------------------------------------------------------------------
# Log API
# ---------------------------------------------------------------------------


@app.post("/api/log/client")
async def receive_client_log(request: Request):
    """Receive batch client log entries from the frontend."""
    try:
        data = await request.json()
        entries = data if isinstance(data, list) else data.get('entries', [])
        if not entries:
            return {"status": "ok", "count": 0}
        db_append_client_log(entries)
        return {"status": "ok", "count": len(entries)}
    except Exception as e:
        log_error(f"Failed to receive client logs: {e}")
        return JSONResponse(status_code=400, content={"error": str(e)})


@app.get("/api/log/recent")
async def get_recent_logs(lines: int = Query(100, ge=1, le=500)):
    """Return the last N lines from the server log file."""
    log_file = _current_log_path()
    if not log_file.exists():
        return PlainTextResponse("", media_type="text/plain")
    try:
        with open(log_file, "r", encoding="utf-8") as f:
            all_lines = f.readlines()
        recent = all_lines[-lines:]
        return PlainTextResponse("".join(recent), media_type="text/plain")
    except Exception as e:
        log_error(f"Failed to read log file: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/api/log/file")
async def download_log_file():
    """Download the current server log file."""
    log_file = _current_log_path()
    if not log_file.exists():
        return PlainTextResponse("", media_type="text/plain")
    return FileResponse(
        str(log_file),
        media_type="text/plain",
        filename="county_server.log"
    )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == '__main__':
    log_info(f"🚀 Server running at http://localhost:8000")
    init_db()
    threading.Timer(1.5, lambda: webbrowser.open('http://localhost:8000')).start()
    uvicorn.run(app, host='0.0.0.0', port=8000)
