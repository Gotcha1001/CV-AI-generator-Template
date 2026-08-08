import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { NextResponse } from "next/server";
import { prepareCvData } from "@/lib/cv-data";
import { PDF_LAYOUT_BUILDERS } from "@/lib/pdf-layouts";

export const runtime = "nodejs"; // @react-pdf/renderer needs Node APIs, not edge

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shareId: string }> },
) {
  const { shareId } = await params;
  const cv = await fetchQuery(api.cvs.getByShareId, { shareId });
  if (!cv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Same data shaping the web preview uses (lib/cv-data.ts) — the PDF's
  // `g` / testimonials / achievements / theme / layout are guaranteed
  // identical to what /cv/[shareId] rendered.
  const data = prepareCvData(cv);
  const buildDocument =
    PDF_LAYOUT_BUILDERS[data.layout.id] ?? PDF_LAYOUT_BUILDERS.centered;

  // buildDocument's return type is widened to ReactElement<unknown> by
  // whatever generic builder-map shape lib/pdf-layouts.ts uses.
  // renderToBuffer's signature specifically wants a <Document> element
  // (ReactElement<DocumentProps>), so assert it here rather than loosening
  // the builder map's types — every builder in PDF_LAYOUT_BUILDERS returns
  // a <Document> at runtime already, this just tells TS that.
  const document = buildDocument({
    cv,
    ...data,
  }) as ReactElement<DocumentProps>;

  const buffer = await renderToBuffer(document);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${cv.personalInfo.fullName.replace(/\s+/g, "-")}-CV.pdf"`,
    },
  });
}
