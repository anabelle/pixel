import { afterAll, afterEach, beforeAll, describe, expect, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import * as registry from "./server-registry.js";
import { executeNIWABroker, parseNIWARequest, tokenizeNIWAWP, validateNIWARequest, type NIWARequest } from "./niwa-broker.js";

const owner = "tg-892935151";
const entry: registry.ServerEntry = {
  label: "NIWA", transport: "niwa-broker-v1", host: "172.18.0.1", user: "pixel", port: 22,
  key_env: "UNUSED_NIWA_TEST_KEY", key_file: "/app/data/keys/niwa-broker_ed25519",
  known_hosts_file: "/app/data/keys/niwa-broker_known_hosts", wp_path: "/home/eightser/public_html/niwa_20261007",
  capabilities: ["wp"], authorized_users: [owner, "developero"], authorized_groups: [], blocked_patterns: [],
};
const fixture = JSON.stringify({
  global_admins: [owner, "developero", "syntropy-admin", "syntropy", "pixel-self"],
  tool_tiers: { public: [], server_admin: ["ssh", "wp"] },
  servers: { ambienteniwa: entry, other: { ...entry, authorized_users: ["other-admin"] } },
});
let readConfig: ReturnType<typeof spyOn>;
beforeAll(() => {
  readConfig = spyOn(fs, "readFileSync").mockImplementation((() => fixture) as unknown as typeof fs.readFileSync);
  try { registry.resolveServer("ambienteniwa"); } finally { readConfig.mockRestore(); }
});
afterAll(() => { readConfig.mockRestore(); });
afterEach(() => { spawn?.mockRestore(); });
let spawn: ReturnType<typeof spyOn> | undefined;
// Each test installs a subprocess mock: no real SSH, files, or credentials are used.
function mockSpawn() {
  spawn = spyOn(Bun, "spawn").mockImplementation((() => ({
    stdout: new Blob([JSON.stringify({ ok: true, result: null, receipt: "a".repeat(32) })]).stream(), stderr: new Blob([]).stream(),
    exited: Promise.resolve(0), kill: () => {},
  })) as unknown as typeof Bun.spawn);
  return spawn;
}

describe("NIWA authentication and fixed transport", () => {
  test("explicit owners allowed; global, unrelated-server and public users denied", async () => {
    const mock = mockSpawn();
    expect(registry.isGlobalAdmin("syntropy-admin")).toBe(true);
    expect(registry.isElevatedUser("other-admin")).toBe(true);
    for (const userId of ["public", "syntropy-admin", "syntropy", "pixel-self", "other-admin", "wa-50672330211", "wa-group-120363408642317805"]) {
      expect(registry.isNIWABrokerAuthorized(userId)).toBe(false);
      expect(registry.isServerAuthorized("ambienteniwa", userId)).toBe(false);
      await expect(executeNIWABroker("ssh", { server: "ambienteniwa", command: "status" }, { userId })).rejects.toThrow("Access denied");
    }
    expect(mock).not.toHaveBeenCalled();
    for (const userId of [owner, "developero"]) {
      expect(registry.isNIWABrokerAuthorized(userId)).toBe(true);
      await executeNIWABroker("ssh", { server: "ambienteniwa", command: "status" }, { userId });
    }
    expect(mock).toHaveBeenCalledTimes(2);
  });

  test("other servers retain their existing authorization behavior", () => {
    expect(registry.isServerAuthorized("other", "syntropy-admin")).toBe(true);
    expect(registry.isServerAuthorized("other", "other-admin")).toBe(true);
    expect(registry.isServerAuthorized("other", "public")).toBe(false);
  });

  test("authenticated sender overrides conversation identity in both directions", async () => {
    const mock = mockSpawn();
    await expect(executeNIWABroker("ssh", { server: "ambienteniwa", command: "status" }, { userId: owner, authUserId: "public" })).rejects.toThrow("Access denied");
    expect(mock).not.toHaveBeenCalled();
    await executeNIWABroker("wp", { server: "ambienteniwa", command: 'post update 12 --post_title="Hello world"' }, { userId: "wa-group-room", authUserId: owner });
    expect(mock).toHaveBeenCalledTimes(1);
  });

  test("all overrides rejected even when matching; server mismatch denied", async () => {
    const mock = mockSpawn();
    for (const [key, value] of Object.entries({ host: entry.host, user: entry.user, port: 22, path: ".", key: "dummy", key_file: entry.key_file, known_hosts_file: entry.known_hosts_file })) {
      for (const tool of ["ssh", "wp"] as const) {
        await expect(executeNIWABroker(tool, { server: "ambienteniwa", command: "status", [key]: value }, { userId: owner })).rejects.toThrow("overrides");
      }
    }
    await expect(executeNIWABroker("ssh", { server: "other", command: "status" }, { userId: owner })).rejects.toThrow("Access denied");
    expect(mock).not.toHaveBeenCalled();
  });

  test("undefined optional wrapper fields are absent; null and matching defined overrides are denied", async () => {
    const mock = mockSpawn();
    await executeNIWABroker("ssh", { server: "ambienteniwa", command: "status", host: undefined, user: undefined, port: undefined, path: undefined, key: undefined }, { authUserId: owner });
    expect(mock).toHaveBeenCalledTimes(1);
    await expect(executeNIWABroker("ssh", { server: "ambienteniwa", command: "status", host: null }, { authUserId: owner })).rejects.toThrow("overrides");
    expect(mock).toHaveBeenCalledTimes(1);
  });

  test("read-only and backup operations never gain global-admin authorization", async () => {
    const mock = mockSpawn();
    for (const command of ["status", '{"v":1,"op":"backup"}', '{"v":1,"op":"file.read","path":"wp-content/themes/niwa/style.css"}']) {
      await expect(executeNIWABroker("ssh", { server: "ambienteniwa", command }, { userId: owner, authUserId: "syntropy-admin" })).rejects.toThrow("Access denied");
    }
    expect(mock).not.toHaveBeenCalled();
  });

  test("backup exposes only an opaque receipt and fails closed on malformed receipts", async () => {
    const mock = mockSpawn();
    for (const receipt of ["a".repeat(32), null, "private-path", "A".repeat(32)]) {
      mock.mockImplementation((() => ({
        stdout: new Blob([JSON.stringify({ ok: true, result: { sql: "dummy SQL", path: "dummy private path" }, receipt })]).stream(),
        stderr: new Blob([]).stream(), exited: Promise.resolve(0), kill: () => {},
      })) as unknown as typeof Bun.spawn);
      const run = executeNIWABroker("ssh", { server: "ambienteniwa", command: '{"v":1,"op":"backup"}' }, { authUserId: owner });
      if (typeof receipt === "string" && /^[a-f0-9]{32}$/.test(receipt)) {
        const result = await run;
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true, result: null, receipt });
        expect(result.content[0].text).not.toContain("dummy");
      } else await expect(run).rejects.toThrow("invalid receipt");
    }
  });

  test("unconfigured or legacy transport never spawns", async () => {
    const mock = mockSpawn();
    const resolve = spyOn(registry, "resolveServer");
    try {
      for (const transport of [undefined, "ssh"] as const) {
        resolve.mockReturnValue({ ...entry, name: "ambienteniwa", transport });
        await expect(executeNIWABroker("ssh", { server: "ambienteniwa", command: "status" }, { userId: owner })).rejects.toThrow("Legacy SSH is disabled");
      }
      resolve.mockReturnValue(null);
      await expect(executeNIWABroker("ssh", { server: "ambienteniwa", command: "status" }, { userId: owner })).rejects.toThrow();
      expect(mock).not.toHaveBeenCalled();
    } finally { resolve.mockRestore(); }
  });

  test("invalid paths, flags, unknown operations and registry changes fail before spawning", async () => {
    const mock = mockSpawn();
    for (const [tool, command] of [
      ["ssh", '{"v":1,"op":"file.read","path":"../secret"}'],
      ["ssh", '{"v":1,"op":"shell"}'], ["wp", "post list --path=/tmp"],
    ] as const) {
      await expect(executeNIWABroker(tool, { server: "ambienteniwa", command }, { userId: owner })).rejects.toThrow();
    }
    const resolve = spyOn(registry, "resolveServer");
    try {
      for (const change of [{ host: "other" }, { user: "niwa" }, { port: 2222 }, { key_file: "/tmp/key" }, { known_hosts_file: "/dev/null" }]) {
        resolve.mockReturnValue({ ...entry, name: "ambienteniwa", ...change });
        await expect(executeNIWABroker("ssh", { server: "ambienteniwa", command: "status" }, { userId: owner })).rejects.toThrow("not configured");
      }
      expect(mock).not.toHaveBeenCalled();
    } finally { resolve.mockRestore(); }
  });

  test("SSH command is constant; request and content travel only through stdin", async () => {
    const mock = mockSpawn();
    await executeNIWABroker("wp", { server: "ambienteniwa", command: 'post update 12 --post_title="Private title"' }, { userId: owner });
    const [args, options] = mock.mock.calls[0] as unknown as [string[], { stdin: Blob }];
    expect(args).toEqual([
      "ssh", "-F", "/dev/null", "-T", "-i", entry.key_file!,
      "-o", "StrictHostKeyChecking=yes", "-o", `UserKnownHostsFile=${entry.known_hosts_file}`,
      "-o", "IdentitiesOnly=yes", "-o", "BatchMode=yes", "-o", "ConnectTimeout=15",
      "-o", "ForwardAgent=no", "-o", "ClearAllForwardings=yes", "-p", "22", "pixel@172.18.0.1", "niwa-broker-v1",
    ]);
    const request = JSON.parse(await options.stdin.text());
    expect(request.argv).toEqual(["post", "update", "12", "--post_title=Private title"]);
    expect(request.request_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(args.join(" ")).not.toContain("Private title");
    expect(registry.resolveServerKey(entry)).toBeUndefined();
  });

  test("SSH failures never expose diagnostics or credential filenames", async () => {
    mockSpawn().mockImplementation((() => ({
      stdout: new Blob([]).stream(), stderr: new Blob(["private diagnostic /app/data/keys/niwa-broker_ed25519"]).stream(),
      exited: Promise.resolve(255), kill: () => {},
    })) as unknown as typeof Bun.spawn);
    await expect(executeNIWABroker("ssh", { server: "ambienteniwa", command: "status" }, { userId: owner }))
      .rejects.toThrow("NIWA broker failed (exit 255).");
  });
});

describe("NIWA protocol validation", () => {
  test("quotes, escaping, empty values, one wp prefix and literal quoted punctuation", () => {
    expect(tokenizeNIWAWP('wp post update 1 --post_title="A & B" --post_content=\'a; $(literal)\' "" escaped\\ value'))
      .toEqual(["post", "update", "1", "--post_title=A & B", "--post_content=a; $(literal)", "", "escaped value"]);
    for (const command of ["", "wp wp plugin list", "plugin list && id", "plugin list; id", "plugin list | id", "plugin list $(id)", "plugin list `id`", "plugin list > out", 'post list "bad', "post list\\", "eval 'code'", "shell", "post list\nstatus"]) {
      expect(() => tokenizeNIWAWP(command)).toThrow();
    }
  });

  test("dangerous global flags rejected in tokenized and JSON argv", () => {
    for (const flag of ["--path", "--require", "--exec", "--ssh", "--http"]) {
      for (const token of [flag, `${flag}=value`]) {
        expect(() => tokenizeNIWAWP(`post list ${token}`)).toThrow();
        expect(() => validateNIWARequest({ v: 1, op: "wp", argv: ["post", "list", token] })).toThrow();
      }
    }
    expect(() => tokenizeNIWAWP("post list " + "arg ".repeat(128))).toThrow();
  });

  test("status and relative files; writes always include UUID and compare hash", () => {
    expect(parseNIWARequest("ssh", "niwa status").op).toBe("status");
    expect(parseNIWARequest("ssh", '{"v":1,"op":"file.list","path":"wp-content/uploads"}').op).toBe("file.list");
    const write = validateNIWARequest({ v: 1, op: "file.write", path: "wp-content/themes/niwa/test.txt", content_b64: "aGk=", expected_sha256: null });
    expect(write.request_id).toMatch(/^[0-9a-f-]{36}$/);
    const id = write.request_id;
    expect(validateNIWARequest({ ...write, request_id: id, expected_sha256: "a".repeat(64) }).request_id).toBe(id);
  });

  test("final Python protocol samples: exact fields and canonical UUID for every operation", async () => {
    const mock = mockSpawn();
    const request_id = "12345678-1234-4234-8234-123456789abc";
    const samples: NIWARequest[] = [
      { v: 1, op: "status", request_id }, { v: 1, op: "backup", request_id },
      { v: 1, op: "wp", argv: ["page", "get", "123"], request_id },
      { v: 1, op: "file.list", path: "wp-content/themes/niwa", request_id },
      { v: 1, op: "file.read", path: "wp-content/themes/niwa/style.css", request_id },
      { v: 1, op: "file.write", path: "wp-content/uploads/note.txt", content_b64: "aGk=", expected_sha256: null, request_id },
      { v: 1, op: "file.restore", receipt: "a".repeat(32), request_id },
      { v: 1, op: "media.upload", filename: "pixel.png", mime: "image/png", content_b64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", request_id },
    ];
    for (const sample of samples) {
      expect(validateNIWARequest(sample)).toEqual(sample);
      await executeNIWABroker("ssh", { server: "ambienteniwa", command: JSON.stringify(sample) }, { userId: "group", authUserId: owner });
      const [, options] = mock.mock.calls.at(-1)! as unknown as [string[], { stdin: Blob }];
      expect(JSON.parse(await options.stdin.text())).toEqual(sample);
      for (const key of Object.keys(sample)) {
        const missing = { ...sample } as Record<string, unknown>;
        delete missing[key];
        if (key === "request_id") expect(validateNIWARequest(missing).request_id).toMatch(/^[a-f0-9-]{36}$/);
        else expect(() => validateNIWARequest(missing)).toThrow();
      }
      expect(() => validateNIWARequest({ ...sample, extra: true })).toThrow();
    }
  });

  test("guarded WP grammar samples stay tokenized; broker independently validates grammar", () => {
    for (const command of [
      "core version", "core check-update", "plugin list", "theme get niwa", "plugin status akismet",
      "plugin update akismet --version=5.3.7", "theme update twentytwentyfive --version=1.2.3",
      "post list --posts_per_page=20 --paged=1 --post_status=publish", "page get 12",
      'page create --post_title="New page" --post_content="A & B; $(literal)" --post_status=draft',
      'post update 12 --post_excerpt="Quote \\"inside\\"" --post_status=publish',
      "option get home", "option get siteurl", "option get blogname", "option get blogdescription",
    ]) {
      const request = parseNIWARequest("wp", command);
      expect(request.op).toBe("wp");
      expect(request.request_id).toMatch(/^[a-f0-9-]{36}$/);
    }
    expect(tokenizeNIWAWP('page create --post_title="Title" --post_content="A & B; $(literal)"'))
      .toEqual(["page", "create", "--post_title=Title", "--post_content=A & B; $(literal)"]);
    expect(() => validateNIWARequest({ v: 1, op: "wp", argv: ["post", "get", "é".repeat(32769)] })).toThrow();
  });

  test("narrow Python asset paths reject sensitive trees, suffixes and directory aliases", () => {
    for (const path of [
      ".", "wp-config.php", "wp-content/plugins/niwa/main.js", "wp-content/themes/Upper/style.css",
      "wp-content/themes/niwa/.hidden.txt", "wp-content/themes/niwa/sub..dir/style.css",
      "wp-content/themes/niwa/a.php.css", "wp-content/themes/niwa/a.json.txt",
      "wp-content/uploads/a.svg", "wp-content/uploads/a.sql.txt", "wp-content/uploads/a.html.txt",
      "wp-content/themes/niwa/image.png", "wp-content/uploads/script.js", "wp-content/uploads/space name.txt",
      "wp-content/uploads/" + "a".repeat(81) + ".txt", "wp-content/uploads/" + "a/".repeat(120) + "a.txt",
    ]) expect(() => validateNIWARequest({ v: 1, op: "file.read", path })).toThrow();
    expect(validateNIWARequest({ v: 1, op: "file.list", path: "wp-content/themes/niwa/assets" }).op).toBe("file.list");
    expect(validateNIWARequest({ v: 1, op: "file.read", path: "wp-content/uploads/2026/10/image.webp" }).op).toBe("file.read");
  });

  test("restore receipts, media MIME, canonical base64 and 180KiB bounds", () => {
    for (const receipt of [null, "", "a".repeat(31), "a".repeat(33), "A".repeat(32), "g".repeat(32), "a".repeat(32) + "\n"]) {
      expect(() => validateNIWARequest({ v: 1, op: "file.restore", receipt })).toThrow();
    }
    for (const [filename, mime] of [["a.png", "image/png"], ["a.jpg", "image/jpeg"], ["a.jpeg", "image/jpeg"], ["a.webp", "image/webp"]]) {
      expect(validateNIWARequest({ v: 1, op: "media.upload", filename, mime, content_b64: "aGk=" }).op).toBe("media.upload");
    }
    for (const [filename, mime] of [["../a.png", "image/png"], ["a.PNG", "image/png"], ["a.png", "image/jpeg"], ["a.svg", "image/svg+xml"], ["a".repeat(81) + ".png", "image/png"]]) {
      expect(() => validateNIWARequest({ v: 1, op: "media.upload", filename, mime, content_b64: "aGk=" })).toThrow();
    }
    const media = { v: 1, op: "media.upload", filename: "a.png", mime: "image/png" };
    expect(validateNIWARequest({ ...media, content_b64: Buffer.alloc(180 * 1024).toString("base64") }).op).toBe("media.upload");
    for (const content_b64 of ["AB==", "aGk=\n", Buffer.alloc(180 * 1024 + 1).toString("base64")]) {
      expect(() => validateNIWARequest({ ...media, content_b64 })).toThrow();
      expect(() => validateNIWARequest({ v: 1, op: "file.write", path: "wp-content/uploads/a.txt", expected_sha256: null, content_b64 })).toThrow();
    }
    for (const content of [Buffer.from("<?php"), Buffer.from("<script>"), Buffer.from("< HTML>"), Buffer.from("<svg>"), Buffer.from([0]), Buffer.from([255])]) {
      expect(() => validateNIWARequest({ v: 1, op: "file.write", path: "wp-content/themes/niwa/a.js", expected_sha256: null, content_b64: content.toString("base64") })).toThrow();
    }
    expect(() => validateNIWARequest({ v: 1, op: "status", request_id: "12345678-1234-4234-8234-123456789ABC" })).toThrow();
    expect(() => validateNIWARequest({ v: 1, op: "status", request_id: "12345678-1234-4234-8234-123456789abc\n" })).toThrow();
    expect(() => validateNIWARequest({ v: 1, op: "file.list", path: "wp-content/uploads/x\n" })).toThrow();
    expect(() => validateNIWARequest({ v: 1, op: "media.upload", filename: "a.png\n", mime: undefined, content_b64: "" })).toThrow();
  });

  test("traversal, unknown ops/fields, bad hash/base64/version/id and large bodies rejected", () => {
    for (const path of ["../x", "a/../../x", "/etc/passwd", "a\\..\\x", "a//x", "a\0x"]) {
      for (const op of ["file.read", "file.list", "file.write"]) {
        expect(() => validateNIWARequest({ v: 1, op, path, ...(op === "file.write" ? { content_b64: "", expected_sha256: null } : {}) })).toThrow();
      }
    }
    for (const request of [
      { v: 1, op: "shell" }, { v: 2, op: "status" }, { v: 1, op: "status", host: entry.host },
      { v: 1, op: "status", request_id: "bad" }, { v: 1, op: "wp", argv: ["eval", "code"] },
      { v: 1, op: "file.write", path: "a", content_b64: "aGk=" },
      { v: 1, op: "file.write", path: "a", content_b64: "!", expected_sha256: null },
      { v: 1, op: "file.write", path: "a", content_b64: "", expected_sha256: "bad" },
      { v: 1, op: "file.write", path: "a", content_b64: "a".repeat(256 * 1024), expected_sha256: null },
    ]) expect(() => validateNIWARequest(request)).toThrow();
    expect(() => parseNIWARequest("ssh", "ls -la")).toThrow();
  });
});
