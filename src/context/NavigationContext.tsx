import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Page } from '../navigation/routes'

type NavigateFn = (page: Page) => void

const NavigationContext = createContext<{ navigateTo: NavigateFn } | null>(null)

export function NavigationProvider({
  children,
  navigateTo,
}: {
  children: ReactNode
  navigateTo: NavigateFn
}) {
  const value = useMemo(() => ({ navigateTo }), [navigateTo])
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}

export function useAppNavigation(): { navigateTo: NavigateFn } {
  const ctx = useContext(NavigationContext)
  return ctx ?? { navigateTo: () => {} }
}
