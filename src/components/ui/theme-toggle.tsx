import { MoonIcon, SunIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [theme, setThemeState] = useState<"theme-light" | "dark">(
    "theme-light",
  );

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");

    setThemeState(isDarkMode ? "dark" : "theme-light");
  }, []);

  useEffect(() => {
    const isDark = theme === "dark";
    document.documentElement.classList[isDark ? "add" : "remove"]("dark");
  }, [theme]);

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => {
        if (theme === "dark") setThemeState("theme-light");
        else setThemeState("dark");
      }}
    >
      <SunIcon className="block size-4 dark:hidden" />
      <MoonIcon className="hidden size-4 dark:block" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
