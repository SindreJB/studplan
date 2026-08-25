export function FormError({ errors }: { errors: readonly unknown[] }) {
  const error = errors[0];
  const message = error instanceof Error ? error.message : null;

  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}
