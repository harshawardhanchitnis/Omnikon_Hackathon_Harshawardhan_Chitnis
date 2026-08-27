import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useProductSession } from '@/hooks/useProductSession'

export default function ProtectedProductRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useProductSession()
  const location = useLocation()

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f7f1] text-[#365044]">
        <p className="text-sm font-bold">Opening your ChalkBox workspace...</p>
      </main>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
