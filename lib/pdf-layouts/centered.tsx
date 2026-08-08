// lib/pdf-layouts/centered.tsx
//
// Mirrors components/cv-layouts/centered.tsx: centered header (photo,
// name, headline, summary, contact pills) -> two-column body (sidebar:
// interests/links/references, main: experience/education/testimonials/
// achievements) -> centered closing note.
//
// See the original inline comments (kept below) for the pagination /
// border-consistency reasoning — that all still applies unchanged.

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

function buildStyles(theme: PdfLayoutData["theme"]) {
  return StyleSheet.create({
    page: { padding: 40, fontSize: 11 },
    header: { alignItems: "center", textAlign: "center", marginBottom: 8 },
    photo: {
      width: 100,
      height: 100,
      borderRadius: 50,
      marginBottom: 12,
      objectFit: "cover",
    },
    name: { fontSize: 22, marginBottom: 2, textAlign: "center" },
    headline: {
      fontSize: 12,
      color: theme.pdf.headline,
      marginBottom: 6,
      textAlign: "center",
    },
    summary: {
      marginTop: 2,
      marginBottom: 10,
      color: "#444",
      textAlign: "center",
    },
    contactRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      marginBottom: 4,
    },
    contactPill: {
      fontSize: 9,
      backgroundColor: theme.pdf.pillBg,
      color: theme.pdf.pillText,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 10,
      marginRight: 6,
      marginBottom: 6,
    },
    contactPillLink: {
      fontSize: 9,
      backgroundColor: theme.pdf.pillBg,
      color: theme.pdf.pillText,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 10,
      marginRight: 6,
      marginBottom: 6,
      textDecoration: "none",
    },
    card: {
      borderWidth: 1,
      borderColor: theme.pdf.accentBorder,
      borderRadius: 8,
      padding: 12,
    },
    section: { marginTop: 14 },
    sectionTitle: { fontSize: 13, marginBottom: 6 },
    sectionFlow: { marginTop: 14 },
    sectionFlowTitleBox: { marginBottom: 8 },
    sectionFlowTitle: { fontSize: 13 },
    entryCard: { marginBottom: 10 },
    bullet: { marginLeft: 10, marginBottom: 2 },
    educationEntry: {},
    skillsRow: { flexDirection: "row", flexWrap: "wrap" },
    skillPill: {
      fontSize: 9,
      backgroundColor: theme.pdf.pillBg,
      color: theme.pdf.pillText,
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 10,
      marginRight: 6,
      marginBottom: 6,
    },
    testimonial: { marginBottom: 8 },
    testimonialText: { fontStyle: "italic" },
    testimonialAuthor: { fontSize: 9, color: "#555", marginTop: 2 },
    referenceLine: { fontSize: 10, marginBottom: 3, color: "#333" },
    linkLine: { fontSize: 10, marginBottom: 3, color: theme.pdf.link },
    achievementBlock: { marginBottom: 8 },
    achievementTitle: { fontSize: 11 },
    achievementMeta: { fontSize: 9, color: "#555", marginTop: 1 },
    achievementDesc: { fontSize: 9, color: "#555", marginTop: 1 },
    interestsList: {},
    interestRow: { flexDirection: "row", marginBottom: 7 },
    interestBulletMark: { fontSize: 9, color: theme.pdf.link, marginRight: 5 },
    interestText: { fontSize: 9, color: "#333", flex: 1, lineHeight: 1.4 },
    closingNote: {
      marginTop: 20,
      fontSize: 10,
      fontStyle: "italic",
      color: theme.pdf.closingNote,
      textAlign: "center",
    },
    body: { flexDirection: "row", marginTop: 4 },
    sidebarCol: { width: "34%", paddingRight: 16 },
    mainCol: { width: "66%" },
    sidebarSection: { marginBottom: 14 },
    sidebarSectionTitle: {
      fontSize: 9,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      color: "#666",
      marginBottom: 6,
    },
  });
}

export function buildCenteredPdfDocument(data: PdfLayoutData) {
  const {
    cv,
    theme,
    g,
    testimonials,
    achievements,
    hasSidebarContent,
    fullName,
    idNumber,
    address,
    email,
    phone,
    photoUrl,
  } = data;
  const styles = buildStyles(theme);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {photoUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop
            <Image src={photoUrl} style={styles.photo} />
          ) : null}
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.headline}>{g?.headline}</Text>
          <Text style={styles.summary}>{g?.summary}</Text>
          <View style={styles.contactRow}>
            {email && (
              <Link src={`mailto:${email}`} style={styles.contactPillLink}>
                {email}
              </Link>
            )}
            {phone && (
              <Link
                src={`https://wa.me/${toWhatsAppNumber(phone)}`}
                style={styles.contactPillLink}
              >
                {phone}
              </Link>
            )}
            {address && <Text style={styles.contactPill}>{address}</Text>}
            {idNumber && <Text style={styles.contactPill}>ID: {idNumber}</Text>}
          </View>
        </View>

        {g?.topSkills && g.topSkills.length > 0 && (
          <View style={[styles.section, styles.card]} wrap={false}>
            <Text style={styles.sectionTitle}>Top skills</Text>
            <View style={styles.skillsRow}>
              {g.topSkills.map((skill, i) => (
                <Text key={i} style={styles.skillPill}>
                  {skill}
                </Text>
              ))}
            </View>
          </View>
        )}

        <View style={styles.body}>
          {hasSidebarContent && (
            <View style={styles.sidebarCol}>
              {cv.interests.length > 0 && (
                <View style={[styles.sidebarSection, styles.card]} wrap={false}>
                  <Text style={styles.sidebarSectionTitle}>Interests</Text>
                  <View style={styles.interestsList}>
                    {cv.interests.map((interest, i) => (
                      <View key={i} style={styles.interestRow}>
                        <Text style={styles.interestBulletMark}>•</Text>
                        <Text style={styles.interestText}>{interest}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {cv.links.length > 0 && (
                <View style={[styles.sidebarSection, styles.card]} wrap={false}>
                  <Text style={styles.sidebarSectionTitle}>Links</Text>
                  {cv.links.map((l, i) => (
                    <Link key={i} src={l.url} style={styles.linkLine}>
                      {l.label}
                      {l.description ? ` — ${l.description}` : ""}
                    </Link>
                  ))}
                </View>
              )}
              {cv.references.length > 0 && (
                <View style={[styles.sidebarSection, styles.card]} wrap={false}>
                  <Text style={styles.sidebarSectionTitle}>References</Text>
                  {cv.references.map((r, i) => (
                    <Text key={i} style={styles.referenceLine}>
                      {r.name}
                      {r.relationship ? ` (${r.relationship})` : ""} —{" "}
                      {r.contact}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={styles.mainCol}>
            <View style={styles.sectionFlow}>
              <View
                style={[styles.sectionFlowTitleBox, styles.card]}
                wrap={false}
              >
                <Text style={styles.sectionFlowTitle}>Experience</Text>
              </View>
              {g?.experience?.map((e, i) => (
                <View
                  key={i}
                  style={[styles.entryCard, styles.card]}
                  wrap={false}
                >
                  <Text>
                    {e.role} — {e.company} ({e.period})
                  </Text>
                  {e.bullets?.map((b, j) => (
                    <Text key={j} style={styles.bullet}>
                      • {b}
                    </Text>
                  ))}
                </View>
              ))}
            </View>

            <View style={styles.sectionFlow}>
              <View
                style={[styles.sectionFlowTitleBox, styles.card]}
                wrap={false}
              >
                <Text style={styles.sectionFlowTitle}>Education</Text>
              </View>
              {g?.education?.map((e, i) => (
                <View
                  key={i}
                  style={[styles.entryCard, styles.card, styles.educationEntry]}
                  wrap={false}
                >
                  <Text>
                    ({e.period}) {e.qualification} — {e.institution}
                  </Text>
                </View>
              ))}
            </View>

            {testimonials && testimonials.length > 0 && (
              <View style={[styles.section, styles.card]} wrap={false}>
                <Text style={styles.sectionTitle}>Testimonials</Text>
                {testimonials.map((t, i) => (
                  <View key={i} style={styles.testimonial}>
                    <Text style={styles.testimonialText}>
                      &quot;{t.text}&quot;
                    </Text>
                    <Text style={styles.testimonialAuthor}>— {t.author}</Text>
                  </View>
                ))}
              </View>
            )}

            {achievements && achievements.length > 0 && (
              <View style={[styles.section, styles.card]} wrap={false}>
                <Text style={styles.sectionTitle}>Achievements</Text>
                {achievements.map((a, i) => (
                  <View key={i} style={styles.achievementBlock}>
                    <Text style={styles.achievementTitle}>
                      {a.title}
                      {"date" in a && a.date ? ` (${a.date})` : ""}
                    </Text>
                    {a.description && (
                      <Text style={styles.achievementDesc}>
                        {a.description}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {g?.closingNote && (
          <Text style={styles.closingNote}>&quot;{g.closingNote}&quot;</Text>
        )}
      </Page>
    </Document>
  );
}
