import { computed, ref, watch } from "vue";

export type ThemeMode = "system" | "light" | "dark";

const storageKey = "blog-theme-mode";
const themeMode = ref<ThemeMode>("system");
const resolvedTheme = ref<"light" | "dark">("light");
let initialized = false;
let mediaQuery: MediaQueryList | null = null;

function getSystemTheme(): "light" | "dark" {
  return mediaQuery?.matches ? "dark" : "light";
}

function applyTheme() {
  if (typeof document === "undefined") {
    return;
  }

  const nextTheme =
    themeMode.value === "system" ? getSystemTheme() : themeMode.value;
  resolvedTheme.value = nextTheme;
  document.documentElement.dataset.theme = nextTheme;
  document.documentElement.classList.toggle("dark", nextTheme === "dark");
  document.documentElement.style.colorScheme = nextTheme;
}

function handleSystemThemeChange() {
  if (themeMode.value === "system") {
    applyTheme();
  }
}

function initTheme() {
  if (initialized || typeof window === "undefined") {
    return;
  }

  initialized = true;
  const savedMode = window.localStorage.getItem(storageKey);
  if (savedMode === "system" || savedMode === "light" || savedMode === "dark") {
    themeMode.value = savedMode;
  }

  mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", handleSystemThemeChange);
  } else {
    mediaQuery.addListener(handleSystemThemeChange);
  }

  applyTheme();
}

watch(
  themeMode,
  (mode) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, mode);
    }
    applyTheme();
  },
  { flush: "post" },
);

export function useTheme() {
  initTheme();

  const themeLabel = computed(() => {
    if (themeMode.value === "system") {
      return "跟随系统";
    }
    return themeMode.value === "dark" ? "深色模式" : "浅色模式";
  });

  const themeIcon = computed(() => {
    if (themeMode.value === "system") {
      return "◐";
    }
    return themeMode.value === "dark" ? "☾" : "☀";
  });

  function setTheme(mode: ThemeMode) {
    themeMode.value = mode;
  }

  function cycleTheme() {
    if (themeMode.value === "system") {
      setTheme("light");
      return;
    }
    if (themeMode.value === "light") {
      setTheme("dark");
      return;
    }
    setTheme("system");
  }

  return {
    themeMode,
    resolvedTheme,
    themeLabel,
    themeIcon,
    setTheme,
    cycleTheme,
  };
}
