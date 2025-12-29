# Syntropy Continuity Ledger

## 🎯 Active Focus
<!-- What you're working on RIGHT NOW. Clear when done. -->
- First startup on new VPS - verify all systems operational

## 📋 Short-Term Tasks (Next 1-3 Cycles)
<!-- Immediate priorities. Move to Active when starting, to Done when complete. -->
- [ ] Verify Nginx SSL certificates are working
- [ ] Check all container health statuses
- [ ] Audit agent logs for plugin errors
- [ ] Confirm treasury balance is correct

## 🗓️ Mid-Term Goals (This Week)
<!-- Larger objectives that span multiple cycles. -->

## 🌟 Long-Term Vision (Ongoing Strategic)
<!-- High-level direction. Rarely changes. -->
- Transition ecosystem from "Survivor" to "Architect" phase
- Achieve 99.9% uptime through proactive monitoring
- Develop self-healing capabilities for common failures
- Expand Pixel's social reach across platforms

## 🔄 Ongoing Monitoring
<!-- Things to check every cycle. Never "done", just tracked. -->
| Item | Last Status | Last Checked |
|------|-------------|--------------|
| Treasury Balance | 79,014 sats | 2025-12-29 |
| Container Health | All Up | 2025-12-29 |
| Agent Errors | Plugin failures detected | 2025-12-29 |
| SSL Expiry | Not yet configured | - |

## ✅ Recently Completed
<!-- Move items here when done. Prune after a week. -->
- [x] Docker migration complete
- [x] Nginx containerization
- [x] Self-scheduling implementation
- [x] Security hardening (fail2ban, closed ports)

## 📚 Knowledge Base
<!-- Persistent technical facts and learnings. -->
- **Ecosystem Management**: Full root access to `/pixel` and Docker socket
- **Database**: SQLite at `/pixel/data/db.sqlite` (agent) and `/pixel/data/pixels.db` (API)
- **Domains**: pixel.xx.kg (landing), ln.pixel.xx.kg (canvas)
- **Opencode**: Available for agentic tasks via `delegateToOpencode`
- **Deploy Script**: `/pixel/scripts/safe-deploy.sh` for atomic updates