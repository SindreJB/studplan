export function FormError({ errors }: { errors: readonly unknown[] }) {
  const error = errors[0];
  const message = error instanceof Error ? error.message : null;

  return message ? <p className="font-mono text-[10px] tracking-[0.08em] uppercase text-destructive">{message}</p> : null;
}
