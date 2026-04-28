import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"

type Scheme = "light" | "dark" | "system"

type Ctx = {
  scheme: Scheme
  setScheme: (value: Scheme) => void
  resolved: "light" | "dark"
}

const ThemeContext = createContext<Ctx | null>(null)

function matchMediaScheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function subscribe(c: () => void) {
  if (typeof window === "undefined") return () => {}
  const mq = window.matchMedia("(prefers-color-scheme: dark)")
  mq.addEventListener("change", c)
  return () => mq.removeEventListener("change", c)
}

export function ThemeProvider(props: { children: ReactNode; defaultScheme?: Scheme }) {
  const [scheme, setScheme] = useState<Scheme>(props.defaultScheme ?? "system")
  const system = useSyncExternalStore(subscribe, matchMediaScheme, () => "light" as const)
  const resolved: "light" | "dark" = scheme === "system" ? system : scheme

  const set = useCallback((value: Scheme) => {
    setScheme(value)
  }, [])

  const value = useMemo(
    () => ({ scheme, setScheme: set, resolved }),
    [scheme, set, resolved],
  )

  return (
    <ThemeContext.Provider value={value}>
      <div data-color-scheme={resolved} className="gepick-ui-root contents min-h-0">
        {props.children}
      </div>
    </ThemeContext.Provider>
  )
}

export function useTheme(): Ctx {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return ctx
}
