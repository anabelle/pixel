/**
 * Security pattern definitions for detecting prompt injection, abuse, and spam.
 * Used by security-scanner.ts to scan incoming messages.
 */

export type Severity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface SecurityPattern {
  category: string;
  patterns: RegExp[];
  severity: Severity;
  description: string;
}

export interface SecurityMatch {
  category: string;
  pattern: string;
  severity: Severity;
  matched: string;
  timestamp: number;
  userId: string;
  platform: string;
  rawMessage: string;
}

export interface SecurityStats {
  totalAlerts: number;
  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;
  byCategory: Record<string, number>;
  uniqueUsers: number;
}

// Trusted users who won't trigger alerts
export const TRUSTED_USERS = [
  'syntropy-admin',
  'syntropy',
  'pixel-self',
];

/**
 * All security patterns organized by category.
 */
export const SECURITY_PATTERNS: SecurityPattern[] = [
  // HIGH - Prompt injection attempts
  {
    category: 'injection',
    severity: 'HIGH',
    description: 'Prompt injection attempt',
    patterns: [
      /ignore\s+(all|previous|above|prior|everything)/i,
      /forget\s+(all|everything|prior|previous)/i,
      /disregard\s+(all|previous|any|above)/i,
      /new\s+(instruction|directive|rule)s?\s*(now|below)/i,
      /override\s+(previous|default|system|all)/i,
      /bypass\s+(all|any|system)/i,
      /skip\s+(all|any|rules|restrictions)/i,
    ],
  },
  
  // HIGH - Jailbreak attempts
  {
    category: 'jailbreak',
    severity: 'HIGH',
    description: 'Jailbreak attempt',
    patterns: [
      /\bDAN\b/i,
      /do\s+anything\s+now/i,
      /developer\s+mode/i,
      /simulation\s+mode/i,
      /unrestricted\s+mode/i,
      /god\s+mode/i,
      /admin\s+mode/i,
      /root\s+mode/i,
      /you\s+are\s+unlimited/i,
      /no\s+(rules|restrictions|limits)/i,
    ],
  },
  
  // HIGH - Delimiter injection
  {
    category: 'delimiter',
    severity: 'HIGH',
    description: 'Delimiter injection attempt',
    patterns: [
      /\[\[system\]\]/i,
      /\[\[.*instruction.*\]\]/i,
      /<\|system\|>/i,
      /<\|.*prompt.*\|>/i,
      /###SYSTEM###/i,
      /---SYSTEM---/i,
      /<<<.*>>>/,
      /\[SYSTEM\]/i,
      /\{SYSTEM\}/i,
    ],
  },
  
  // MEDIUM - Role manipulation
  {
    category: 'roleOverride',
    severity: 'MEDIUM',
    description: 'Role manipulation attempt',
    patterns: [
      /you\s+are\s+now\s+(a|an|the)/i,
      /act\s+as\s+(if|a|an|though)/i,
      /pretend\s+(to\s+be|you\s+are)/i,
      /roleplay\s+as/i,
      /simulate\s+being/i,
      /from\s+now\s+on\s+you\s+are/i,
      /your\s+new\s+role\s+is/i,
      /adopt\s+the\s+(persona|character)/i,
    ],
  },
  
  // MEDIUM - Extraction attempts
  {
    category: 'extraction',
    severity: 'MEDIUM',
    description: 'Prompt extraction attempt',
    patterns: [
      /show\s+(me\s+)?(your\s+)?(system\s+)?(prompt|instruction)s?/i,
      /print\s+(your\s+)?(character|system|full|complete)\s+(prompt|config)/i,
      /repeat\s+(the\s+)?(above|previous|initial)/i,
      /what\s+(were|are)\s+you\s+(told|instructed|programmed)/i,
      /reveal\s+(your|the)\s+(system|prompt|instruction)/i,
      /output\s+(your|the)\s+(system|prompt)/i,
      /display\s+(your|the)\s+(system|prompt)/i,
      /tell\s+me\s+(your|the)\s+(system|prompt)/i,
    ],
  },
  
  // LOW - Abuse (profanity, slurs)
  {
    category: 'abuse',
    severity: 'LOW',
    description: 'Abusive language detected',
    patterns: [
      /\bn[i1]gg[e3]r\s*/i,
      /\bn[i1]gg[a4]\s*/i,
      /\bf[a4]g[g]?[o0]t\s*/i,
      /\bk[i1]k[e3]\s*/i,
      /\bsp[i1]c\s*/i,
      /\bch[i1]nk\s*/i,
      /\br[e3]t[a4]rd\s*/i,
    ],
  },
  
  // LOW - Spam
  {
    category: 'spam',
    severity: 'LOW',
    description: 'Spam content detected',
    patterns: [
      /free\s+bitcoin/i,
      /free\s+crypto/i,
      /crypto\s+giveaway/i,
      /bitcoin\s+giveaway/i,
      /click\s+here\s+(now|immediately)/i,
      /you\s+(have\s+)?won\s+\$/i,
      /congratulations\s+(winner|user|recipient)/i,
      /claim\s+your\s+(prize|reward|bitcoin)/i,
      /limited\s+time\s+offer/i,
      /act\s+now\s+(before|while)/i,
    ],
  },
  
  // HIGH - Command injection (dangerous commands)
  {
    category: 'commandInjection',
    severity: 'HIGH',
    description: 'Command injection attempt',
    patterns: [
      /;\s*sudo\s+/i,
      /\|\s*sudo\s+/i,
      /&&\s*sudo\s+/i,
      /rm\s+-rf\s*\//i,
      /rm\s+-rf\s+~/i,
      /curl\s+\S+\s*\|/i,
      /wget\s+\S+\s*\|/i,
      /eval\s*\(/i,
      /exec\s*\(/i,
      /\$\([^)]+\)/, // $(command) substitution
      /`[^`]+`/, // `command` substitution
    ],
  },
];

/**
 * Scan a message for security patterns.
 */
export function scanForPatterns(message: string): SecurityMatch[] {
  const matches: SecurityMatch[] = [];
  
  for (const { category, patterns, severity } of SECURITY_PATTERNS) {
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        matches.push({
          category,
          pattern: pattern.source,
          severity,
          matched: match[0],
          timestamp: Date.now(),
          userId: '', // Will be filled by caller
          platform: '', // Will be filled by caller
          rawMessage: message.slice(0, 500),
        });
      }
    }
  }
  
  return matches;
}

/**
 * Get severity for a category.
 */
export function getCategorySeverity(category: string): Severity {
  const pattern = SECURITY_PATTERNS.find(p => p.category === category);
  return pattern?.severity || 'LOW';
}
