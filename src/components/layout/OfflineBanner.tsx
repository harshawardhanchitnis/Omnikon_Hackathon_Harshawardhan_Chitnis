import { CloudOff, Wifi } from "lucide-react";
import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);
  if (online) return null;
  return (
    <div
      className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-center text-xs font-bold text-amber-900"
      role="status"
    >
      <CloudOff className="size-4" aria-hidden="true" />
      Offline mode: drafts and teaching notes stay saved on this device.
      <Wifi className="size-3" aria-hidden="true" />
    </div>
  );
}
