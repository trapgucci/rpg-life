import { useEffect } from 'react'

/**
 * Smooth scroll hook — перехватывает wheel-события на элементах с overflow scroll/auto
 * и анимирует скролл через requestAnimationFrame с easing.
 * Даёт плавный 60fps скролл в Electron на macOS (где нет нативной инерции).
 */
export function useSmoothScroll() {
  useEffect(() => {
    const targets = new Map<Element, { current: number; target: number; animId: number }>()

    function getScrollableParent(el: Element | null): Element | null {
      while (el) {
        if (el === document.body || el === document.documentElement) return null
        const style = getComputedStyle(el)
        const overflowY = style.overflowY
        if (
          (overflowY === 'auto' || overflowY === 'scroll') &&
          el.scrollHeight > el.clientHeight
        ) {
          return el
        }
        el = el.parentElement
      }
      return null
    }

    function ease(t: number): number {
      // deceleration easing — fast start, smooth stop
      return 1 - Math.pow(1 - t, 3)
    }

    function animate(el: Element) {
      const state = targets.get(el)
      if (!state) return

      const maxScroll = el.scrollHeight - el.clientHeight
      state.target = Math.max(0, Math.min(state.target, maxScroll))

      const diff = state.target - state.current
      if (Math.abs(diff) < 0.5) {
        el.scrollTop = state.target
        state.current = state.target
        state.animId = 0
        return
      }

      // Lerp — smoothing factor (higher = snappier, lower = smoother)
      state.current += diff * 0.14
      el.scrollTop = state.current

      state.animId = requestAnimationFrame(() => animate(el))
    }

    function handleWheel(e: WheelEvent) {
      const scrollable = getScrollableParent(e.target as Element)
      if (!scrollable) return

      // Don't hijack horizontal scroll
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return

      e.preventDefault()

      let state = targets.get(scrollable)
      if (!state) {
        state = { current: scrollable.scrollTop, target: scrollable.scrollTop, animId: 0 }
        targets.set(scrollable, state)
      }

      // Sync current position in case something else changed scrollTop
      if (!state.animId) {
        state.current = scrollable.scrollTop
      }

      state.target += e.deltaY

      if (!state.animId) {
        state.animId = requestAnimationFrame(() => animate(scrollable))
      }
    }

    document.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      document.removeEventListener('wheel', handleWheel)
      targets.forEach((state) => {
        if (state.animId) cancelAnimationFrame(state.animId)
      })
      targets.clear()
    }
  }, [])
}
