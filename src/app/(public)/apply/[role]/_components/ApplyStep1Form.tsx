'use client'

import { useState, useTransition } from 'react'
import { submitApplyStep1 } from '../actions'

interface Props {
  roleSlug: string
  roleName: string
}

export default function ApplyStep1Form({ roleSlug, roleName }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    setError(null)
    formData.set('role_slug', roleSlug)
    startTransition(async () => {
      const result = await submitApplyStep1(formData)
      if (result && 'error' in result && result.error) {
        setError(result.error)
      }
      // Success path: server action redirects, so we won't reach this.
    })
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="first_name"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            First name
          </label>
          <input
            id="first_name"
            name="first_name"
            type="text"
            required
            autoComplete="given-name"
            disabled={isPending}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>
        <div>
          <label
            htmlFor="last_name"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Last name
          </label>
          <input
            id="last_name"
            name="last_name"
            type="text"
            required
            autoComplete="family-name"
            disabled={isPending}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-slate-700 mb-1.5"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          disabled={isPending}
          placeholder="you@example.com"
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-400"
        />
      </div>

      <div>
        <label
          htmlFor="phone"
          className="block text-sm font-medium text-slate-700 mb-1.5"
        >
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          autoComplete="tel"
          disabled={isPending}
          placeholder="(555) 123-4567"
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-400"
        />
      </div>

      <div>
        <label
          htmlFor="resume"
          className="block text-sm font-medium text-slate-700 mb-1.5"
        >
          Resume
        </label>
        <input
          id="resume"
          name="resume"
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          required
          disabled={isPending}
          className="block w-full text-sm text-slate-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 disabled:opacity-50"
        />
        <p className="text-xs text-slate-500 mt-1.5">
          PDF, DOC, or DOCX. Max 5MB.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
      >
        {isPending ? (
          <>
            <svg
              className="animate-spin w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                opacity="0.25"
              />
              <path
                d="M12 2a10 10 0 0 1 10 10"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
              />
            </svg>
            Saving your application…
          </>
        ) : (
          <>
            Continue to step 2
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-4 h-4"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </>
        )}
      </button>

      <p className="text-xs text-slate-500">
        By continuing you confirm you&apos;re applying for the{' '}
        <span className="font-medium text-slate-700">{roleName}</span> role at
        Beatrice Loving Heart.
      </p>
    </form>
  )
}
