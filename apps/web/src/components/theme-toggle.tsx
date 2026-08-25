import { Button } from "@repo/ui/components/button";
import { useTheme } from "@repo/ui/lib/theme-provider";
import { MoonIcon, SunIcon } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(nextTheme)}
      aria-label={`Switch to ${nextTheme} theme`}
      title={`Switch to ${nextTheme} theme`}
    >
      <SunIcon className="size-[1.2rem] dark:hidden" />
      <MoonIcon className="hidden size-[1.2rem] dark:block" />
    </Button>
  );
}
