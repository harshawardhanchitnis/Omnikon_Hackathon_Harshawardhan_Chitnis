import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes
} from "react";
import { cn } from "@/lib/utils";

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  id: string;
  children: React.ReactNode;
}

function FieldShell({ label, hint, error, required, id, children }: FieldShellProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-ink-950 block text-sm font-bold">
        {label}{" "}
        {required && (
          <span className="text-coral-500" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {(hint || error) && (
        <p
          className={cn("text-xs", error ? "font-semibold text-red-700" : "text-muted")}
          role={error ? "alert" : undefined}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, required, id: suppliedId, className, ...props },
  ref
) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} id={id}>
      <input
        ref={ref}
        id={id}
        aria-invalid={Boolean(error)}
        className={cn(
          "surface text-ink-950 placeholder:text-ink-500 focus:border-moss-500 focus:ring-moss-100 h-11 w-full rounded-xl border px-3.5 text-sm shadow-sm transition outline-none focus:ring-4",
          error && "border-red-500 focus:border-red-500 focus:ring-red-100",
          className
        )}
        required={required}
        {...props}
      />
    </FieldShell>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, required, id: suppliedId, className, ...props },
  ref
) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} id={id}>
      <textarea
        ref={ref}
        id={id}
        aria-invalid={Boolean(error)}
        className={cn(
          "surface text-ink-950 placeholder:text-ink-500 focus:border-moss-500 focus:ring-moss-100 min-h-28 w-full resize-y rounded-xl border px-3.5 py-3 text-sm leading-6 shadow-sm transition outline-none focus:ring-4",
          error && "border-red-500 focus:border-red-500 focus:ring-red-100",
          className
        )}
        required={required}
        {...props}
      />
    </FieldShell>
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, required, id: suppliedId, className, children, ...props },
  ref
) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} id={id}>
      <select
        ref={ref}
        id={id}
        aria-invalid={Boolean(error)}
        className={cn(
          "surface text-ink-950 focus:border-moss-500 focus:ring-moss-100 h-11 w-full rounded-xl border px-3.5 text-sm font-medium shadow-sm transition outline-none focus:ring-4",
          error && "border-red-500",
          className
        )}
        required={required}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
});
