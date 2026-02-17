type UnsafeCheckOptions = {
  blockVideo?: boolean;
};

const BLOCKED_HASHTAGS = new Set([
  "nsfw",
  "porn",
  "porno",
  "pornography",
  "sex",
  "sexy",
  "xxx",
  "xrated",
  "x-rated",
  "hentai",
  "fetish",
  "nude",
  "nudes",
  "naked",
  "onlyfans",
  "bdsm",
  "religion",
  "jew",
  "jews",
  "jewish",
  "islam",
  "muslim",
  "christian",
  "catholic",
  "fuck",
  "fucking",
  "ass",
  "asshole",
  "tit",
  "tits",
  "boobs",
  "breasts",
  "cock",
  "dick",
  "penis",
  "pussy",
  "vagina",
  "cum",
  "cumshot",
  "blowjob",
  "handjob",
  "anal",
  "oral",
  "threesome",
  "orgy",
  "masturbat",
  "erotic",
  "horny",
  "slut",
  "whore",
  "bitch",
  "milf",
  "dilf",
  "incest",
  "rape",
]);

const EXPLICIT_TERMS = [
  "nsfw",
  "porn",
  "porno",
  "pornography",
  "sex",
  "sexual",
  "xxx",
  "x-rated",
  "hentai",
  "fetish",
  "nude",
  "nudes",
  "naked",
  "onlyfans",
  "bdsm",
  "blowjob",
  "handjob",
  "threesome",
  "orgy",
  "anal",
  "oral",
  "pussy",
  "dick",
  "cock",
  "tits",
  "boobs",
  "cum",
  "masturbat",
  "erotic",
  "horny",
  "slut",
  "whore",
  "milf",
  "dilf",
  "incest",
  "rape",
  "faith based porn",
  "religious porn",
  "fuck",
  "fucking",
];

const HATE_TERMS = [
  "kike",
  "nigger",
  "faggot",
  "tranny",
  "spic",
  "chink",
  "wetback",
  "raghead",
  "holocaust",
  "hitler",
  "nazi",
  "white power",
  "white supremacy",
];

const GROUP_TARGETING_TERMS = [
  "jew",
  "jews",
  "jewish",
  "islam",
  "muslim",
  "christian",
  "catholic",
  "hindu",
  "black",
  "white",
  "asian",
  "arab",
  "mexican",
  "latino",
  "latina",
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function termRegex(term: string): RegExp {
  const escaped = escapeRegExp(term);
  return new RegExp(`\\b${escaped}\\b`, "i");
}

function extractHashtags(content: string): string[] {
  const matches = content.match(/#([a-z0-9_\-]+)/gi) ?? [];
  return matches.map((m) => m.slice(1).toLowerCase());
}

function extractTagList(tags?: string[][]): string[] {
  if (!tags || tags.length === 0) return [];
  return tags
    .filter((t) => t[0] === "t" && t[1])
    .map((t) => t[1].toLowerCase());
}

function hasContentWarningTag(tags?: string[][]): string | null {
  if (!tags) return null;
  for (const tag of tags) {
    if (tag[0] === "content-warning" || tag[0] === "cw") {
      const detail = tag[1] ? String(tag[1]).trim() : "";
      return detail ? `content-warning:${detail}` : "content-warning";
    }
  }
  return null;
}

function hasVideoContent(content: string, tags?: string[][]): boolean {
  const videoRegex = /(https?:\/\/[^\s]+\.(mp4|mov|webm|m4v|avi|mkv|gifv))(\?[^\s]+)?/i;
  if (videoRegex.test(content)) return true;
  if (!tags) return false;
  for (const tag of tags) {
    if (tag[0] !== "imeta") continue;
    const joined = tag.join(" ");
    if (videoRegex.test(joined)) return true;
  }
  return false;
}

function containsAny(text: string, terms: string[]): string | null {
  for (const term of terms) {
    if (termRegex(term).test(text)) return term;
  }
  return null;
}

export function getUnsafeReason(
  content: string,
  tags?: string[][],
  options: UnsafeCheckOptions = {}
): string | null {
  const text = (content ?? "").toLowerCase();
  const warningTag = hasContentWarningTag(tags);
  if (warningTag) return warningTag;

  const tagList = extractTagList(tags);
  const hashtags = [...new Set([...extractHashtags(text), ...tagList])];
  for (const tag of hashtags) {
    if (BLOCKED_HASHTAGS.has(tag)) return `blocked hashtag #${tag}`;
  }

  // Check for group-targeting hashtag combinations
  const groupTags = hashtags.filter((t) => GROUP_TARGETING_TERMS.includes(t));
  const explicitTags = hashtags.filter((t) => 
    BLOCKED_HASHTAGS.has(t) || EXPLICIT_TERMS.some((e) => t.includes(e))
  );
  if (groupTags.length >= 2 && explicitTags.length >= 1) {
    return `group-targeting hashtags: ${groupTags.slice(0, 3).join(", ")}`;
  }

  const hateHit = containsAny(text, HATE_TERMS);
  if (hateHit) return `blocked slur: ${hateHit}`;

  const explicitHit = containsAny(text, EXPLICIT_TERMS);
  if (explicitHit) return `explicit keyword: ${explicitHit}`;

  const hasExplicit = containsAny(text, EXPLICIT_TERMS) !== null;
  const hasGroup = containsAny(text, GROUP_TARGETING_TERMS) !== null;
  if (hasExplicit && hasGroup) return "explicit content with group targeting";

  if (options.blockVideo && hasVideoContent(text, tags)) {
    return "video content blocked";
  }

  return null;
}
