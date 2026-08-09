// lib/cv-types.ts

export interface GeneratedExperienceEntry {
  company: string;
  role: string;
  period: string;
  bullets: string[];
}

export interface GeneratedEducationEntry {
  institution: string;
  qualification: string;
  period: string;
  description?: string;
}

export interface GeneratedTestimonialEntry {
  author: string;
  text: string;
}

export interface GeneratedCvContent {
  headline: string;
  summary: string;
  topSkills: string[];
  experience: GeneratedExperienceEntry[];
  education: GeneratedEducationEntry[];
  testimonialHighlights: GeneratedTestimonialEntry[];
  closingNote: string;
}

export interface GeneratedAchievementEntry {
  title: string;
  description?: string;
}

export interface GeneratedCvContent {
  headline: string;
  summary: string;
  topSkills: string[];
  experience: GeneratedExperienceEntry[];
  education: GeneratedEducationEntry[];
  testimonialHighlights: GeneratedTestimonialEntry[];
  achievementHighlights?: GeneratedAchievementEntry[]; // AI-picked/reordered subset, tailored to targetRole
  closingNote: string;
}
