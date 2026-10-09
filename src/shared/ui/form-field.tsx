import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from "react";

import { cn } from "@/shared/lib/utils";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select } from "@/shared/ui/select";

type FieldMetaProps = {
  id: string;
  label: string;
  description?: string;
  error?: string;
  className?: string;
  labelClassName?: string;
};

function describedBy(
  id: string,
  description: string | undefined,
  error: string | undefined,
  existing: string | undefined
) {
  return [existing, description ? `${id}-description` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ") || undefined;
}

function FieldMessages({
  id,
  description,
  error
}: Pick<FieldMetaProps, "id" | "description" | "error">) {
  return (
    <>
      {description ? (
        <p id={`${id}-description`} className="mt-1 text-xs text-[var(--muted-foreground)]">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-[var(--destructive)]">
          {error}
        </p>
      ) : null}
    </>
  );
}

export function FormField({
  id,
  label,
  description,
  error,
  className,
  labelClassName,
  "aria-describedby": ariaDescribedBy,
  ...props
}: FieldMetaProps & Omit<InputHTMLAttributes<HTMLInputElement>, "id">) {
  return (
    <div className={className}>
      <Label htmlFor={id} className={labelClassName}>{label}</Label>
      <Input
        id={id}
        className="mt-1 h-11 w-full"
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy(id, description, error, ariaDescribedBy)}
        {...props}
      />
      <FieldMessages id={id} description={description} error={error} />
    </div>
  );
}

export function SelectField({
  id,
  label,
  description,
  error,
  className,
  labelClassName,
  children,
  "aria-describedby": ariaDescribedBy,
  ...props
}: FieldMetaProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "children"> & {
    children: ReactNode;
  }) {
  return (
    <div className={className}>
      <Label htmlFor={id} className={labelClassName}>{label}</Label>
      <Select
        id={id}
        className="mt-1 h-11"
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy(id, description, error, ariaDescribedBy)}
        {...props}
      >
        {children}
      </Select>
      <FieldMessages id={id} description={description} error={error} />
    </div>
  );
}

export function TextareaField({
  id,
  label,
  description,
  error,
  className,
  labelClassName,
  "aria-describedby": ariaDescribedBy,
  ...props
}: FieldMetaProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id">) {
  return (
    <div className={className}>
      <Label htmlFor={id} className={labelClassName}>{label}</Label>
      <textarea
        id={id}
        className={cn(
          "mt-1 min-h-24 w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]/20 disabled:cursor-not-allowed disabled:bg-[var(--surface-subtle)]",
          error && "border-[var(--destructive)]"
        )}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy(id, description, error, ariaDescribedBy)}
        {...props}
      />
      <FieldMessages id={id} description={description} error={error} />
    </div>
  );
}
