#!/usr/bin/env node
/**
 * Patch Baileys v6 LID bug for group messaging.
 *
 * Bug: In relayMessage(), `isLid` is derived from the destination JID's server.
 * For groups (@g.us), isLid === false. But group participants use @lid format
 * (LID = Linked Identity). So LID user numbers get encoded as @s.whatsapp.net
 * which is invalid, causing "No sessions" errors from assertSessions().
 *
 * Fix: For the two jidEncode calls in the group branch (lines 324, 334),
 * check per-user whether their number matches a LID participant from
 * groupMetadata. Uses `groupData` (not `participantsList` which is block-scoped
 * inside `if (!participant)` and not accessible at the patch sites).
 *
 * Line 380 is in the 1:1 message branch and doesn't need patching.
 *
 * Idempotent: checks for PIXEL_LID_PATCH marker before applying.
 */

const fs = require("fs");

const TARGET = "/app/node_modules/@whiskeysockets/baileys/lib/Socket/messages-send.js";
const MARKER = "PIXEL_LID_PATCH";

if (!fs.existsSync(TARGET)) {
  console.log("[patch-baileys] Target file not found:", TARGET);
  process.exit(0);
}

let code = fs.readFileSync(TARGET, "utf8");

if (code.includes(MARKER)) {
  console.log("[patch-baileys] Already patched (marker found). Skipping.");
  process.exit(0);
}

// Helper to compute the per-user domain in the group branch.
// `groupData` is in scope at both patch sites — it has .participants[] with .id
// like "224343506325521@lid" or "573001234567@s.whatsapp.net".
// `d.user` / `user` is just the numeric part (e.g. "224343506325521").
// If that number matches a participant whose JID ends with @lid, use 'lid'.
const LID_DETECT_FN = `(function _lidDomain(u, gd) { /* ${MARKER} */ if (!gd || !gd.participants) return 's.whatsapp.net'; for (var i = 0; i < gd.participants.length; i++) { var pid = gd.participants[i].id; if (pid.replace(/@.*/, '') === u && pid.indexOf('@lid') !== -1) return 'lid'; } return 's.whatsapp.net'; })`;

// ---- Patch site 1: line 324 ----
// Original:
//   devices.map(d => (0, WABinary_1.jidEncode)(d.user, isLid ? 'lid' : 's.whatsapp.net', d.device))
// Patched: use groupData (in scope) instead of participantsList (block-scoped)

const site1_old = "devices.map(d => (0, WABinary_1.jidEncode)(d.user, isLid ? 'lid' : 's.whatsapp.net', d.device))";
const site1_new = `devices.map(d => (0, WABinary_1.jidEncode)(d.user, isLid ? 'lid' : ${LID_DETECT_FN}(d.user, groupData), d.device))`;

// ---- Patch site 2: line 334 ----
// Inside for (const { user, device } of devices) loop in the group branch
// Original:
//   const jid = (0, WABinary_1.jidEncode)(user, isLid ? 'lid' : 's.whatsapp.net', device);
// This exact string also appears at line 380 (1:1 branch). Replace ONLY the
// first occurrence (group branch comes before 1:1 branch in the code).

const site2_old = "const jid = (0, WABinary_1.jidEncode)(user, isLid ? 'lid' : 's.whatsapp.net', device);";
const site2_new = `const jid = (0, WABinary_1.jidEncode)(user, isLid ? 'lid' : ${LID_DETECT_FN}(user, groupData), device);`;

let patchCount = 0;

// Apply patch site 1
if (code.includes(site1_old)) {
  code = code.replace(site1_old, site1_new);
  patchCount++;
  console.log("[patch-baileys] Patched site 1 (patchMessageBeforeSending devices.map)");
} else {
  console.log("[patch-baileys] WARNING: Site 1 pattern not found — may already be partially patched or Baileys version changed");
}

// Apply patch site 2 — only first occurrence (group branch)
if (code.includes(site2_old)) {
  const idx = code.indexOf(site2_old);
  code = code.substring(0, idx) + site2_new + code.substring(idx + site2_old.length);
  patchCount++;
  console.log("[patch-baileys] Patched site 2 (senderKeyJids jidEncode in group loop)");
} else {
  console.log("[patch-baileys] WARNING: Site 2 pattern not found — may already be partially patched or Baileys version changed");
}

if (patchCount > 0) {
  fs.writeFileSync(TARGET, code, "utf8");
  console.log(`[patch-baileys] Successfully applied ${patchCount}/2 patches.`);
} else {
  console.log("[patch-baileys] No patches applied. Check Baileys version compatibility.");
  process.exit(1);
}
