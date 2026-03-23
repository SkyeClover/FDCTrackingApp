import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Page } from '../navigation/routes'

type NavigateFn = (page: Page) => void

const NavigationContext = createContext<{ navigateTo: NavigateFn } | null>(null)

/**
 * Renders the Navigation Provider UI section.
 */
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

/**
 * Manages app navigation state and behavior for this hook.
 */
export function useAppNavigation(): { navigateTo: NavigateFn } {
  const ctx = useContext(NavigationContext)
  return ctx ?? { navigateTo: () => {} }
}
