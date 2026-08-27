import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import AuthLayout from '@/components/layout/AuthLayout'
import {
  captureRecoverySessionFromUrl,
  updateRecoveredPassword,
} from '@/lib/productAuth'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      captureRecoverySessionFromUrl()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'This password-reset link is invalid or expired.')
    }
  }, [])

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError(null); setMessage(null)
    try {
      await updateRecoveredPassword(password)
      setMessage('Password updated. Sign in again with your new password.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update password.')
    } finally { setLoading(false) }
  }

  return <AuthLayout eyebrow="Secure recovery" title="Choose a new password." description="Use the recovery link from your email, then set a new ChalkBox password.">
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-bold">New password<input type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-[#d5dfd2] bg-[#fffef9] px-4 text-sm outline-none" /></label>
      {message && <div className="rounded-xl border border-[#bcd9c3] bg-[#eff8f1] px-4 py-3 text-xs font-semibold text-[#176b43]">{message}</div>}
      {error && <div className="rounded-xl border border-[#e7b5ae] bg-[#fff3f0] px-4 py-3 text-xs font-semibold text-[#8c3027]">{error}</div>}
      <button disabled={loading} className="h-12 w-full rounded-xl bg-[#0f5132] text-sm font-extrabold text-white">{loading ? 'Updating...' : 'Update password'}</button>
    </form>
    <Link to="/login" className="mt-6 block text-center text-xs font-extrabold text-[#176b43]">Continue to Sign In</Link>
  </AuthLayout>
}
