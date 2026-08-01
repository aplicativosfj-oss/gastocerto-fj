import { useQuery } from "@tanstack/react-query";
import { adminGetAnnouncements } from "@/lib/admin-expansion.functions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Bell, Info, AlertTriangle, X } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function GlobalAnnouncementsBanner() {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const { data: announcements } = useQuery({
    queryKey: ["announcements", "active"],
    queryFn: () => adminGetAnnouncements(),
    // Revalidar a cada 5 minutos para novos avisos
    refetchInterval: 1000 * 60 * 5,
  });

  useEffect(() => {
    const saved = localStorage.getItem("gastocerto_dismissed_announcements");
    if (saved) setDismissed(JSON.parse(saved));
  }, []);

  const handleDismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem("gastocerto_dismissed_announcements", JSON.stringify(next));
  };

  const active = (announcements ?? []).filter(a => 
    a.active && 
    !dismissed.includes(a.id) &&
    (!a.expires_at || new Date(a.expires_at) > new Date())
  );

  if (active.length === 0) return null;

  return (
    <div className="space-y-2 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
      {active.map((announcement) => {
        const Icon = announcement.type === 'warning' ? AlertTriangle : (announcement.type === 'info' ? Info : Bell);
        return (
          <Alert 
            key={announcement.id} 
            className={cn(
              "relative border-l-4 shadow-sm",
              announcement.type === 'warning' && "border-l-warning bg-warning/5",
              announcement.type === 'info' && "border-l-brand bg-brand/5",
              announcement.type === 'critical' && "border-l-destructive bg-destructive/5"
            )}
          >
            <Icon className="size-4" />
            <AlertTitle className="text-sm font-bold pr-8">{announcement.title}</AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground mt-1">
              {announcement.content}
            </AlertDescription>
            <button 
              onClick={() => handleDismiss(announcement.id)}
              className="absolute right-3 top-3 p-1 rounded-full hover:bg-muted transition-colors"
              aria-label="Fechar aviso"
            >
              <X className="size-3.5" />
            </button>
          </Alert>
        );
      })}
    </div>
  );
}
