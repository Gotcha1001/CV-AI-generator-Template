import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InterludeAudioToggle({
  muted,
  onToggle,
}: {
  muted: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={onToggle}
      className="fixed bottom-6 right-6 rounded-full shadow-lg z-50 backdrop-blur"
      aria-label={muted ? "Unmute interlude track" : "Mute interlude track"}
      title={muted ? "Unmute interlude track" : "Mute interlude track"}
    >
      {muted ? (
        <VolumeX className="h-4 w-4" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
    </Button>
  );
}
