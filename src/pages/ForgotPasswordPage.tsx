import { useState } from 'react'
import { Link } from 'react-router-dom'

import AuthLayout from '@/components/layout/AuthLayout'
import { requestPasswordReset } from '@/lib/productAuth'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true); setError(null); setMessage(null)
    try {
      await requestPasswordReset(email)
      setMessage('If that email belongs to a ChalkBox account, a password-reset link has been sent.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not send reset email.')
    } finally { setLoading(false) }
  }

  return <AuthLayout eyebrow="Account recovery" title="Reset your ChalkBox password." description="We will send a secure recovery link to your registered email address.">
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-bold">Email address<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-[#d5dfd2] bg-[#fffef9] px-4 text-sm outline-none" /></label>
      {message && <div className="rounded-xl border border-[#bcd9c3] bg-[#eff8f1] px-4 py-3 text-xs font-semibold text-[#176b43]">{message}</div>}
      {error && <div className="rounded-xl border border-[#e7b5ae] bg-[#fff3f0] px-4 py-3 text-xs font-semibold text-[#8c3027]">{error}</div>}
      <button disabled={loading} className="h-12 w-full rounded-xl bg-[#0f5132] text-sm font-extrabold text-white">{loading ? 'Sending...' : 'Send reset link'}</button>
    </form>
    <Link to="/login" className="mt-6 block text-center text-xs font-extrabold text-[#176b43]">Back to Sign In</Link>
  </AuthLayout>
}
