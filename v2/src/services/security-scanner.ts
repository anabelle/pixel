/**
 * Security Scanner Service
 * 
 * Scans incoming messages for security threats and escalates to owner
 * when thresholds are exceeded.
 */

import { SecurityMatch, SecurityStats, scanForPatterns, TRUSTED_USERS, getCategorySeverity } from './security-patterns';
import { audit } from './audit';

// In-memory store of recent alerts per user
const recentAlerts: Map<string, SecurityMatch[]> = new Map();

// Configuration
const ALERT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const HIGH_SEVERITY_THRESHOLD = 2; // Escalate after 2 HIGH severity
const TOTAL_MATCHES_THRESHOLD = 5; // Escalate after 5 total matches
const MAX_ALERTS_STORED = 1000; // Prevent memory bloat

// Stats tracking
let totalScansWithMatches = 0;
let totalMatchesLogged = 0;

/**
 * Scan a user message for security threats.
 * Returns matches and handles escalation if thresholds exceeded.
 */
export function scanMessage(
  message: string,
  userId: string,
  platform: string
): SecurityMatch[] {
  // Skip trusted users
  if (TRUSTED_USERS.includes(userId)) {
    return [];
  }
  
  // Scan for patterns
  const matches = scanForPatterns(message);
  
  if (matches.length === 0) {
    return [];
  }
  
  // Fill in user/platform info
  for (const match of matches) {
    match.userId = userId;
    match.platform = platform;
  }
  
  totalScansWithMatches++;
  totalMatchesLogged += matches.length;
  
  // Log to audit
  for (const match of matches) {
    audit(
      'security_scan' as any,
      `Security: ${match.category} [${match.severity}] from ${match.userId.slice(0, 16)}`,
      {
        severity: match.severity,
        category: match.category,
        userId: match.userId,
        platform: match.platform,
        matched: match.matched,
        message: message.slice(0, 200),
      }
    );
  }
  
  // Track for escalation
  const escalated = checkEscalation(matches, userId, platform);
  
  if (escalated) {
    console.log(`[security] Escalated alert sent to owner - userId: ${userId.slice(0, 16)}, matches: ${matches.length}`);
  }
  
  return matches;
}

/**
 * Check if escalation thresholds are exceeded.
 * Returns true if escalation was triggered.
 */
function checkEscalation(
  newMatches: SecurityMatch[], 
  userId: string,
  platform: string
): boolean {
  const now = Date.now();
  
  // Get existing alerts for this user
  let userAlerts = recentAlerts.get(userId) || [];
  
  // Filter to recent only
  userAlerts = userAlerts.filter(m => now - m.timestamp < ALERT_WINDOW_MS);
  
  // Add new matches
  userAlerts.push(...newMatches);
  recentAlerts.set(userId, userAlerts);
  
  // Count severities
  const highSeverity = userAlerts.filter(m => m.severity === 'HIGH').length;
  const totalMatches = userAlerts.length;
  
  // Check thresholds
  const shouldEscalate = 
    highSeverity >= HIGH_SEVERITY_THRESHOLD || 
    totalMatches >= TOTAL_MATCHES_THRESHOLD;
  
  if (shouldEscalate) {
    escalateToOwner(userAlerts, userId, platform);
    // Clear to prevent duplicate alerts
    recentAlerts.delete(userId);
    return true;
  }
  
  return false;
}

/**
 * Escalate alerts to owner via syntropy_notify.
 */
async function escalateToOwner(
  matches: SecurityMatch[], 
  userId: string,
  platform: string
): Promise<void> {
  const categories = [...new Set(matches.map(m => m.category))];
  const severities = [...new Set(matches.map(m => m.severity))];
  const highCount = matches.filter(m => m.severity === 'HIGH').length;
  
  const latestMatch = matches[matches.length - 1];
  
  // Build alert message
  const message = `⚠️ SECURITY ALERT

User: ${userId.slice(0, 24)}${userId.length > 24 ? '...' : ''}
Platform: ${platform}
Categories: ${categories.join(', ')}
Severity: ${severities.join(', ')}
Attempts: ${matches.length} in 1h (${highCount} HIGH)

Latest match [${latestMatch.category}]:
"${latestMatch.matched.slice(0, 100)}"

Raw message preview:
"${latestMatch.rawMessage.slice(0, 200)}"`;

  // Write to syntropy mailbox for owner notification
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const mailboxPath = path.join(process.cwd(), 'data', 'syntropy-mailbox.jsonl');
    const entry = JSON.stringify({
      ts: Date.now(),
      type: 'security_alert',
      severity: highCount > 0 ? 'HIGH' : 'MEDIUM',
      userId,
      platform,
      categories,
      summary: message,
    }) + '\n';
    
    await fs.appendFile(mailboxPath, entry);
    
    console.log(`[security] Alert written to mailbox - userId: ${userId.slice(0, 16)}, categories: ${categories.join(', ')}`);
  } catch (error) {
    console.error('[security] Failed to write alert to mailbox:', error);
  }
}

/**
 * Prune old alerts from memory.
 * Call periodically (e.g., on heartbeat).
 */
export function pruneOldAlerts(): void {
  const now = Date.now();
  let pruned = 0;
  
  for (const [userId, alerts] of recentAlerts.entries()) {
    const recent = alerts.filter(m => now - m.timestamp < ALERT_WINDOW_MS);
    
    if (recent.length === 0) {
      recentAlerts.delete(userId);
      pruned++;
    } else if (recent.length < alerts.length) {
      recentAlerts.set(userId, recent);
    }
  }
  
  // Also enforce max size
  if (recentAlerts.size > MAX_ALERTS_STORED) {
    // Remove oldest entries
    const entries = [...recentAlerts.entries()]
      .sort((a, b) => {
        const aOldest = Math.min(...a[1].map(m => m.timestamp));
        const bOldest = Math.min(...b[1].map(m => m.timestamp));
        return aOldest - bOldest;
      });
    
    const toRemove = entries.slice(0, recentAlerts.size - MAX_ALERTS_STORED);
    for (const [userId] of toRemove) {
      recentAlerts.delete(userId);
      pruned++;
    }
  }
  
  if (pruned > 0) {
    console.log(`[security] Pruned old alerts - pruned: ${pruned}, remaining: ${recentAlerts.size}`);
  }
}

/**
 * Get security statistics.
 */
export function getSecurityStats(): SecurityStats {
  const now = Date.now();
  let highSeverity = 0;
  let mediumSeverity = 0;
  let lowSeverity = 0;
  const byCategory: Record<string, number> = {};
  const uniqueUsers = new Set<string>();
  
  for (const alerts of recentAlerts.values()) {
    for (const alert of alerts) {
      if (now - alert.timestamp < ALERT_WINDOW_MS) {
        uniqueUsers.add(alert.userId);
        
        switch (alert.severity) {
          case 'HIGH': highSeverity++; break;
          case 'MEDIUM': mediumSeverity++; break;
          case 'LOW': lowSeverity++; break;
        }
        
        byCategory[alert.category] = (byCategory[alert.category] || 0) + 1;
      }
    }
  }
  
  return {
    totalAlerts: highSeverity + mediumSeverity + lowSeverity,
    highSeverity,
    mediumSeverity,
    lowSeverity,
    byCategory,
    uniqueUsers: uniqueUsers.size,
  };
}

/**
 * Get recent alerts for dashboard.
 */
export function getRecentAlerts(limit: number = 50): SecurityMatch[] {
  const now = Date.now();
  const allAlerts: SecurityMatch[] = [];
  
  for (const alerts of recentAlerts.values()) {
    for (const alert of alerts) {
      if (now - alert.timestamp < ALERT_WINDOW_MS) {
        allAlerts.push(alert);
      }
    }
  }
  
  return allAlerts
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

/**
 * Get all unique categories.
 */
export function getCategories(): string[] {
  return [
    'injection',
    'jailbreak', 
    'delimiter',
    'roleOverride',
    'extraction',
    'abuse',
    'spam',
    'commandInjection',
  ];
}
