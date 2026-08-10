import { NextRequest, NextResponse } from "next/server";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { auth } from "@clerk/nextjs/server"; // adjust import to match your Clerk setup

// npm install jsdom @mozilla/readability

const MAX_BYTES = 3_000_000; // 3MB cap — job postings are never legitimately larger
const FETCH_TIMEOUT_MS = 8_000;
const MAX_TEXT_CHARS = 15_000; // plenty for a JD; keeps the downstream AI prompt sane

/**
 * Blocks requests to loopback, link-local, and private address ranges so this
 * route can't be used as an open SSRF proxy against internal infrastructure
 * (e.g. cloud metadata endpoints at 169.254.169.254, internal admin panels,
 * localhost services). This is a real attack surface for any "fetch this URL
 * server-side" route — not being paranoid for no reason.
 */
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local")) return true;

  // IPv4 literal checks
  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 127) return true; // loopback
    if (a === 10) return true; // private
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 0) return true;
  }
  // IPv6 loopback / link-local / unique-local
  if (
    h === "::1" ||
    h.startsWith("fe80:") ||
    h.startsWith("fc") ||
    h.startsWith("fd")
  ) {
    return true;
  }
  return false;
}

function validateUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http/https URLs are supported.");
  }
  if (isBlockedHost(url.hostname)) {
    throw new Error("That URL can't be fetched.");
  }
  return url;
}

export async function POST(req: NextRequest) {
  // Require auth — this is a fetch-any-url primitive, don't expose it
  // unauthenticated even though it's read-only. Swap for your actual
  // auth check if you're not on Clerk's App Router helper.
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const rawUrl = body?.url;
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    return NextResponse.json({ error: "Missing 'url'." }, { status: 400 });
  }

  let url: URL;
  try {
    url = validateUrl(rawUrl.trim());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid URL.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: "follow", // note: each redirect hop isn't re-validated against
      // isBlockedHost — acceptable for a v1 given the auth gate above, but if
      // you want to close that gap, switch to redirect: "manual" and loop
      // validateUrl() yourself on each Location header.
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; CVMakerJDImport/1.0; +https://yourapp.example/bot)",
        Accept: "text/html",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `The page returned an error (${response.status}). Try pasting the description instead.`,
        },
        { status: 502 },
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return NextResponse.json(
        {
          error:
            "That URL isn't a webpage we can read. Try pasting the description instead.",
        },
        { status: 415 },
      );
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_BYTES) {
      return NextResponse.json(
        { error: "That page is too large to import." },
        { status: 413 },
      );
    }

    // Read with a manual cap in case content-length was absent or lied about.
    const reader = response.body?.getReader();
    let received = 0;
    const chunks: Uint8Array[] = [];
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > MAX_BYTES) {
          throw new Error("That page is too large to import.");
        }
        chunks.push(value);
      }
    }
    const html = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString(
      "utf-8",
    );

    const dom = new JSDOM(html, { url: url.toString() });
    const reader2 = new Readability(dom.window.document);
    const article = reader2.parse();

    const text = (article?.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();

    if (!text || text.length < 200) {
      return NextResponse.json(
        {
          error:
            "Couldn't extract readable text from that page — it may require JavaScript to load the posting. Try pasting the job description directly instead.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      title: article?.title ?? null,
      text: text.slice(0, MAX_TEXT_CHARS),
      truncated: text.length > MAX_TEXT_CHARS,
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      {
        error: aborted
          ? "That page took too long to load. Try pasting the description instead."
          : "Couldn't fetch that page. Try pasting the description instead.",
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
