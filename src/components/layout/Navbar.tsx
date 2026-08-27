import {
  BookOpenText,
  LogIn,
  Menu,
  Sparkles,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'

const navItems = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'For Schools', href: '#for-schools' },
]

function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-[#e5e9e2] bg-[#fbfaf5]/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[68px] w-full max-w-[1560px] items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8 xl:px-10">
        <Link
          to="/"
          aria-label="ChalkBox home"
          className="shrink-0 rounded-xl transition-transform duration-200 hover:scale-[1.02]"
        >
          <img
            src="/branding/logo.png"
            alt="ChalkBox by HarshLabs AI"
            className="h-auto w-[138px] sm:w-[155px]"
          />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="rounded-xl border border-transparent px-3.5 py-2.5 text-[12px] font-semibold text-[#4d5951] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#d6e1d3] hover:bg-[#edf4ea] hover:text-[#0f5132]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            to="/login"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[#d5dfd2] bg-white px-4 text-[12px] font-semibold text-[#176b43] transition-all hover:-translate-y-0.5 hover:bg-[#edf4ea]"
          >
            <LogIn className="mr-1.5 size-3.5" />
            Sign In
          </Link>
          <Link
            to="/dashboard?demo=1"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#0f5132] px-4 text-[12px] font-semibold text-white shadow-[0_7px_18px_rgba(15,81,50,0.18)] transition-all hover:-translate-y-0.5 hover:bg-[#0b3d28]"
          >
            <BookOpenText className="mr-1.5 size-3.5" />
            Try Demo
          </Link>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10 rounded-xl text-[#0f5132] lg:hidden"
          aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
          onClick={() => setMobileMenuOpen((current) => !current)}
        >
          {mobileMenuOpen ? (
            <X className="size-5" />
          ) : (
            <Menu className="size-5" />
          )}
        </Button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-[#e2e7df] bg-[#fffef9] px-4 py-4 lg:hidden">
          <nav className="mx-auto flex max-w-[1560px] flex-col gap-1">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl border border-transparent px-4 py-3 text-sm font-semibold text-[#445047] transition-all hover:border-[#d6e1d3] hover:bg-[#edf4ea] hover:text-[#0f5132]"
              >
                {item.label}
              </a>
            ))}

            <div className="mt-3 grid gap-2 border-t border-[#e2e7df] pt-4 sm:grid-cols-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d5dfd2] bg-white text-xs font-extrabold text-[#176b43]"
              >
                <LogIn className="mr-2 size-4" />
                Sign In
              </Link>
              <Link
                to="/dashboard?demo=1"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[#0f5132] text-xs font-extrabold text-white hover:bg-[#0b3d28]"
              >
                <Sparkles className="mr-2 size-4" />
                Try Verified Demo
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

export default Navbar