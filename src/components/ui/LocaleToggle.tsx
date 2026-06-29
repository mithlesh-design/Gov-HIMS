"use client"

import { useLocale } from "next-intl"
import { useTransition } from "react"
import { setLocale } from "@/app/actions/locale"
import { useRouter } from "next/navigation"

export function LocaleToggle() {
  const locale = useLocale()
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const toggle = () => {
    const next = locale === 'en' ? 'hi' : 'en'
    startTransition(async () => {
      await setLocale(next)
      router.refresh()
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors disabled:opacity-50"
      title={locale === 'en' ? 'Switch to Hindi' : 'Switch to English'}
    >
      <span className={locale === 'en' ? 'text-blue-600' : 'text-slate-400'}>EN</span>
      <span className="text-slate-300">|</span>
      <span className={locale === 'hi' ? 'text-blue-600' : 'text-slate-400'}>हिं</span>
    </button>
  )
}
