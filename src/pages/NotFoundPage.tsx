import {
  ArrowLeft,
  BookOpenText,
} from 'lucide-react'
import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f1] px-5 py-12 text-[#17211b]">
      <section className="w-full max-w-xl rounded-[30px] border border-[#dce4da] bg-[#fffef9] p-7 text-center shadow-[0_18px_50px_rgba(22,55,38,0.08)] sm:p-10">
        <Link to="/" className="mx-auto inline-block">
          <img
            src="/branding/logo.png"
            alt="ChalkBox"
            className="mx-auto w-[155px]"
          />
        </Link>

        <div className="mx-auto mt-8 flex size-14 items-center justify-center rounded-2xl bg-[#edf4ea] text-[#176b43]">
          <BookOpenText className="size-6" />
        </div>

        <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#208653]">
          Page not found
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.035em]">
          This page is not in the ChalkBox plan.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-7 text-[#68736c]">
          Return to the teacher workspace or start a new classroom-ready lesson.
        </p>

        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
          <Link
            to="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#0f5132] px-5 text-xs font-extrabold text-white hover:bg-[#0b3d28]"
          >
            <ArrowLeft className="mr-2 size-4" />
            Teacher Workspace
          </Link>
          <Link
            to="/textbook"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[#cbd8c9] bg-white px-5 text-xs font-extrabold text-[#176b43] hover:bg-[#edf4ea]"
          >
            Try Textbook Demo
          </Link>
        </div>
      </section>
    </main>
  )
}

export default NotFoundPage
