import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Users } from "lucide-react";

interface Batch { id: string; name: string; is_partner?: boolean; access_granted?: boolean }

interface Props {
  /** Currently selected batch IDs */
  value: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  helpText?: string;
}

/**
 * Multi-select of all batches for content visibility.
 * Selecting one batch = exclusive to that batch.
 * Selecting multiple = shared with all selected batches.
 */
export default function BatchMultiSelect({ value, onChange, label = "Visible to batches", helpText }: Props) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("batches")
        .select("id, name, is_partner, access_granted")
        .order("start_date", { ascending: true });
      setBatches((data as any) || []);
      setLoading(false);
    })();
  }, []);

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id]);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2"><Users className="w-4 h-4" /> {label}</Label>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading batches…</div>
      ) : batches.length === 0 ? (
        <p className="text-sm text-muted-foreground">No batches available. Create one first.</p>
      ) : (
        <div className="space-y-2 rounded-md border border-border p-3 bg-background">
          {batches.map(b => (
            <label key={b.id} className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox checked={value.includes(b.id)} onCheckedChange={() => toggle(b.id)} />
              <span className="flex-1">{b.name}</span>
              {b.is_partner && <Badge variant="outline" className="text-[10px]">Partner</Badge>}
              {b.access_granted && <Badge variant="secondary" className="text-[10px]">Full access</Badge>}
            </label>
          ))}
        </div>
      )}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {batches.filter(b => value.includes(b.id)).map(b => (
            <Badge key={b.id} variant="default" className="text-xs">{b.name}</Badge>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {helpText ?? "Select one batch for exclusive visibility, or multiple to share. Students see content only if their batch is selected."}
      </p>
    </div>
  );
}
