import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'PrimeaHR — Beatrice Loving Heart',
  description: 'Apply for a role or complete your onboarding with Beatrice Loving Heart.',
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <header className="w-full border-b border-slate-200/60 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20 flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="white"
                className="w-5 h-5"
                aria-hidden="true"
              >
                <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-slate-900">PrimeaHR</div>
              <div className="text-xs text-slate-500">Beatrice Loving Heart</div>
            </div>
          </div>
          <div className="text-xs text-slate-500 hidden sm:block">
            Need help? Email{' '}
            <a
              href="mailto:hr@beatricelovingheart.com"
              className="text-emerald-700 hover:underline"
            >
              hr@beatricelovingheart.com
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full">{children}</main>

      <footer className="w-full border-t border-slate-200/60 mt-12">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            © {new Date().getFullYear()} Beatrice Loving Heart. All rights
            reserved.
          </div>
          <div className="flex items-center gap-4">
            <a href="https://beatricelovingheart.com" className="hover:text-slate-700">
              About BLH
            </a>
            <span aria-hidden="true">·</span>
            <span>Maryland CASE Management Agency</span>
          </div>
        </div>
      <div className="text-center text-xs text-slate-400 mt-2 pb-1">Protected by PrimeaHR &middot; 256-bit encryption<br />Built and powered by VELOX &ldquo;Automated Operations&rdquo; LLC</div>
    </footer>
    </div>
  )
}
