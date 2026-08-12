// lib/pdf-layouts/graph-stats.tsx
//
// Mirrors components/cv-layouts/graph-stats.tsx for print. @react-pdf/
// renderer can't run recharts or CSS animation, so the "chart" here is
// a static list of skill names with a colored <View> bar sized by
// width percentage — same computeSkillSignals() scores as the web
// version, just drawn with boxes instead of SVG.
import {
  Document,
  Page,
  Text,
  View,
  Image,
  Link,
  StyleSheet,
} from "@react-pdf/renderer";
import type { PdfLayoutData } from "./types";
import { toWhatsAppNumber } from "./types";
import { computeSkillSignals } from "@/lib/skill-signal";

function buildStyles(theme: PdfLayoutData["theme"]) {
  return StyleSheet.create({
    page: { padding: 44, fontSize: 10.5 },
    headRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    headTextCol: { flex: 1, paddingRight: 16 },
    photo: { width: 72, height: 72, borderRadius: 36, objectFit: "cover" },
    name: { fontSize: 18, fontWeight: 700 },
    headline: { fontSize: 10.5, color: theme.pdf.headline, marginTop: 2 },
    contactRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      marginTop: 6,
    },
    contactLink: { fontSize: 9, color: theme.pdf.link, textDecoration: "none" },
    contactText: { fontSize: 9, color: "#555" },
    contactSep: { fontSize: 9, color: "#999", marginHorizontal: 5 },
    summary: { fontSize: 9.5, color: "#444", marginTop: 12, lineHeight: 1.5 },
    section: { marginTop: 16 },
    sectionTitle: {
      fontSize: 9.5,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      borderBottomWidth: 1,
      borderBottomColor: theme.pdf.accentBorder,
      paddingBottom: 4,
      marginBottom: 8,
    },
    skillRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
    skillLabel: { fontSize: 8.5, width: 90 },
    skillTrack: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      backgroundColor: "#eee",
      overflow: "hidden",
    },
    skillFill: {
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.pdf.accentBorder,
    },
    entry: { marginBottom: 8 },
    entryHeadRow: { flexDirection: "row", justifyContent: "space-between" },
    entryTitle: { fontSize: 9.5, fontWeight: 700 },
    entryPeriod: { fontSize: 8.5, color: "#777" },
    bullet: { fontSize: 9, color: "#444", marginTop: 2, lineHeight: 1.4 },
    closingNote: {
      fontSize: 9.5,
      color: theme.pdf.closingNote,
      marginTop: 18,
      textAlign: "center",
    },
  });
}

export function buildGraphStatsPdfDocument(data: PdfLayoutData) {
  const { cv, theme, g, fullName, email, phone, address, idNumber, photoUrl } =
    data;
  const styles = buildStyles(theme);
  const skillSignals = computeSkillSignals(g).slice(0, 8); // keep the printed page tidy

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headRow}>
          <View style={styles.headTextCol}>
            <Text style={styles.name}>{fullName}</Text>
            {g?.headline && <Text style={styles.headline}>{g.headline}</Text>}
            <View style={styles.contactRow}>
              {email && (
                <Link src={`mailto:${email}`} style={styles.contactLink}>
                  {email}
                </Link>
              )}
              {phone && (
                <>
                  <Text style={styles.contactSep}>·</Text>
                  <Link
                    src={`https://wa.me/${toWhatsAppNumber(phone)}`}
                    style={styles.contactLink}
                  >
                    {phone}
                  </Link>
                </>
              )}
              {address && (
                <>
                  <Text style={styles.contactSep}>·</Text>
                  <Text style={styles.contactText}>{address}</Text>
                </>
              )}
              {idNumber && (
                <>
                  <Text style={styles.contactSep}>·</Text>
                  <Text style={styles.contactText}>{idNumber}</Text>
                </>
              )}
            </View>
          </View>
          {photoUrl && <Image src={photoUrl} style={styles.photo} />}
        </View>

        {g?.summary && <Text style={styles.summary}>{g.summary}</Text>}

        {skillSignals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skill signal</Text>
            {skillSignals.map((s) => (
              <View key={s.skill} style={styles.skillRow}>
                <Text style={styles.skillLabel}>{s.skill}</Text>
                <View style={styles.skillTrack}>
                  <View style={[styles.skillFill, { width: `${s.score}%` }]} />
                </View>
              </View>
            ))}
          </View>
        )}

        {g && g.experience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience</Text>
            {g.experience.map((entry, i) => (
              <View key={i} style={styles.entry}>
                <View style={styles.entryHeadRow}>
                  <Text style={styles.entryTitle}>
                    {entry.role} · {entry.company}
                  </Text>
                  <Text style={styles.entryPeriod}>{entry.period}</Text>
                </View>
                {entry.bullets.map((b, bi) => (
                  <Text key={bi} style={styles.bullet}>
                    • {b}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {g && g.education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {g.education.map((ed, i) => (
              <View key={i} style={styles.entry}>
                <View style={styles.entryHeadRow}>
                  <Text style={styles.entryTitle}>{ed.qualification}</Text>
                  <Text style={styles.entryPeriod}>{ed.period}</Text>
                </View>
                <Text style={styles.bullet}>{ed.institution}</Text>
              </View>
            ))}
          </View>
        )}

        {g?.closingNote && (
          <Text style={styles.closingNote}>{g.closingNote}</Text>
        )}
      </Page>
    </Document>
  );
}
