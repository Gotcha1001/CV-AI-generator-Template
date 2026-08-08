// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { useMutation, useQuery } from "convex/react";
// import { api } from "@/convex/_generated/api";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog"; // npx shadcn add dialog
// import Link from "next/link";
// import { motion, AnimatePresence } from "framer-motion";
// import { toast } from "sonner";
// import type { Doc } from "@/convex/_generated/dataModel";

// // Rotated while a CV is generating so the modal feels alive instead of frozen.
// const GENERATING_MESSAGES = [
//   "Reading through your experience…",
//   "Matching your background to the role…",
//   "Sharpening your bullet points…",
//   "Polishing tone and phrasing…",
//   "Almost there — finalizing your CV…",
// ];

// function GeneratingModal({ open, title }: { open: boolean; title: string }) {
//   // Starts at 0 on every mount. The parent remounts this component (via a
//   // `key` keyed on the watched CV's id) whenever the modal opens for a new
//   // CV, so there's no need to reset this from inside an effect.
//   const [messageIndex, setMessageIndex] = useState(0);

//   useEffect(() => {
//     if (!open) return;
//     // setState here happens inside the timer callback, not synchronously in
//     // the effect body, so this is the "subscribe to an external clock"
//     // pattern rather than the cascading-render anti-pattern.
//     const interval = setInterval(() => {
//       setMessageIndex((i) => (i + 1) % GENERATING_MESSAGES.length);
//     }, 2200);
//     return () => clearInterval(interval);
//   }, [open]);

//   return (
//     <Dialog open={open}>
//       {/* No onOpenChange — this closes itself when Convex reports the
//           CV is no longer "generating", not from a user click. */}
//       <DialogContent
//         className="sm:max-w-md text-center"
//         onInteractOutside={(e) => e.preventDefault()}
//         onEscapeKeyDown={(e) => e.preventDefault()}
//       >
//         <DialogHeader>
//           <DialogTitle className="text-center">
//             Generating &quot;{title}&quot;
//           </DialogTitle>
//         </DialogHeader>

//         <div className="flex flex-col items-center gap-6 py-6">
//           {/* Pulsing rings around a document icon */}
//           <div className="relative h-20 w-20 flex items-center justify-center">
//             {[0, 1, 2].map((ring) => (
//               <motion.span
//                 key={ring}
//                 className="absolute inset-0 rounded-full border-2 border-amber-500"
//                 initial={{ opacity: 0.6, scale: 0.6 }}
//                 animate={{ opacity: 0, scale: 1.6 }}
//                 transition={{
//                   duration: 1.8,
//                   repeat: Infinity,
//                   delay: ring * 0.6,
//                   ease: "easeOut",
//                 }}
//               />
//             ))}
//             <div className="h-12 w-12 rounded-full bg-amber-600 flex items-center justify-center text-white text-xl">
//               ✦
//             </div>
//           </div>

//           {/* Cycling status line */}
//           <div className="h-5 relative w-full">
//             <AnimatePresence mode="wait">
//               <motion.p
//                 key={messageIndex}
//                 initial={{ opacity: 0, y: 6 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 exit={{ opacity: 0, y: -6 }}
//                 transition={{ duration: 0.3 }}
//                 className="text-sm text-muted-foreground absolute inset-x-0"
//               >
//                 {GENERATING_MESSAGES[messageIndex]}
//               </motion.p>
//             </AnimatePresence>
//           </div>

//           {/* Indeterminate progress shimmer */}
//           <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
//             <motion.div
//               className="h-full w-1/3 rounded-full bg-amber-600"
//               animate={{ x: ["-100%", "220%"] }}
//               transition={{
//                 duration: 1.4,
//                 repeat: Infinity,
//                 ease: "easeInOut",
//               }}
//             />
//           </div>

//           <p className="text-xs text-muted-foreground">
//             Please be patient — this usually takes under a minute.
//           </p>
//         </div>
//       </DialogContent>
//     </Dialog>
//   );
// }

// export default function MyCvsPage() {
//   const cvs = useQuery(api.cvs.listMyCvs);
//   const deleteCv = useMutation(api.cvs.deleteCv);

//   // Track which CV's generating-modal the user explicitly picked (only
//   // relevant when more than one CV is generating at once).
//   const [watchingId, setWatchingId] = useState<string | null>(null);

//   const generatingCvs = useMemo(
//     () => (cvs ?? []).filter((cv) => cv.status === "generating"),
//     [cvs],
//   );

//   // Derived, not synced: if the explicit pick is (still) generating, use it;
//   // otherwise fall back to whichever CV is generating first. No effect
//   // needed — this recomputes on every render from data we already have, and
//   // naturally "closes" itself once generatingCvs empties out.
//   const activeWatchedId =
//     watchingId && generatingCvs.some((cv) => cv._id === watchingId)
//       ? watchingId
//       : (generatingCvs[0]?._id ?? null);

//   const watchedCv = generatingCvs.find((cv) => cv._id === activeWatchedId);

//   function copyLink(shareId: string) {
//     const url = `${window.location.origin}/cv/${shareId}`;
//     navigator.clipboard.writeText(url);
//     toast.success("Link copied");
//   }

//   return (
//     <div className="max-w-3xl mx-auto space-y-4">
//       <h1 className="text-2xl font-semibold text-[#12213A] dark:text-[#F6F1E7]">
//         My CVs
//       </h1>

//       {cvs?.length === 0 && (
//         <p className="text-muted-foreground">
//           No CVs yet — create your first one.
//         </p>
//       )}

//       {cvs?.map((cv: Doc<"cvs">) => {
//         const isGenerating = cv.status === "generating";

//         return (
//           <motion.div
//             key={cv._id}
//             animate={isGenerating ? { opacity: [1, 0.6, 1] } : { opacity: 1 }}
//             transition={
//               isGenerating
//                 ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
//                 : undefined
//             }
//             className={`border rounded-xl p-4 flex items-center justify-between ${
//               isGenerating ? "border-amber-500/60 bg-amber-500/5" : ""
//             }`}
//           >
//             <div>
//               <p className="font-medium">{cv.title}</p>
//               <Badge
//                 variant={
//                   cv.status === "ready"
//                     ? "default"
//                     : cv.status === "failed"
//                       ? "destructive"
//                       : "secondary"
//                 }
//                 className={isGenerating ? "animate-pulse" : ""}
//               >
//                 {cv.status}
//               </Badge>
//             </div>

//             <div className="flex gap-2">
//               {cv.status === "ready" && (
//                 <>
//                   <a
//                     href={`/cv/${cv.shareId}`}
//                     target="_blank"
//                     rel="noreferrer"
//                   >
//                     <Button size="sm" variant="outline">
//                       Open
//                     </Button>
//                   </a>
//                   <Button
//                     size="sm"
//                     variant="outline"
//                     onClick={() => copyLink(cv.shareId)}
//                   >
//                     Copy link
//                   </Button>
//                 </>
//               )}

//               {isGenerating && (
//                 <Button
//                   size="sm"
//                   variant="outline"
//                   className="animate-pulse"
//                   onClick={() => setWatchingId(cv._id)}
//                 >
//                   Generating…
//                 </Button>
//               )}

//               {/* Edit is always available — jumps to the create form with
//                   ?cvId=, which pre-populates every field via existingCv. */}
//               <Link href={`/dashboard/create?cvId=${cv._id}`}>
//                 <Button size="sm" variant="outline">
//                   Edit
//                 </Button>
//               </Link>

//               <Button
//                 size="sm"
//                 variant="destructive"
//                 onClick={() => {
//                   if (confirm("Delete this CV permanently?"))
//                     deleteCv({ cvId: cv._id });
//                 }}
//               >
//                 Delete
//               </Button>
//             </div>
//           </motion.div>
//         );
//       })}

//       <GeneratingModal
//         key={watchedCv?._id ?? "none"}
//         open={!!watchedCv}
//         title={watchedCv?.title ?? ""}
//       />
//     </div>
//   );
// }

"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"; // npx shadcn add dialog
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { Doc } from "@/convex/_generated/dataModel";

// Rotated while a CV is generating so the modal feels alive instead of frozen.
const GENERATING_MESSAGES = [
  "Reading through your experience…",
  "Matching your background to the role…",
  "Sharpening your bullet points…",
  "Polishing tone and phrasing…",
  "Almost there — finalizing your CV…",
];

function GeneratingModal({ open, title }: { open: boolean; title: string }) {
  // Starts at 0 on every mount. The parent remounts this component (via a
  // `key` keyed on the watched CV's id) whenever the modal opens for a new
  // CV, so there's no need to reset this from inside an effect.
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    // setState here happens inside the timer callback, not synchronously in
    // the effect body, so this is the "subscribe to an external clock"
    // pattern rather than the cascading-render anti-pattern.
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % GENERATING_MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [open]);

  return (
    <Dialog open={open}>
      {/* No onOpenChange — this closes itself when Convex reports the
          CV is no longer "generating", not from a user click. */}
      <DialogContent
        className="sm:max-w-md text-center"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center">
            Generating &quot;{title}&quot;
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-6">
          {/* Pulsing rings around a document icon */}
          <div className="relative h-20 w-20 flex items-center justify-center">
            {[0, 1, 2].map((ring) => (
              <motion.span
                key={ring}
                className="absolute inset-0 rounded-full border-2 border-amber-500"
                initial={{ opacity: 0.6, scale: 0.6 }}
                animate={{ opacity: 0, scale: 1.6 }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  delay: ring * 0.6,
                  ease: "easeOut",
                }}
              />
            ))}
            <div className="h-12 w-12 rounded-full bg-amber-600 flex items-center justify-center text-white text-xl">
              ✦
            </div>
          </div>

          {/* Cycling status line */}
          <div className="h-5 relative w-full">
            <AnimatePresence mode="wait">
              <motion.p
                key={messageIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="text-sm text-muted-foreground absolute inset-x-0"
              >
                {GENERATING_MESSAGES[messageIndex]}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Indeterminate progress shimmer */}
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full w-1/3 rounded-full bg-amber-600"
              animate={{ x: ["-100%", "220%"] }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Please be patient — this usually takes under a minute.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function MyCvsPage() {
  const cvs = useQuery(api.cvs.listMyCvs);
  const deleteCv = useMutation(api.cvs.deleteCv);

  // Track which CV's generating-modal the user explicitly picked (only
  // relevant when more than one CV is generating at once).
  const [watchingId, setWatchingId] = useState<string | null>(null);

  const generatingCvs = useMemo(
    () => (cvs ?? []).filter((cv) => cv.status === "generating"),
    [cvs],
  );

  // Derived, not synced: if the explicit pick is (still) generating, use it;
  // otherwise fall back to whichever CV is generating first. No effect
  // needed — this recomputes on every render from data we already have, and
  // naturally "closes" itself once generatingCvs empties out.
  const activeWatchedId =
    watchingId && generatingCvs.some((cv) => cv._id === watchingId)
      ? watchingId
      : (generatingCvs[0]?._id ?? null);

  const watchedCv = generatingCvs.find((cv) => cv._id === activeWatchedId);

  function copyLink(shareId: string) {
    const url = `${window.location.origin}/cv/${shareId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden">
      {/* Full-bleed background photo, faded so text stays readable —
          matches the dashboard page treatment exactly. `isolate` pins a
          local stacking context so the -z-10 layers below stay behind
          this page's content but don't escape behind the dashboard
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

      <div className="relative z-10 max-w-3xl mx-auto space-y-4 px-6 pt-16 pb-20">
        <h1 className="text-2xl font-semibold text-[#12213A] dark:text-[#F6F1E7]">
          My CVs
        </h1>

        {cvs?.length === 0 && (
          <p className="text-muted-foreground">
            No CVs yet — create your first one.
          </p>
        )}

        {cvs?.map((cv: Doc<"cvs">) => {
          const isGenerating = cv.status === "generating";

          return (
            <motion.div
              key={cv._id}
              animate={isGenerating ? { opacity: [1, 0.6, 1] } : { opacity: 1 }}
              transition={
                isGenerating
                  ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                  : undefined
              }
              className={`border rounded-xl p-4 flex items-center justify-between bg-white/60 dark:bg-white/5 ${
                isGenerating ? "border-amber-500/60 bg-amber-500/5" : ""
              }`}
            >
              <div>
                <p className="font-medium">{cv.title}</p>
                <Badge
                  variant={
                    cv.status === "ready"
                      ? "default"
                      : cv.status === "failed"
                        ? "destructive"
                        : "secondary"
                  }
                  className={isGenerating ? "animate-pulse" : ""}
                >
                  {cv.status}
                </Badge>
              </div>

              <div className="flex gap-2">
                {cv.status === "ready" && (
                  <>
                    <a
                      href={`/cv/${cv.shareId}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button size="sm" variant="outline">
                        Open
                      </Button>
                    </a>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyLink(cv.shareId)}
                    >
                      Copy link
                    </Button>
                  </>
                )}

                {isGenerating && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="animate-pulse"
                    onClick={() => setWatchingId(cv._id)}
                  >
                    Generating…
                  </Button>
                )}

                {/* Edit is always available — jumps to the create form with
                    ?cvId=, which pre-populates every field via existingCv. */}
                <Link href={`/dashboard/create?cvId=${cv._id}`}>
                  <Button size="sm" variant="outline">
                    Edit
                  </Button>
                </Link>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (confirm("Delete this CV permanently?"))
                      deleteCv({ cvId: cv._id });
                  }}
                >
                  Delete
                </Button>
              </div>
            </motion.div>
          );
        })}

        <GeneratingModal
          key={watchedCv?._id ?? "none"}
          open={!!watchedCv}
          title={watchedCv?.title ?? ""}
        />
      </div>
    </div>
  );
}
