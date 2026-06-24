import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert } from "lucide-react";

export function EmergencyBanner({ count }: { count: number }) {
  return (
    <AnimatePresence>
      {count > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive"
        >
          <ShieldAlert className="h-4 w-4" />
          {count} emergency case{count === 1 ? "" : "s"} in queue — reordering applied automatically.
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
