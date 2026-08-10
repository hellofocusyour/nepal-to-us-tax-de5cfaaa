import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Bundled worker via Vite
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface Props {
  moduleNumber: number;
  onClose: () => void;
}

const ModuleViewer = ({ moduleNumber, onClose }: Props) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [numPages, setNumPages] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPdf = async () => {
      const { data, error } = await supabase.functions.invoke("module-slides", {
        body: { module_number: moduleNumber },
      });
      const payload = data as any;
      if (error || payload?.error) {
        toast.error(payload?.error || error?.message || "Failed to load module");
        onClose();
        return;
      }
      setTitle(`Module ${payload.module.module_number}: ${payload.module.title}`);
      setPdfUrl(payload.pdf_url);
      setLoading(false);
    };
    fetchPdf();
  }, [moduleNumber]);

  // Block right-click + save shortcuts; arrow keys for nav
  useEffect(() => {
    const blockContext = (e: MouseEvent) => e.preventDefault();
    const blockKeys = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["s", "p", "u"].includes(k)) e.preventDefault();
    };
    const navKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setPageNum((p) => Math.min(p + 1, numPages || p));
      if (e.key === "ArrowLeft") setPageNum((p) => Math.max(p - 1, 1));
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("contextmenu", blockContext);
    document.addEventListener("keydown", blockKeys);
    document.addEventListener("keydown", navKey);
    return () => {
      document.removeEventListener("contextmenu", blockContext);
      document.removeEventListener("keydown", blockKeys);
      document.removeEventListener("keydown", navKey);
    };
  }, [numPages, onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col select-none">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 text-white gap-3">
        <div className="font-display font-bold truncate">{title}</div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10"
            onClick={() => setScale((s) => Math.max(0.6, +(s - 0.2).toFixed(2)))}><ZoomOut className="w-4 h-4" /></Button>
          <span className="text-xs w-10 text-center text-white/70">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10"
            onClick={() => setScale((s) => Math.min(2.4, +(s + 0.2).toFixed(2)))}><ZoomIn className="w-4 h-4" /></Button>
          <span className="text-sm text-white/70 ml-2">{numPages > 0 ? `${pageNum} / ${numPages}` : ""}</span>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto flex items-start justify-center p-4 relative"
        onContextMenu={(e) => e.preventDefault()}>
        {loading || !pdfUrl ? (
          <div className="self-center animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full" />
        ) : (
          <Document
            file={pdfUrl}
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            onLoadError={(e) => { toast.error("Failed to render PDF"); console.error(e); }}
            loading={<div className="text-white/70 mt-10">Loading…</div>}
            externalLinkTarget="_blank"
            externalLinkRel="noopener noreferrer"
          >
            <Page
              pageNumber={pageNum}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </Document>
        )}
        {!loading && pdfUrl && numPages > 0 && (
          <>
            <Button variant="ghost" size="icon"
              className="fixed left-3 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 disabled:opacity-30 bg-black/40"
              disabled={pageNum === 1}
              onClick={() => setPageNum((p) => Math.max(1, p - 1))}><ChevronLeft className="w-7 h-7" /></Button>
            <Button variant="ghost" size="icon"
              className="fixed right-3 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 disabled:opacity-30 bg-black/40"
              disabled={pageNum >= numPages}
              onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}><ChevronRight className="w-7 h-7" /></Button>
          </>
        )}
      </div>

      <footer className="px-4 py-2 text-center text-xs text-white/50 border-t border-white/10">
        View only — downloading, printing or copying are not permitted.
      </footer>
    </div>
  );
};

export default ModuleViewer;
