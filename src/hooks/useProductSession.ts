import { useEffect, useState } from 'react'

import type { ChalkBoxAuthSession } from '@/lib/auth'
import {
  AUTH_CHANGE_EVENT,
  getFreshTeacherSession,
} from '@/lib/productAuth'

export function useProductSession() {
  const [session, setSession] = useState<ChalkBoxAuthSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const next = await getFreshTeacherSession()
        if (active) setSession(next)
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()

    const handle = () => void load()
    window.addEventListener(AUTH_CHANGE_EVENT, handle)
    window.addEventListener('storage', handle)

    return () => {
      active = false
      window.removeEventListener(AUTH_CHANGE_EVENT, handle)
      window.removeEventListener('storage', handle)
    }
  }, [])

  return { session, loading }
}
