# Pixel Ecosystem — Continuity State
> Last updated: 2026-01-02T14:54Z

## 📬 Pending Tasks (Human Inbox)

### 1. Pixel Diary Integration
Create a wrapper for Syntropy to read/write the diary at `pixel-agent/docs/diary/`.
- **Status**: Not started (previous worker ghost — spawn fresh)

### 2. Twitter Integration  
Credentials in `.env`. Safely re-enable Twitter plugin with circuit-breaker safeguards.
- **Status**: Not started (credentials ready)

---

## ✅ System Status

| Service | Status |
|---------|--------|
| api | ✅ healthy (9,041 pixels loaded) |
| web | ✅ healthy |
| landing | ✅ healthy |
| agent | ✅ healthy |
| postgres | ✅ healthy |
| nginx | ✅ healthy |
| syntropy | ✅ running |
| vps-monitor | ✅ healthy |

**Treasury**: 79,014 sats

---

## 🔧 Recent Fixes (2026-01-02)

- ✅ Fixed `pixels.db` empty bug — API now loads 9,041 pixels correctly
- ✅ Silenced nginx notice-level logs
- ✅ Implemented VPS metrics collector (v2.0)
- ✅ Worker volume mounts fixed (`HOST_PIXEL_ROOT`)
- ✅ PostgreSQL migration complete
- ✅ Removed Opencode from Syntropy (direct approach now)

---

## 📋 Refactor Queue

32 tasks total (1 completed, 31 ready)  
**Next**: T002 - Create Scripts Directory Structure

See `REFACTOR_QUEUE.md` for full list.

---

## ⚠️ Known Issues

- **VPS Swap**: 98% used — monitor for memory pressure
- **VPS Disk**: 82% used — consider `docker system prune`

---

## 🧭 Architecture Notes

- **Brain/Hands**: Syntropy spawns ephemeral workers for code tasks
- **Database**: Agent uses external PostgreSQL (not embedded PGLite)
- **Runtime**: Bun + ElizaOS CLI v1.7.0
