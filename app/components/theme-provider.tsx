"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark" | "system"

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolved: "light" | "dark"
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  setTheme: () => {},
  resolved: "light",
})

export function useTheme() {
  return useContext(ThemeContext)
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

function applyTheme(resolved: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", resolved)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system")
  const [resolved, setResolved] = useState<"light" | "dark">("light")

  // Load saved preference on mount
  useEffect(() => {
    const saved = localStorage.getItem("luma-theme") as Theme | null
    if (saved === "light" || saved === "dark" || saved === "system") {
      setThemeState(saved)
    }
  }, [])

  // Apply theme to <html> and resolve
  useEffect(() => {
    const resolvedTheme = theme === "system" ? getSystemTheme() : theme
    applyTheme(resolvedTheme)
    setResolved(resolvedTheme)
  }, [theme])

  // Listen for system theme changes when in "system" mode
  useEffect(() => {
    if (theme !== "system") return

    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => {
      const resolvedTheme = getSystemTheme()
      setResolved(resolvedTheme)
      applyTheme(resolvedTheme)
    }

    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [theme])

  function setTheme(t: Theme) {
    setThemeState(t)
    try {
      localStorage.setItem("luma-theme", t)
    } catch {
      // Storage can be disabled (private mode, etc.). Fail silently.
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
      {children}
    </ThemeContext.Provider>
  )
}
