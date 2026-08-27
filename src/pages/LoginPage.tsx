import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import AuthLayout from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { signInTeacher } from '@/lib/auth'

function LoginPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')

    try {
      setLoading(true)
      await signInTeacher(email, password)
      navigate('/app', { replace: true })
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'ChalkBox could not sign you in.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Welcome back to ChalkBox"
      title="Your lessons are ready when you are."
      description="Sign in to continue planning, revisit previous lessons and keep everything you create organized for your classroom."
    >
      <div>
        <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#208653]">
          Teacher Sign In
        </span>

        <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.035em] text-[#17211b] sm:text-4xl">
          Welcome back.
        </h2>

        <p className="mt-3 text-sm font-medium leading-6 text-[#68736c]">
          Sign in to continue to your ChalkBox teacher workspace.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-bold text-[#263229]">
            Email address
          </label>

          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#7b877f]" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="teacher@example.com"
              className="h-12 w-full rounded-xl border border-[#d5dfd2] bg-[#fffef9] pl-11 pr-4 text-sm font-medium text-[#17211b] outline-none transition-all placeholder:text-[#9aa39c] focus:border-[#64a87a] focus:ring-4 focus:ring-[#dfeee2]"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-bold text-[#263229]">
            Password
          </label>

          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#7b877f]" />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              placeholder="Enter your password"
              className="h-12 w-full rounded-xl border border-[#d5dfd2] bg-[#fffef9] pl-11 pr-12 text-sm font-medium text-[#17211b] outline-none transition-all placeholder:text-[#9aa39c] focus:border-[#64a87a] focus:ring-4 focus:ring-[#dfeee2]"
            />

            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#778279] transition-colors hover:text-[#0f5132]"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-[#e7b5ae] bg-[#fff3f0] px-4 py-3 text-xs font-semibold leading-5 text-[#8c3027]">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-xl bg-[#0f5132] text-sm font-bold text-white shadow-[0_10px_26px_rgba(15,81,50,0.2)] transition-all hover:-translate-y-0.5 hover:bg-[#0b3d28] disabled:cursor-wait disabled:opacity-65"
        >
          {loading ? 'Signing in...' : 'Sign in to ChalkBox'}
        </Button>
      </form>

            <div className="mt-4 text-right">
        <Link to="/forgot-password" className="text-xs font-extrabold text-[#176b43] hover:text-[#0f5132]">
          Forgot password?
        </Link>
      </div>
<div className="my-7 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#dfe5dc]" />
        <span className="text-[11px] font-semibold text-[#89938c]">New to ChalkBox?</span>
        <div className="h-px flex-1 bg-[#dfe5dc]" />
      </div>

      <Link
        to="/register"
        className="flex h-12 w-full items-center justify-center rounded-xl border border-[#cbd8c9] bg-[#fffef9] text-sm font-bold text-[#0f5132] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#edf4ea]"
      >
        Create Teacher Account
      </Link>

      <p className="mt-6 text-center text-xs font-medium leading-5 text-[#7b867e]">
        Want to explore first?{' '}
        <Link to="/dashboard?demo=1" className="font-bold text-[#176b43] hover:text-[#0f5132]">
          Try Demo without registration
        </Link>
      </p>
    </AuthLayout>
  )
}

export default LoginPage
