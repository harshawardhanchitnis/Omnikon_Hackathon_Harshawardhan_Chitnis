import { Menu, X } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

const navItems = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'For Schools', href: '#for-schools' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Resources', href: '#resources' },
]

function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-[#e5e9e2] bg-[#fbfaf5]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[70px] w-full max-w-[1560px] items-center justify-between px-5 sm:px-8 lg:px-10 xl:px-12">
        <a
          href="/"
          aria-label="ChalkBox home"
          className="shrink-0 rounded-xl transition-transform duration-200 hover:scale-[1.02]"
        >
          <img
            src="/branding/logo.png"
            alt="ChalkBox by HarshLabs AI"
            className="h-auto w-[150px] sm:w-[165px]"
          />
        </a>

        <nav className="hidden items-center gap-1.5 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="rounded-xl border border-transparent px-4 py-2.5 text-[13px] font-medium text-[#4d5951] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#d6e1d3] hover:bg-[#edf4ea] hover:text-[#0f5132] hover:shadow-[0_5px_16px_rgba(15,81,50,0.07)]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Button
            variant="ghost"
            className="h-10 rounded-xl border border-transparent px-4 text-[13px] font-medium text-[#445047] transition-all hover:border-[#d6e1d3] hover:bg-[#edf4ea] hover:text-[#0f5132]"
          >
            Log in
          </Button>

          <Button className="h-10 rounded-xl bg-[#0f5132] px-5 text-[13px] font-semibold text-white shadow-[0_7px_18px_rgba(15,81,50,0.18)] transition-all hover:-translate-y-0.5 hover:bg-[#0b3d28] hover:shadow-[0_10px_24px_rgba(15,81,50,0.25)]">
            Create Teacher Account
          </Button>
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
        <div className="border-t border-[#e2e7df] bg-[#fffef9] px-5 py-4 lg:hidden">
          <nav className="mx-auto flex max-w-[1560px] flex-col gap-1">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl border border-transparent px-4 py-3 text-sm font-medium text-[#445047] transition-all hover:border-[#d6e1d3] hover:bg-[#edf4ea] hover:text-[#0f5132]"
              >
                {item.label}
              </a>
            ))}

            <div className="mt-3 grid gap-2 border-t border-[#e2e7df] pt-4">
              <Button
                variant="outline"
                className="h-11 rounded-xl border-[#d5dfd2]"
              >
                Log in
              </Button>

              <Button className="h-11 rounded-xl bg-[#0f5132] text-white hover:bg-[#0b3d28]">
                Create Teacher Account
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

export default Navbar