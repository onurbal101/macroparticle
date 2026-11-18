import { useId, useState, type ReactNode } from "react";
import { m as motion, useReducedMotion } from "motion/react";
import { ChevronRight } from "lucide-react";

export function Disclosure({ label, className, children }: {
  label: ReactNode;
  className: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  const reducedMotion = useReducedMotion();
  const transition = { duration: reducedMotion ? 0 : 0.24, ease: "easeInOut" as const };

  return (
    <div className={className}>
      <button
        type="button"
        className="disclosure-trigger"
        aria-controls={contentId}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <motion.span
          aria-hidden="true"
          initial={false}
          animate={{ rotate: open ? 90 : 0 }}
          transition={transition}
        >
          <ChevronRight size={19} />
        </motion.span>
        <span>{label}</span>
      </button>
      <motion.div
        id={contentId}
        className="disclosure-body"
        inert={!open}
        initial={false}
        animate={{ height: open ? "auto" : 0 }}
        transition={transition}
      >
        {children}
      </motion.div>
    </div>
  );
}
