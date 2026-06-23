'use client'

import * as React from 'react'
import { Toaster } from 'sonner'

export function Sonner() {
  return (
    <Toaster
      theme="system"
      position="top-right"
      richColors
      expand
      closeButton
      toastOptions={{
        classNames: {
          toast: 'group toast group-[.toaster]:bg-white group-[.toaster]:text-slate-950 group-[.toaster]:border-slate-200 group-[.toaster]:shadow-lg dark:group-[.toaster]:bg-slate-950 dark:group-[.toaster]:text-slate-50 dark:group-[.toaster]:border-slate-800',
          description: 'group-[.toast]:text-slate-500 dark:group-[.toast]:text-slate-400',
          actionButton: 'group-[.toast]:bg-indigo-600 group-[.toast]:text-white',
          cancelButton: 'group-[.toast]:bg-slate-100 group-[.toast]:text-slate-950 dark:group-[.toast]:bg-slate-800 dark:group-[.toast]:text-slate-50',
          closeButton: 'group-[.toast]:bg-slate-100 group-[.toast]:text-slate-950 dark:group-[.toast]:bg-slate-800 dark:group-[.toast]:text-slate-50',
        },
      }}
    />
  )
}
