import { cn } from "@/lib/cn";

interface ErrorLabelProps {
  message?: string;
  className?: string;
}

function ErrorLabel({ message, className }: ErrorLabelProps) {
  if (!message) return null;
  return (
    <p className={cn("text-sm font-medium text-destructive", className)}>
      {message}
    </p>
  );
}

export { ErrorLabel };
export default ErrorLabel;
