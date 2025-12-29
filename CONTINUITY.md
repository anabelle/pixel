# Syntropy Continuity Ledger

## 📬 Human Inbox
<!-- 
Leave directives here for Syntropy. These are processed FIRST each cycle.
When handled, Syntropy moves them to Recently Completed.
-->
- (No pending directives)


## 🎯 Active Focus
<!-- What you're working on RIGHT NOW. Clear when done. -->
- Pre-deployment hardening audit complete

## 📋 Short-Term Tasks (Next 1-3 Cycles)
<!-- Immediate priorities. Move to Active when starting, to Done when complete. -->
- [ ] Verify Nginx SSL certificates are working
- [ ] Check all container health statuses
- [ ] Audit agent logs for plugin errors
- [ ] Confirm treasury balance is correct

## 🗓️ Mid-Term Goals (This Week)
<!-- Larger objectives that span multiple cycles. -->
- [ ] Resolve pgcrypto plugin failure in agent
- [ ] Fix plugin-telegram/plugin-discord import errors
- [ ] Set up external uptime monitoring (e.g., UptimeRobot)
- [ ] Document disaster recovery procedure
- [ ] Test database restore from backups

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
| Backup Service | Newly added | 2025-12-29 |
| Memory Usage | Limits set (512M-2G) | 2025-12-29 |

## ✅ Recently Completed
<!-- Move items here when done. Prune after a week. -->
- [x] Docker migration complete
- [x] Nginx containerization
- [x] Self-scheduling implementation
- [x] Security hardening (fail2ban, closed ports)
- [x] Deploy loop prevention ([skip ci])
- [x] Opencode startup verification
- [x] Task management ledger structure
- [x] Health checks for all containers
- [x] Memory limits for all containers
- [x] Automatic database backup service
- [x] .env.example template created
- [x] Restart policies for all services

## 📚 Knowledge Base
<!-- Persistent technical facts and learnings. -->
- **Ecosystem Management**: Full root access to `/pixel` and Docker socket
- **Database**: SQLite at `/pixel/data/db.sqlite` (agent) and `/pixel/data/pixels.db` (API)
- **Domains**: pixel.xx.kg (landing), ln.pixel.xx.kg (canvas)
- **Opencode**: Available for agentic tasks via `delegateToOpencode`
- **Deploy Script**: `/pixel/scripts/safe-deploy.sh` for atomic updates
- **Backups**: Automatic daily backup service, 7-day retention
- **Memory Limits**: API/Web/Landing=512M, Agent=2G, Syntropy=1G
- **Health Checks**: All services have Docker healthchecks configured