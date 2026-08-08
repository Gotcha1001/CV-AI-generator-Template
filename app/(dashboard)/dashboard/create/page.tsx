"use client";

import { Suspense, useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox"; // npx shadcn add checkbox
import { MediaUpload } from "@/app/components/media-upload";
import { StyleSelect } from "@/app/components/style-select";
import { DEFAULT_CV_STYLE_ID } from "@/lib/styles";
import { LayoutSelect } from "@/app/components/layout-select";
import { DEFAULT_CV_LAYOUT_ID } from "@/lib/layouts";
import { toast } from "sonner";
import Image from "next/image";
import type { Id } from "@/convex/_generated/dataModel";

type FormValues = {
  title: string;
  targetRole: string;
  isNeutral: boolean;
  style: string;
  layout: string;
  personalInfo: {
    fullName: string;
    idNumber: string;
    address: string;
    email: string;
    phone: string;
    photoUrl: string;
    videoUrl: string;
  };
  education: {
    institution: string;
    qualification: string;
    startDate: string;
    endDate: string;
    description: string;
  }[];

  experience: {
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    current: boolean;
    description: string;
  }[];

  testimonials: { author: string; authorRole: string; text: string }[];
  references: { name: string; relationship: string; contact: string }[];
  links: { label: string; url: string; description: string }[];
  achievements: { title: string; description: string; date: string }[];
  interests: string;
};

const EMPTY_DEFAULTS: FormValues = {
  title: "",
  targetRole: "",
  isNeutral: false,
  style: DEFAULT_CV_STYLE_ID,
  layout: DEFAULT_CV_LAYOUT_ID,
  personalInfo: {
    fullName: "",
    idNumber: "",
    address: "",
    email: "",
    phone: "",
    photoUrl: "",
    videoUrl: "",
  },
  education: [
    {
      institution: "",
      qualification: "",
      startDate: "",
      endDate: "",
      description: "",
    },
  ],
  experience: [
    {
      company: "",
      role: "",
      startDate: "",
      endDate: "",
      current: false,
      description: "",
    },
  ],
  testimonials: [{ author: "", authorRole: "", text: "" }],
  references: [{ name: "", relationship: "", contact: "" }],
  links: [{ label: "", url: "", description: "" }],
  achievements: [{ title: "", description: "", date: "" }],
  interests: "",
};

// Shared card shell, matched to the landing page's demo card: soft border,
// translucent fill so the background photo still reads through, and a
// rounded-2xl radius instead of the old rounded-xl/border-only look.
const SECTION_CLASS =
  "space-y-3 rounded-2xl border border-zinc-900/10 dark:border-white/10 bg-white/60 dark:bg-white/5 p-5";

function CreateCvForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cvId = searchParams.get("cvId") as Id<"cvs"> | null;
  const isEditing = !!cvId;

  // "skip" when there's no cvId — this is a brand-new CV, nothing to fetch.
  const existingCv = useQuery(api.cvs.getCv, cvId ? { cvId } : "skip");
  const upsertCv = useMutation(api.cvs.upsertCv);
  const generateCv = useAction(api.ai.generateCv);
  const [submitting, setSubmitting] = useState(false);

  const { register, control, handleSubmit, watch, setValue, reset } =
    useForm<FormValues>({ defaultValues: EMPTY_DEFAULTS });

  // Pre-populate every field (including photo/video URLs) once the existing
  // CV loads. Runs once per load — reset() replaces the whole form state,
  // it isn't merged, so this only fires when existingCv actually changes.
  useEffect(() => {
    if (!existingCv) return;
    reset({
      title: existingCv.title,
      targetRole: existingCv.targetRole ?? "",
      isNeutral: existingCv.isNeutral,
      style: existingCv.style ?? DEFAULT_CV_STYLE_ID,
      layout: existingCv.layout ?? DEFAULT_CV_LAYOUT_ID,
      personalInfo: {
        fullName: existingCv.personalInfo.fullName,
        idNumber: existingCv.personalInfo.idNumber ?? "",
        address: existingCv.personalInfo.address ?? "",
        email: existingCv.personalInfo.email,
        phone: existingCv.personalInfo.phone ?? "",
        photoUrl: existingCv.personalInfo.photoUrl ?? "",
        videoUrl: existingCv.personalInfo.videoUrl ?? "",
      },
      education: existingCv.education.length
        ? existingCv.education.map((e) => ({
            institution: e.institution,
            qualification: e.qualification,
            startDate: e.startDate,
            endDate: e.endDate ?? "",
            description: e.description ?? "",
          }))
        : EMPTY_DEFAULTS.education,
      experience: existingCv.experience.length
        ? existingCv.experience.map((e) => ({
            company: e.company,
            role: e.role,
            startDate: e.startDate,
            endDate: e.endDate ?? "",
            current: e.current,
            description: e.description ?? "",
          }))
        : EMPTY_DEFAULTS.experience,
      testimonials: existingCv.testimonials.length
        ? existingCv.testimonials.map((t) => ({
            author: t.author,
            authorRole: t.authorRole ?? "",
            text: t.text,
          }))
        : EMPTY_DEFAULTS.testimonials,
      references: existingCv.references.length
        ? existingCv.references.map((r) => ({
            name: r.name,
            relationship: r.relationship ?? "",
            contact: r.contact,
          }))
        : EMPTY_DEFAULTS.references,
      links: existingCv.links.length
        ? existingCv.links.map((l) => ({
            label: l.label,
            url: l.url,
            description: l.description ?? "",
          }))
        : EMPTY_DEFAULTS.links,
      achievements: existingCv.achievements.length
        ? existingCv.achievements.map((a) => ({
            title: a.title,
            description: a.description ?? "",
            date: a.date ?? "",
          }))
        : EMPTY_DEFAULTS.achievements,
      interests: existingCv.interests.join(", "),
    });
  }, [existingCv, reset]);

  const edu = useFieldArray({ control, name: "education" });
  const exp = useFieldArray({ control, name: "experience" });
  const tst = useFieldArray({ control, name: "testimonials" });
  const ref = useFieldArray({ control, name: "references" });
  const lnk = useFieldArray({ control, name: "links" });
  const ach = useFieldArray({ control, name: "achievements" });

  const isNeutral = watch("isNeutral");
  const photoUrl = watch("personalInfo.photoUrl");
  const videoUrl = watch("personalInfo.videoUrl");
  const style = watch("style");
  const layout = watch("layout");

  // cvId is in the URL but the query hasn't resolved yet — block submit so
  // we never save a still-empty form over a real CV before it's finished
  // loading.
  const stillLoadingExisting = isEditing && existingCv === undefined;

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const savedId = await upsertCv({
        ...values,
        interests: values.interests
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        cvId: cvId ?? undefined,
        title:
          values.title ||
          (values.isNeutral ? "General CV" : `${values.targetRole} CV`),
        targetRole: values.isNeutral ? undefined : values.targetRole,
        isNeutral: values.isNeutral,
        style: values.style,
        layout: values.layout,
        personalInfo: values.personalInfo,
        education: values.education,
        experience: values.experience,
        testimonials: values.testimonials,
        references: values.references,
      });
      toast.success(
        isEditing
          ? "Saved — regenerating your tailored CV…"
          : "Saved — generating your tailored CV…",
      );
      // Edits change the source data, so the AI content is stale — always
      // re-run generation on save, same as create.
      generateCv({ cvId: savedId }).catch(() =>
        toast.error("AI generation failed — you can retry from My CVs"),
      );
      router.push("/dashboard/cvs");
    } finally {
      setSubmitting(false);
    }
  }

  // cvId given but getCv came back null — not found, or not this user's CV.
  if (isEditing && existingCv === null) {
    return (
      <div className="max-w-3xl mx-auto py-20 px-4 text-center text-zinc-900/60 dark:text-white/60">
        CV not found, or you don&apos;t have access to it.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="relative z-10 max-w-3xl mx-auto space-y-8 px-6 pt-16 pb-20"
    >
      <div>
        <p className="text-sm font-medium tracking-wide uppercase text-purple-600 dark:text-purple-400">
          {isEditing ? "Update your details" : "One profile, any role"}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-medium tracking-tight text-zinc-900 dark:text-white">
          {isEditing ? "Edit CV" : "Create a CV"}
        </h1>
        <p className="mt-2 text-sm text-zinc-900/70 dark:text-white/70">
          {isEditing
            ? "Update your details — we'll regenerate the tailored content on save."
            : "Fill this in once — reuse it for every application."}
        </p>
      </div>

      {/* Target job */}
      <section className={SECTION_CLASS}>
        <Label className="text-zinc-900 dark:text-white">
          Internal label (optional)
        </Label>
        <Input
          {...register("title")}
          placeholder="e.g. Web Designer application"
        />
        <div className="flex items-center gap-2">
          <Checkbox {...register("isNeutral")} id="isNeutral" />
          <Label htmlFor="isNeutral" className="text-zinc-900 dark:text-white">
            Make this a neutral, general-purpose CV
          </Label>
        </div>
        {!isNeutral && (
          <div>
            <Label className="text-zinc-900 dark:text-white">
              Target job / role
            </Label>
            <Input
              {...register("targetRole")}
              placeholder="e.g. Web Designer"
              required={!isNeutral}
            />
          </div>
        )}

        <div>
          <Label className="text-zinc-900 dark:text-white">Color style</Label>
          <StyleSelect
            value={style}
            onValueChange={(id) => setValue("style", id, { shouldDirty: true })}
          />
        </div>
        <div>
          <Label className="text-zinc-900 dark:text-white">Layout</Label>
          <LayoutSelect
            value={layout}
            onValueChange={(id) =>
              setValue("layout", id, { shouldDirty: true })
            }
          />
        </div>
      </section>

      {/* Personal info */}
      <section className={SECTION_CLASS}>
        <h2 className="font-[family-name:var(--font-display)] text-lg text-zinc-900 dark:text-white">
          Personal & contact info
        </h2>
        <Input
          {...register("personalInfo.fullName")}
          placeholder="Full name"
          required
        />
        <Input {...register("personalInfo.idNumber")} placeholder="ID number" />
        <Input {...register("personalInfo.address")} placeholder="Address" />
        <Input
          {...register("personalInfo.email")}
          placeholder="Email"
          type="email"
          required
        />
        <Input {...register("personalInfo.phone")} placeholder="Phone" />

        <div className="flex flex-wrap items-center gap-3">
          <MediaUpload
            label={photoUrl ? "Replace photo" : "Upload photo"}
            accept="image/*"
            onUploaded={(url) =>
              setValue("personalInfo.photoUrl", url, { shouldDirty: true })
            }
          />
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt="Current photo"
              className="h-12 w-12 rounded-full object-cover border border-zinc-900/10 dark:border-white/10"
            />
          )}

          <MediaUpload
            label={videoUrl ? "Replace intro video" : "Upload intro video"}
            accept="video/*"
            onUploaded={(url) =>
              setValue("personalInfo.videoUrl", url, { shouldDirty: true })
            }
          />
          {videoUrl && (
            <div className="flex items-center gap-2">
              <video
                src={videoUrl}
                className="h-12 w-20 rounded-md object-cover border border-zinc-900/10 dark:border-white/10 bg-black"
                muted
                loop
                autoPlay
                playsInline
                // Silently falls back to a blank box if the browser can't
                // decode the thumbnail frame — not worth surfacing an error
                // for what's just a small preview.
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <span className="text-xs text-zinc-900/60 dark:text-white/60">
                Video attached ✓
              </span>
            </div>
          )}
        </div>

        <input type="hidden" {...register("personalInfo.photoUrl")} />
        <input type="hidden" {...register("personalInfo.videoUrl")} />
      </section>

      {/* Education */}
      <section className={SECTION_CLASS}>
        <div className="flex justify-between items-center">
          <h2 className="font-[family-name:var(--font-display)] text-lg text-zinc-900 dark:text-white">
            Education
          </h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-zinc-900/20 dark:border-white/20 text-zinc-900 dark:text-white hover:border-purple-600 hover:text-purple-600 dark:hover:border-purple-400 dark:hover:text-purple-400"
            onClick={() =>
              edu.append({
                institution: "",
                qualification: "",
                startDate: "",
                endDate: "",
                description: "",
              })
            }
          >
            + Add
          </Button>
        </div>
        {edu.fields.map((f, i) => (
          <div
            key={f.id}
            className="grid grid-cols-2 gap-2 border-t border-dashed border-zinc-900/20 dark:border-white/20 pt-3"
          >
            <Input
              {...register(`education.${i}.institution`)}
              placeholder="Institution"
            />
            <Input
              {...register(`education.${i}.qualification`)}
              placeholder="Qualification"
            />
            <Input
              {...register(`education.${i}.startDate`)}
              placeholder="Start (e.g. 2018)"
            />
            <Input
              {...register(`education.${i}.endDate`)}
              placeholder="End (e.g. 2021)"
            />
            <Textarea
              className="col-span-2"
              {...register(`education.${i}.description`)}
              placeholder="Notes"
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-zinc-900/70 dark:text-white/70 hover:text-purple-600 dark:hover:text-purple-400"
              onClick={() => edu.remove(i)}
            >
              Remove
            </Button>
          </div>
        ))}
      </section>

      {/* Experience */}
      <section className={SECTION_CLASS}>
        <div className="flex justify-between items-center">
          <h2 className="font-[family-name:var(--font-display)] text-lg text-zinc-900 dark:text-white">
            Work experience
          </h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-zinc-900/20 dark:border-white/20 text-zinc-900 dark:text-white hover:border-purple-600 hover:text-purple-600 dark:hover:border-purple-400 dark:hover:text-purple-400"
            onClick={() =>
              exp.append({
                company: "",
                role: "",
                startDate: "",
                endDate: "",
                current: false,
                description: "",
              })
            }
          >
            + Add
          </Button>
        </div>
        {exp.fields.map((f, i) => (
          <div
            key={f.id}
            className="grid grid-cols-2 gap-2 border-t border-dashed border-zinc-900/20 dark:border-white/20 pt-3"
          >
            <Input
              {...register(`experience.${i}.company`)}
              placeholder="Company"
            />
            <Input {...register(`experience.${i}.role`)} placeholder="Role" />
            <Input
              {...register(`experience.${i}.startDate`)}
              placeholder="Start"
            />
            <Input {...register(`experience.${i}.endDate`)} placeholder="End" />
            <Textarea
              className="col-span-2"
              {...register(`experience.${i}.description`)}
              placeholder="What you did, achievements"
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-zinc-900/70 dark:text-white/70 hover:text-purple-600 dark:hover:text-purple-400"
              onClick={() => exp.remove(i)}
            >
              Remove
            </Button>
          </div>
        ))}
      </section>

      {/* Testimonials */}
      <section className={SECTION_CLASS}>
        <div className="flex justify-between items-center">
          <h2 className="font-[family-name:var(--font-display)] text-lg text-zinc-900 dark:text-white">
            Testimonials
          </h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-zinc-900/20 dark:border-white/20 text-zinc-900 dark:text-white hover:border-purple-600 hover:text-purple-600 dark:hover:border-purple-400 dark:hover:text-purple-400"
            onClick={() => tst.append({ author: "", authorRole: "", text: "" })}
          >
            + Add
          </Button>
        </div>
        {tst.fields.map((f, i) => (
          <div
            key={f.id}
            className="grid grid-cols-2 gap-2 border-t border-dashed border-zinc-900/20 dark:border-white/20 pt-3"
          >
            <Input
              {...register(`testimonials.${i}.author`)}
              placeholder="Author name"
            />
            <Input
              {...register(`testimonials.${i}.authorRole`)}
              placeholder="Their role"
            />
            <Textarea
              className="col-span-2"
              {...register(`testimonials.${i}.text`)}
              placeholder="Quote"
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-zinc-900/70 dark:text-white/70 hover:text-purple-600 dark:hover:text-purple-400"
              onClick={() => tst.remove(i)}
            >
              Remove
            </Button>
          </div>
        ))}
      </section>

      {/* References */}
      <section className={SECTION_CLASS}>
        <div className="flex justify-between items-center">
          <h2 className="font-[family-name:var(--font-display)] text-lg text-zinc-900 dark:text-white">
            References
          </h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-zinc-900/20 dark:border-white/20 text-zinc-900 dark:text-white hover:border-purple-600 hover:text-purple-600 dark:hover:border-purple-400 dark:hover:text-purple-400"
            onClick={() =>
              ref.append({ name: "", relationship: "", contact: "" })
            }
          >
            + Add
          </Button>
        </div>
        {ref.fields.map((f, i) => (
          <div
            key={f.id}
            className="grid grid-cols-3 gap-2 border-t border-dashed border-zinc-900/20 dark:border-white/20 pt-3"
          >
            <Input {...register(`references.${i}.name`)} placeholder="Name" />
            <Input
              {...register(`references.${i}.relationship`)}
              placeholder="Relationship"
            />
            <Input
              {...register(`references.${i}.contact`)}
              placeholder="Contact"
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-zinc-900/70 dark:text-white/70 hover:text-purple-600 dark:hover:text-purple-400"
              onClick={() => ref.remove(i)}
            >
              Remove
            </Button>
          </div>
        ))}
      </section>
      {/* Links */}
      <section className={SECTION_CLASS}>
        <div className="flex justify-between items-center">
          <h2 className="font-[family-name:var(--font-display)] text-lg text-zinc-900 dark:text-white">
            Links
          </h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-zinc-900/20 dark:border-white/20 text-zinc-900 dark:text-white hover:border-purple-600 hover:text-purple-600 dark:hover:border-purple-400 dark:hover:text-purple-400"
            onClick={() => lnk.append({ label: "", url: "", description: "" })}
          >
            + Add
          </Button>
        </div>
        {lnk.fields.map((f, i) => (
          <div
            key={f.id}
            className="grid grid-cols-2 gap-2 border-t border-dashed border-zinc-900/20 dark:border-white/20 pt-3"
          >
            <Input
              {...register(`links.${i}.label`)}
              placeholder="Label (e.g. Portfolio, GitHub, LinkedIn)"
            />
            <Input
              {...register(`links.${i}.url`)}
              placeholder="https://..."
              type="url"
            />
            <Textarea
              className="col-span-2"
              {...register(`links.${i}.description`)}
              placeholder="What's here (optional)"
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-zinc-900/70 dark:text-white/70 hover:text-purple-600 dark:hover:text-purple-400"
              onClick={() => lnk.remove(i)}
            >
              Remove
            </Button>
          </div>
        ))}
      </section>

      {/* Achievements */}
      <section className={SECTION_CLASS}>
        <div className="flex justify-between items-center">
          <h2 className="font-[family-name:var(--font-display)] text-lg text-zinc-900 dark:text-white">
            Achievements
          </h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-zinc-900/20 dark:border-white/20 text-zinc-900 dark:text-white hover:border-purple-600 hover:text-purple-600 dark:hover:border-purple-400 dark:hover:text-purple-400"
            onClick={() => ach.append({ title: "", description: "", date: "" })}
          >
            + Add
          </Button>
        </div>
        {ach.fields.map((f, i) => (
          <div
            key={f.id}
            className="grid grid-cols-2 gap-2 border-t border-dashed border-zinc-900/20 dark:border-white/20 pt-3"
          >
            <Input
              {...register(`achievements.${i}.title`)}
              placeholder="Achievement (e.g. Won Regional UX Hackathon)"
            />
            <Input
              {...register(`achievements.${i}.date`)}
              placeholder="Date (optional)"
            />
            <Textarea
              className="col-span-2"
              {...register(`achievements.${i}.description`)}
              placeholder="Details (optional)"
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-zinc-900/70 dark:text-white/70 hover:text-purple-600 dark:hover:text-purple-400"
              onClick={() => ach.remove(i)}
            >
              Remove
            </Button>
          </div>
        ))}
      </section>

      {/* Interests */}
      <section className={SECTION_CLASS}>
        <h2 className="font-[family-name:var(--font-display)] text-lg text-zinc-900 dark:text-white">
          Interests
        </h2>
        <Input
          {...register("interests")}
          placeholder="Chess, open-source, trail running (comma separated)"
        />
      </section>

      <Button
        type="submit"
        disabled={submitting || stillLoadingExisting}
        className="w-full py-6 text-base bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/30"
      >
        {stillLoadingExisting
          ? "Loading CV…"
          : submitting
            ? "Saving…"
            : isEditing
              ? "Save changes & regenerate"
              : "Save & generate CV"}
      </Button>
    </form>
  );
}

export default function CreateCvPage() {
  // useSearchParams() needs a Suspense boundary around it.
  return (
    <div className="relative isolate min-h-screen overflow-hidden">
      {/* Full-bleed background photo, faded so text stays readable —
          matches the landing page treatment exactly.
          `isolate` pins a local stacking context so the -z-10 layers below
          stay behind the form but don't escape behind the dashboard
          layout's own background. */}
      <Image
        src="/cvcolleague.jpg"
        alt=""
        fill
        priority
        className="object-cover opacity-20 dark:opacity-10 -z-10 pointer-events-none select-none"
      />
      {/* Soft purple/indigo wash over the photo for depth in both themes.
          Light mode gets its own darker wash (rather than falling through
          to `transparent`) — a low-opacity photo on white reads as washed
          out, so the wash carries most of the depth and the image opacity
          above is raised too so it doesn't disappear entirely. */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-950/30 via-slate-900/20 to-purple-950/35 dark:from-indigo-950/40 dark:via-black/60 dark:to-purple-950/30 pointer-events-none" />

      <Suspense fallback={null}>
        <CreateCvForm />
      </Suspense>
    </div>
  );
}
