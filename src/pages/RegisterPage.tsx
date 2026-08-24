import {
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import AuthLayout from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'

function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
  }

  return (
    <AuthLayout
      eyebrow="Create your teacher workspace"
      title="Plan once. Save it. Improve it. Teach it."
      description="Your ChalkBox account keeps lesson plans, teaching ideas and classroom history together so you never have to start from zero."
    >
      <div>
        <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#208653]">
          Teacher Registration
        </span>

        <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.035em] text-[#17211b] sm:text-4xl">
          Create your account.
        </h2>

        <p className="mt-3 text-sm font-medium leading-6 text-[#68736c]">
          Save lessons, revisit previous plans and build your personal teaching
          library.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        <div>
          <label
            htmlFor="full-name"
            className="mb-2 block text-sm font-bold text-[#263229]"
          >
            Full name
          </label>

          <div className="relative">
            <UserRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#7b877f]" />

            <input
              id="full-name"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              placeholder="Your name"
              className="h-12 w-full rounded-xl border border-[#d5dfd2] bg-[#fffef9] pl-11 pr-4 text-sm font-medium text-[#17211b] outline-none transition-all placeholder:text-[#9aa39c] focus:border-[#64a87a] focus:ring-4 focus:ring-[#dfeee2]"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="register-email"
            className="mb-2 block text-sm font-bold text-[#263229]"
          >
            Email address
          </label>

          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#7b877f]" />

            <input
              id="register-email"
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
          <label
            htmlFor="register-password"
            className="mb-2 block text-sm font-bold text-[#263229]"
          >
            Password
          </label>

          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#7b877f]" />

            <input
              id="register-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="Minimum 8 characters"
              className="h-12 w-full rounded-xl border border-[#d5dfd2] bg-[#fffef9] pl-11 pr-12 text-sm font-medium text-[#17211b] outline-none transition-all placeholder:text-[#9aa39c] focus:border-[#64a87a] focus:ring-4 focus:ring-[#dfeee2]"
            />

            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#778279] transition-colors hover:text-[#0f5132]"
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-[#dbe5d8] bg-[#f1f6ee] px-4 py-3">
          <div className="flex gap-2.5">
            <Check className="mt-0.5 size-4 shrink-0 text-[#176b43]" />

            <p className="text-[11px] font-medium leading-5 text-[#58655c]">
              Your account is used to securely save your lesson history and
              teaching workspace.
            </p>
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 text-[11px] font-medium leading-5 text-[#68736c]">
          <input
            type="checkbox"
            required
            className="mt-0.5 size-4 shrink-0 rounded border-[#bdcbbb] accent-[#0f5132]"
          />

          <span>
            I agree to ChalkBox&apos;s Terms of Use and Privacy Policy.
          </span>
        </label>

        <Button
          type="submit"
          className="h-12 w-full rounded-xl bg-[#0f5132] text-sm font-bold text-white shadow-[0_10px_26px_rgba(15,81,50,0.2)] transition-all hover:-translate-y-0.5 hover:bg-[#0b3d28]"
        >
          Create Teacher Account
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#dfe5dc]" />

        <span className="text-[11px] font-semibold text-[#89938c]">
          Already registered?
        </span>

        <div className="h-px flex-1 bg-[#dfe5dc]" />
      </div>

      <Link
        to="/login"
        className="flex h-12 w-full items-center justify-center rounded-xl border border-[#cbd8c9] bg-[#fffef9] text-sm font-bold text-[#0f5132] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#edf4ea]"
      >
        Sign in instead
      </Link>

      <p className="mt-6 text-center text-xs font-medium leading-5 text-[#7b867e]">
        Not ready to register?{' '}
        <button
          type="button"
          className="font-bold text-[#176b43] hover:text-[#0f5132]"
        >
          Try ChalkBox Demo
        </button>
      </p>
    </AuthLayout>
  )
}

export default RegisterPage