import "server-only";
import { promises as dns } from "node:dns";
import net from "node:net";

/**
 * Guards against server-side request forgery from user-supplied URLs
 * (the site being scanned, or links discovered while crawling it). Both
 * app/api/analyze and app/api/crawl fetch arbitrary attacker-influenced
 * URLs on behalf of an authenticated user, with no host allowlist — this
 * closes the path to internal services, loopback, and cloud metadata
 * endpoints (e.g. 169.254.169.254) that a bare `fetch(url)` would happily
 * hit.
 *
 * Known residual gap: DNS-rebinding between the lookup here and the
 * connection `fetch()` makes moments later isn't closed, since Node's
 * global fetch doesn't expose a way to pin a resolved address without
 * pulling in an extra dependency (undici's Agent isn't a direct dep of
 * this project). What this *does* close: literal private/loopback/
 * link-local hosts, obfuscated IP forms (decimal/octal/hex — the OS
 * resolver normalizes those before we inspect the address), and
 * redirect chains that hop to an internal address after the first request.
 */

export class UnsafeUrlError extends Error {}

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal"]);

function ipv4ToLong(ip: string): number {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function inIPv4Range(ip: string, base: string, bits: number): boolean {
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipv4ToLong(ip) & mask) === (ipv4ToLong(base) & mask);
}

function isPrivateIPv4(ip: string): boolean {
  return (
    inIPv4Range(ip, "0.0.0.0", 8) ||
    inIPv4Range(ip, "10.0.0.0", 8) ||
    inIPv4Range(ip, "100.64.0.0", 10) ||
    inIPv4Range(ip, "127.0.0.0", 8) ||
    inIPv4Range(ip, "169.254.0.0", 16) ||
    inIPv4Range(ip, "172.16.0.0", 12) ||
    inIPv4Range(ip, "192.0.0.0", 24) ||
    inIPv4Range(ip, "192.0.2.0", 24) ||
    inIPv4Range(ip, "192.168.0.0", 16) ||
    inIPv4Range(ip, "198.18.0.0", 15) ||
    inIPv4Range(ip, "198.51.100.0", 24) ||
    inIPv4Range(ip, "203.0.113.0", 24) ||
    inIPv4Range(ip, "224.0.0.0", 4) ||
    inIPv4Range(ip, "240.0.0.0", 4)
  );
}

function isPrivateIPv6(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v === "::1" || v === "::") return true;
  if (v.startsWith("fe80:") || v.startsWith("fc") || v.startsWith("fd")) return true;
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
}

function isPrivateOrReservedIP(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) return isPrivateIPv6(ip);
  return true;
}

/** Throws UnsafeUrlError if `rawUrl` is not a safe, publicly-routable http(s) URL. */
export async function assertPublicHttpUrl(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError("Invalid URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new UnsafeUrlError("Only http/https URLs are allowed");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new UnsafeUrlError("This host is not allowed");
  }

  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIP(hostname)) throw new UnsafeUrlError("This address is not allowed");
    return;
  }

  let records: { address: string }[];
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new UnsafeUrlError("Could not resolve host");
  }
  if (records.length === 0) throw new UnsafeUrlError("Could not resolve host");
  for (const { address } of records) {
    if (isPrivateOrReservedIP(address)) throw new UnsafeUrlError("This address is not allowed");
  }
}

/**
 * fetch() with the SSRF guard applied to the initial URL and to every hop
 * of a redirect chain (a bare `redirect: "follow"` would otherwise let a
 * public URL bounce to an internal address after the fact).
 */
export async function guardedFetch(
  url: string,
  init: RequestInit,
  maxRedirects = 5
): Promise<Response> {
  let current = url;
  for (let i = 0; ; i++) {
    await assertPublicHttpUrl(current);
    const res = await fetch(current, { ...init, redirect: "manual" });

    const isRedirect = res.status >= 300 && res.status < 400;
    const location = res.headers.get("location");
    if (!isRedirect || !location) return res;
    if (i >= maxRedirects) throw new UnsafeUrlError("Too many redirects");

    current = new URL(location, current).href;
  }
}
