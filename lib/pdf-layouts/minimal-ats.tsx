// lib/pdf-layouts/minimal-ats.tsx
//
// Mirrors components/cv-layouts/minimal-ats.tsx: clean single column,
// no boxes/cards, thin rules between sections. Deliberately the
// simplest layout in the set -- most readable to ATS parsers.

import {
  Document,
  Page,
  Text,
  View,
  Link,
  StyleSheet,
} from "@react-pdf/renderer";
import type { PdfLayoutData } from "./types";

function buildStyles(theme: PdfLayoutData["theme"]) {
  return StyleSheet.create({
    page: { padding: 44, fontSize: 10.5 },
    headRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    name: { fontSize: 18, fontWeight: 700 },
    headline: { fontSize: 10.5, color: theme.pdf.headline, marginTop: 2 },
    contactLine: { fontSize: 9, color: "#555", marginTop: 6 },

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

    skillsLine: { fontSize: 9.5 },

    entry: { marginBottom: 8 },
    entryHeadRow: { flexDirection: "row", justifyContent: "space-between" },
    entryTitle: { fontSize: 9.5, fontWeight: 700 },
    entryPeriod: { fontSize: 8.5, color: "#777" },
    bullet: { fontSize: 9, color: "#555", marginTop: 2, marginLeft: 4 },

    lineRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    lineText: { fontSize: 9.5 },
    lineMuted: { fontSize: 8.5, color: "#777" },

    listItem: { fontSize: 9, color: "#555", marginBottom: 3 },
    listItemStrong: { color: "#111" },

    testimonial: {
      fontSize: 9,
      fontStyle: "italic",
      color: "#555",
      marginBottom: 4,
    },

    closingNote: {
      marginTop: 16,
      fontSize: 9,
      fontStyle: "italic",
      color: theme.pdf.closingNote,
    },
  });
}

export function buildMinimalAtsPdfDocument(data: PdfLayoutData) {
  const {
    cv,
    theme,
    g,
    testimonials,
    achievements,
    fullName,
    idNumber,
    address,
    email,
    phone,
  } = data;
  const styles = buildStyles(theme);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headRow}>
          <View>
            <Text style={styles.name}>{fullName}</Text>
            <Text style={styles.headline}>{g?.headline}</Text>
            <Text style={styles.contactLine}>
              {[email, phone, address, idNumber ? `ID: ${idNumber}` : undefined]
                .filter(Boolean)
                .join("   ")}
            </Text>
          </View>
        </View>

        {g?.summary && <Text style={styles.summary}>{g.summary}</Text>}

        {g?.topSkills && g.topSkills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top skills</Text>
            <Text style={styles.skillsLine}>{g.topSkills.join(" · ")}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experience</Text>
          {g?.experience?.map((e, i) => (
            <View key={i} style={styles.entry} wrap={false}>
              <View style={styles.entryHeadRow}>
                <Text style={styles.entryTitle}>
                  {e.role} — {e.company}
                </Text>
                <Text style={styles.entryPeriod}>{e.period}</Text>
              </View>
              {e.bullets?.map((b, j) => (
                <Text key={j} style={styles.bullet}>
                  • {b}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Education</Text>
          {g?.education?.map((ed, i) => (
            <View key={i} style={styles.lineRow}>
              <Text style={styles.lineText}>
                {ed.qualification} — {ed.institution}
              </Text>
              <Text style={styles.lineMuted}>{ed.period}</Text>
            </View>
          ))}
        </View>

        {achievements && achievements.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            {achievements.map((a, i) => (
              <Text key={i} style={styles.listItem}>
                <Text style={styles.listItemStrong}>{a.title}</Text>
                {a.description ? ` — ${a.description}` : ""}
              </Text>
            ))}
          </View>
        )}

        {testimonials && testimonials.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Testimonials</Text>
            {testimonials.map((t, i) => (
              <Text key={i} style={styles.testimonial}>
                &quot;{t.text}&quot; — {t.author}
              </Text>
            ))}
          </View>
        )}

        {(cv.interests.length > 0 ||
          cv.links.length > 0 ||
          cv.references.length > 0) && (
          <View style={styles.section} wrap={false}>
            {cv.interests.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                <Text style={styles.sectionTitle}>Interests</Text>
                <Text style={styles.lineText}>{cv.interests.join(", ")}</Text>
              </View>
            )}
            {cv.links.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                <Text style={styles.sectionTitle}>Links</Text>
                {cv.links.map((l, i) => (
                  <Link
                    key={i}
                    src={l.url}
                    style={[
                      styles.lineText,
                      { color: theme.pdf.link, marginBottom: 2 },
                    ]}
                  >
                    {l.label}
                  </Link>
                ))}
              </View>
            )}
            {cv.references.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>References</Text>
                {cv.references.map((r, i) => (
                  <Text key={i} style={styles.listItem}>
                    {r.name}
                    {r.relationship ? ` (${r.relationship})` : ""} — {r.contact}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {g?.closingNote && (
          <Text style={styles.closingNote}>&quot;{g.closingNote}&quot;</Text>
        )}
      </Page>
    </Document>
  );
}
