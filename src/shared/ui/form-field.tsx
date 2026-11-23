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
        <p id={`${id}-description`} className="mt-[var(--hub-space-0-5)] text-[length:var(--hub-text-2xs)] text-[var(--hub-color-text-muted)]">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-[var(--hub-space-1)] text-[length:var(--hub-text-2xs)] text-[var(--hub-color-danger)]">
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
          "mt-1 min-h-24 w-full rounded-[var(--hub-radius-md)] border border-[var(--hub-color-border-strong)] bg-[var(--hub-color-surface)] px-[var(--hub-space-3)] py-[var(--hub-space-2)] text-[length:var(--hub-text-sm)] text-[var(--hub-color-text-heading)] shadow-[var(--hub-shadow-sm)] outline-none transition-colors placeholder:text-[var(--hub-color-text-placeholder)] focus:border-[var(--hub-color-focus)] focus:ring-1 focus:ring-[var(--hub-color-focus)] disabled:cursor-not-allowed disabled:bg-[var(--hub-color-surface-subtle)]",
          error && "border-[var(--hub-color-danger)]"
        )}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy(id, description, error, ariaDescribedBy)}
        {...props}
      />
      <FieldMessages id={id} description={description} error={error} />
    </div>
  );
}
