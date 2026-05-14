import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  moduleNumber: number;
  onClose: () => void;
}

interface Slide { signedUrl: string; path: string; }

const ModuleViewer = ({ moduleNumber, onClose }: Props) => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [title, setTitle] = useState("");
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSlides = async () => {
      const { data, error } = await supabase.functions.invoke("module-slides", {
        body: { module_number: moduleNumber },
      });
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error || error?.message || "Failed to load slides");
        onClose();
        return;
      }
      setTitle(`Module ${(data as any).module.module_number}: ${(data as any).module.title}`);
      setSlides(((data as any).slides || []).filter((s: any) => s.signedUrl));
      setLoading(false);
    };
    fetchSlides();
  }, [moduleNumber]);

  // Disable right-click + common save shortcuts inside viewer
  useEffect(() => {
    const blockContext = (e: MouseEvent) => e.preventDefault();
    const blockKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["s", "p", "u"].includes(e.key.toLowerCase())) e.preventDefault();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIdx((i) => Math.min(i + 1, slides.length - 1));
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(i - 1, 0));
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("contextmenu", blockContext);
    document.addEventListener("keydown", blockKeys);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("contextmenu", blockContext);
      document.removeEventListener("keydown", blockKeys);
      document.removeEventListener("keydown", onKey);
    };
  }, [slides, onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col select-none">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 text-white">
        <div className="font-display font-bold truncate">{title}</div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/70">{slides.length > 0 ? `${idx + 1} / ${slides.length}` : ""}</span>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10"><X className="w-5 h-5" /></Button>
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {loading ? (
          <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full" />
        ) : slides.length === 0 ? (
          <div className="text-white/70">No slides available.</div>
        ) : (
          <>
            <img
              src={slides[idx].signedUrl}
              alt={`Slide ${idx + 1}`}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              className="max-h-full max-w-full object-contain pointer-events-none"
              style={{ WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" }}
            />
            {/* invisible overlay to swallow right-clicks on top of image */}
            <div className="absolute inset-0" onContextMenu={(e) => e.preventDefault()} />
            <Button
              variant="ghost" size="icon"
              className="absolute left-3 text-white hover:bg-white/10 disabled:opacity-30"
              disabled={idx === 0}
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
            ><ChevronLeft className="w-7 h-7" /></Button>
            <Button
              variant="ghost" size="icon"
              className="absolute right-3 text-white hover:bg-white/10 disabled:opacity-30"
              disabled={idx >= slides.length - 1}
              onClick={() => setIdx((i) => Math.min(slides.length - 1, i + 1))}
            ><ChevronRight className="w-7 h-7" /></Button>
          </>
        )}
      </div>
      <footer className="px-4 py-2 text-center text-xs text-white/50 border-t border-white/10">
        View only — downloading, copying or screenshots are not permitted.
      </footer>
    </div>
  );
};

export default ModuleViewer;
