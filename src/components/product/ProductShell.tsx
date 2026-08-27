import {
  BookOpen,
  LayoutDashboard,
  Library,
  LogOut,
  Plus,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useProductSession } from '@/hooks/useProductSession'
import { signOutTeacher } from '@/lib/productAuth'

export default function ProductShell({ children }: { children: ReactNode }) {
  const { session } = useProductSession()
  const navigate = useNavigate()

  async function logout() {
    await signOutTeacher()
    navigate('/login', { replace: true })
  }

  return (
    <main className="min-h-screen bg-[#f7f7f1] text-[#17211b]">
      <header className="sticky top-0 z-50 border-b border-[#dce4da] bg-[#fffef9]/95 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex min-h-[68px] w-full max-w-[1560px] items-center gap-3 px-4 sm:px-7 lg:px-10">
          <Link to="/app" className="shrink-0">
            <img src="/branding/logo.png" alt="ChalkBox" className="w-[142px] sm:w-[154px]" />
          </Link>

          <nav className="ml-auto hidden items-center gap-1 md:flex">
            <Link to="/app" className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-[#536159] hover:bg-[#edf4ea] hover:text-[#0f5132]">
              <LayoutDashboard className="size-4" /> Home
            </Link>
            <Link to="/app/textbooks" className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-[#536159] hover:bg-[#edf4ea] hover:text-[#0f5132]">
              <BookOpen className="size-4" /> My Textbooks
            </Link>
            <Link to="/app/library" className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-[#536159] hover:bg-[#edf4ea] hover:text-[#0f5132]">
              <Library className="size-4" /> Library
            </Link>
            <Link to="/topic?product=1" className="ml-2 flex items-center gap-2 rounded-xl bg-[#0f5132] px-3.5 py-2 text-xs font-extrabold text-white hover:bg-[#0b3d28]">
              <Plus className="size-4" /> New Topic
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-2 md:ml-2">
            <span className="hidden max-w-[190px] truncate text-[10px] font-bold text-[#6c786f] sm:block">
              {session?.user.email ?? 'Teacher account'}
            </span>
            <button onClick={() => void logout()} className="flex size-9 items-center justify-center rounded-xl border border-[#d6dfd4] bg-white text-[#5f6c63] hover:bg-[#f1f5ef] hover:text-[#0f5132]" aria-label="Sign out">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto border-t border-[#edf0eb] px-4 py-2 md:hidden">
          <Link to="/app" className="shrink-0 rounded-full bg-[#edf4ea] px-3 py-1.5 text-[10px] font-extrabold text-[#176b43]">Home</Link>
          <Link to="/app/textbooks" className="shrink-0 rounded-full bg-[#edf4ea] px-3 py-1.5 text-[10px] font-extrabold text-[#176b43]">My Textbooks</Link>
          <Link to="/app/library" className="shrink-0 rounded-full bg-[#edf4ea] px-3 py-1.5 text-[10px] font-extrabold text-[#176b43]">Library</Link>
          <Link to="/topic?product=1" className="shrink-0 rounded-full bg-[#0f5132] px-3 py-1.5 text-[10px] font-extrabold text-white">New Topic</Link>
        </div>
      </header>
      {children}
    </main>
  )
}
