// components/cv-layouts/graph-stats.tsx
//
// New CvLayoutId: "graph-stats" (register in lib/layouts.ts). Same
// header/contact/experience/education pattern as the other layouts,
// plus two animated shadcn charts built on the derived stats in
// lib/skill-signal.ts, a Links/References section matching the other
// templates, and the interlude audio track from the generating modal
// continuing to play here (see hooks/use-interlude-audio.ts).
//
// Requires: npx shadcn add chart
"use client";

import { motion } from "framer-motion";
import { Mail, Phone, MapPin, IdCard, TrendingUp, Layers } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"; // npx shadcn add chart
import { prepareCvData, toWhatsAppNumber } from "@/lib/cv-data";
import { getChartPalette } from "@/lib/chart-theme";
import {
  computeSkillSignals,
  computeExperienceDepth,
} from "@/lib/skill-signal";
import type { CvLayoutProps } from "./types";

// Note: the interlude audio track is NOT wired up here — it plays for
// every layout via CvAnimatedView in components/cv-preview.tsx, not
// per-template. See hooks/use-interlude-audio.ts.

export function GraphStatsLayout({ cv, version }: CvLayoutProps) {
  const {
    g,
    theme,
    testimonials,
    hasSidebarContent,
    fullName,
    idNumber,
    address,
    email,
    phone,
    photoUrl,
    videoUrl,
  } = prepareCvData(cv, version);

  const palette = getChartPalette(theme);
  const skillSignals = computeSkillSignals(g);
  const experienceDepth = computeExperienceDepth(g);

  const chartConfig = {
    score: { label: "Relevance signal", color: palette.primary },
    bullets: { label: "Highlights", color: palette.secondary },
  } satisfies ChartConfig;

  const cardClass = `rounded-xl border p-6 ${theme.web.border}`;

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 space-y-10">
      {/* ---------- Header, same pattern as centered.tsx ---------- */}
      <div className="max-w-2xl mx-auto text-center">
        {videoUrl ? (
          <motion.video
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9 }}
            src={videoUrl}
            autoPlay
            muted
            loop
            playsInline
            className="w-full rounded-xl mb-6"
          />
        ) : photoUrl ? (
          <motion.img
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            src={photoUrl}
            className="w-32 h-32 rounded-full mx-auto mb-6 object-cover"
          />
        ) : null}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className={`text-3xl font-semibold ${theme.web.heading}`}
        >
          {fullName}
        </motion.h1>
        <p className={theme.web.accentText}>{g?.headline}</p>
        <p className="text-muted-foreground mt-2">{g?.summary}</p>
        <div className="flex flex-wrap justify-center gap-2 mt-5">
          {email && (
            <a
              href={`mailto:${email}`}
              className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border transition-colors hover:opacity-80 ${theme.web.pill}`}
            >
              <Mail className="w-3.5 h-3.5" />
              {email}
            </a>
          )}
          {phone && (
            <a
              href={`https://wa.me/${toWhatsAppNumber(phone)}`}
              target="_blank"
              className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border transition-colors hover:opacity-80 ${theme.web.pill}`}
            >
              <Phone className="w-3.5 h-3.5" />
              {phone}
            </a>
          )}
          {address && (
            <span
              className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border ${theme.web.pill}`}
            >
              <MapPin className="w-3.5 h-3.5" />
              {address}
            </span>
          )}
          {idNumber && (
            <span
              className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border ${theme.web.pill}`}
            >
              <IdCard className="w-3.5 h-3.5" />
              {idNumber}
            </span>
          )}
        </div>
      </div>

      {/* ---------- Skill signal chart ---------- */}
      {skillSignals.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className={cardClass}
        >
          <h2
            className={`text-lg font-semibold mb-1 flex items-center gap-2 ${theme.web.heading}`}
          >
            <TrendingUp className="w-4 h-4" /> Skill signal
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            How strongly each top skill shows up across this CV&apos;s summary
            and experience — not a self-rated proficiency score.
          </p>
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <BarChart
              data={skillSignals}
              layout="vertical"
              margin={{ left: 8, right: 16 }}
            >
              <CartesianGrid horizontal={false} stroke={palette.grid} />
              <XAxis type="number" dataKey="score" hide domain={[0, 100]} />
              <YAxis
                type="category"
                dataKey="skill"
                width={120}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: palette.text }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="score"
                fill="var(--color-score)"
                radius={[0, 6, 6, 0]}
                isAnimationActive
                animationDuration={1100}
                animationEasing="ease-out"
              />
            </BarChart>
          </ChartContainer>
        </motion.section>
      )}

      {/* ---------- Experience depth chart ---------- */}
      {experienceDepth.length > 1 && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className={cardClass}
        >
          <h2
            className={`text-lg font-semibold mb-1 flex items-center gap-2 ${theme.web.heading}`}
          >
            <Layers className="w-4 h-4" /> Experience depth
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Number of tailored highlights the AI wrote for each role.
          </p>
          <ChartContainer config={chartConfig} className="h-72 w-full">
            <RadarChart data={experienceDepth}>
              <PolarGrid stroke={palette.grid} />
              <PolarAngleAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: palette.text }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Radar
                dataKey="bullets"
                stroke={palette.primary}
                fill={palette.primary}
                fillOpacity={0.35}
                isAnimationActive
                animationDuration={1200}
                animationEasing="ease-out"
              />
            </RadarChart>
          </ChartContainer>
        </motion.section>
      )}

      {/* ---------- Experience list ---------- */}
      {g && g.experience.length > 0 && (
        <section
          className={hasSidebarContent ? "grid md:grid-cols-3 gap-8" : ""}
        >
          <div
            className={
              hasSidebarContent ? "md:col-span-2 space-y-6" : "space-y-6"
            }
          >
            <h2 className={`text-lg font-semibold ${theme.web.heading}`}>
              Experience
            </h2>
            {g.experience.map((entry, i) => (
              <motion.div
                key={`${entry.company}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className={`border-l-2 pl-4 ${theme.web.border}`}
              >
                <div className="flex items-baseline justify-between gap-4 flex-wrap">
                  <p className="font-medium">
                    {entry.role} · {entry.company}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.period}
                  </p>
                </div>
                <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-0.5">
                  {entry.bullets.map((b, bi) => (
                    <li key={bi}>{b}</li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          {hasSidebarContent && (
            <div className="space-y-6">
              {g.education.length > 0 && (
                <div>
                  <h2
                    className={`text-lg font-semibold mb-2 ${theme.web.heading}`}
                  >
                    Education
                  </h2>
                  <div className="space-y-3">
                    {g.education.map((ed, i) => (
                      <div
                        key={i}
                        className={`border-l-2 pl-4 ${theme.web.borderSoft}`}
                      >
                        <p className="font-medium text-sm">
                          {ed.qualification}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ed.institution} · {ed.period}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {testimonials.length > 0 && (
                <div>
                  <h2
                    className={`text-lg font-semibold mb-2 ${theme.web.heading}`}
                  >
                    Testimonials
                  </h2>
                  <div className="space-y-3">
                    {testimonials.map((t, i) => (
                      <blockquote
                        key={i}
                        className="text-sm text-muted-foreground italic"
                      >
                        &ldquo;{t.text}&rdquo; —{" "}
                        <span className="not-italic font-medium">
                          {t.author}
                        </span>
                      </blockquote>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ---------- Links & References ---------- */}
      {(cv.links.length > 0 || cv.references.length > 0) && (
        <section className="grid sm:grid-cols-2 gap-6">
          {cv.links.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className={cardClass}
            >
              <h2 className="font-medium text-sm uppercase tracking-wide text-muted-foreground mb-3">
                Links
              </h2>
              <div className="flex flex-col gap-2">
                {cv.links.map((l, i) => (
                  <a
                    key={i}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-sm break-words ${theme.web.link}`}
                  >
                    {l.label}
                    {l.description && (
                      <span className="text-muted-foreground">
                        {" "}
                        — {l.description}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </motion.div>
          )}
          {cv.references.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.06 }}
              className={cardClass}
            >
              <h2 className="font-medium text-sm uppercase tracking-wide text-muted-foreground mb-3">
                References
              </h2>
              <div className="space-y-2">
                {cv.references.map((r, i) => (
                  <p
                    key={i}
                    className="text-sm text-muted-foreground break-words"
                  >
                    {r.name}
                    {r.relationship ? ` (${r.relationship})` : ""} — {r.contact}
                  </p>
                ))}
              </div>
            </motion.div>
          )}
        </section>
      )}

      {g?.closingNote && (
        <p className={`text-center text-sm ${theme.web.accentText}`}>
          {g.closingNote}
        </p>
      )}
    </div>
  );
}
