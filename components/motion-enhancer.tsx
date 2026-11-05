'use client'

import { useEffect } from 'react'

const revealTargets = 'main > section, main > div > section, article, [role="dialog"] > div'
const interactiveTargets = 'button, a, [role="button"]'

export function MotionEnhancer() {
  useEffect(() => {
    const root = document.documentElement
    root.classList.add('motion-ready')
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const revealItems = Array.from(document.querySelectorAll<HTMLElement>(revealTargets))
    const interactiveItems = Array.from(document.querySelectorAll<HTMLElement>(interactiveTargets))
    const observers: IntersectionObserver[] = []

    revealItems.forEach((element, index) => {
      element.classList.add('motion-reveal')
      element.style.setProperty('--motion-delay', `${Math.min(index * 55, 440)}ms`)
    })

    if (!prefersReduced.matches && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('motion-visible')
            observer.unobserve(entry.target)
          }
        })
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })
      revealItems.forEach((element) => observer.observe(element))
      observers.push(observer)
    } else {
      revealItems.forEach((element) => element.classList.add('motion-visible'))
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (prefersReduced.matches || event.pointerType === 'touch') return
      const element = (event.currentTarget as HTMLElement)
      const rect = element.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width - 0.5
      const y = (event.clientY - rect.top) / rect.height - 0.5
      element.style.setProperty('--tilt-x', `${(y * -2.2).toFixed(2)}deg`)
      element.style.setProperty('--tilt-y', `${(x * 2.2).toFixed(2)}deg`)
      element.classList.add('motion-hovering')
    }
    const resetPointer = (event: PointerEvent) => {
      const element = event.currentTarget as HTMLElement
      element.style.setProperty('--tilt-x', '0deg')
      element.style.setProperty('--tilt-y', '0deg')
      element.classList.remove('motion-hovering')
    }

    interactiveItems.forEach((element) => {
      element.classList.add('motion-interactive')
      element.addEventListener('pointermove', handlePointerMove)
      element.addEventListener('pointerleave', resetPointer)
    })

    const onScroll = () => root.classList.toggle('is-scrolled', window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    return () => {
      observers.forEach((observer) => observer.disconnect())
      interactiveItems.forEach((element) => {
        element.removeEventListener('pointermove', handlePointerMove)
        element.removeEventListener('pointerleave', resetPointer)
      })
      window.removeEventListener('scroll', onScroll)
      root.classList.remove('motion-ready', 'is-scrolled')
    }
  }, [])

  return null
}
