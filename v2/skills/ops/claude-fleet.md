---
name: claude-fleet
description: Use Claude Code through Herdr with shared quota and coordination.
---
# Shared Claude fleet — Jorge authorized, verified 2026-10-04 Bogota

Marvin remains Hermes. Pixel remains pi-core. Developero remains OpenCode. Claude Code is a delegated worker, not a replacement identity/provider. Jorge authorized all three to use it for worthwhile bounded work. Both Claude installations use ONE subscription. There is no separate allowance per sibling or machine.

## Pixel (inside v2 container)

Door: python3 /app/data/claude-fleet/client.py ACTION

Actions: status, read, quota, task --brief FILE --timeout 120, resolve --ack EXACT_ID.
Write bounded briefs ONLY under /app/data/claude-fleet/briefs/. The wrapper mounts that file read-only into an ephemeral network-disabled helper container using an already-present image. It shares the exact host worker socket and state directory with the native bridge. It does NOT restart Pixel or Claude, copy SSH/API credentials, or bypass native permission dialogs. Do not issue docker/herdr commands to unrelated panes. If the pinned image is removed or socket/binding changes, report; do not silently fall back. Ask Developero/Marvin to revalidate.

## Developero (VPS native shell)

Door: python3 /home/pixel/.local/lib/marvin-claude-fleet/claude_fleet.py ACTION --root /home/pixel/.local/lib/marvin-claude-fleet

Use native VPS paths for brief FILE. No --target needed: configured local worker here IS claude-fleet-vps. Do not target Jorge's other Claude pane. Native binding requires exact name+session.

## Workflow / acceptance

1. Read this runbook. Inspect status and read; no dispatch while Jorge is using the worker, it is busy/blocked, or pending exists.
2. quota is native /usage, not a Claude model turn. task checks it again. Reserve20% in BOTH session and week; >=80% means no new autonomous task. Missing/stale/ambiguous usage or credits not explicitly OFF means stop. 60–79% compact high-value only. Never enable credits, API fallback, top-ups or alter model/permission settings. Current worker model was selected by Jorge.
3. Brief: exact HOST project/artifact paths (Claude cwd /home/pixel), goal, allowed edits, acceptance/tests, forbidden side effects. Keep <=20000 chars. Never send secrets/full transcripts/SOUL. Use scripts for mechanical work; Claude for difficult implementation/debugging or genuine independent review, not gratuitous conversation.
4. task waits1–240s; timeout does NOT cancel. Coordinator state remains pending and blocks all other fleet clients. NEVER blindly resend or delete/corrupt/replace pending to unblock. Read exact worker and inspect artifacts; inspect journal/error task ID+stage. Uncertain dispatch requires review even when worker becomes idle.
5. Returned/idle is NOT success. Independently read artifacts/run tests. Only then resolve --ack EXACT_ID for the matching worker/session. Resolution is idempotent; journal archive precedes durable pending removal. Never acknowledge someone else's task merely to free a slot.
6. Report result to requesting sibling/human. Permission prompt -> ask Jorge about the exact request; no automatic approval loop. Do not restart/rebind/upgrade other agents without authorization.

## Shared authority / limits

Single state root on VPS: /home/pixel/.local/state/marvin-claude-fleet; worker.lock + pending.json + ID journals + quota evidence. Marvin local AND VPS targets use this SAME authority over strict SSH, held flock and state operations on one connection. VPS/Pixel native helpers use same inode/root. Busy lease fails immediately. JSON writes replace atomically after file fsync, then fsync directory. A failed archive/unlink keeps recoverable pending. No shared public TCP endpoint/credential copies.

This lock coordinates cooperating bridge clients, NOT the entire subscription, direct manual Claude use or arbitrary separate clients. Pending blocks another task if a prompt response/SSH connection becomes uncertain. There is still a narrow distributed failure window around dispatch; no automatic replay/failover. No claim of physical blackout, cold reboot or automatic supervisory completion notifications tested. Native worker session disappearance fails closed; explicit verified rebind needed.

## Verified evidence

20 tests pass local+VPS (six originals preserved). Real SSH owner versus native VPS contender rejected. Shared fixture survived disconnect/reconnect. Real task sent from Pixel container door created /home/pixel/.cache/marvin-fleet-proof/shared-coordinator-20261004.json, marker SHARED_COORDINATOR_PIXEL_DOOR_OK; independent SSH readback verified. Its shared pending blocked Marvin LOCAL task before submission, then exact VPS acknowledgment archived and cleared it. Pixel status/quota door also exercised. These proofs do not establish coding quality or unlimited concurrency.
