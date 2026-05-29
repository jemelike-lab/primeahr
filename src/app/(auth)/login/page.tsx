'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'password' | 'magic'>('password')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { setMounted(true) }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    if (mode === 'password') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else { router.push('/'); router.refresh() }
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` }
      })
      if (error) setError(error.message)
      else setMessage('Check your email for a login link!')
    }
    setLoading(false)
  }

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600&display=swap');
              @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 768px) { .lbp { display: none !important; } }
      `}</style>

      <div style={{
        minHeight: '100vh',
        display: 'flex',
        background: '#f0ece4',
        fontFamily: '"DM Sans", -apple-system, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle noise texture overlay */}
        <div style={{
          position: 'fixed',
          inset: 0,
          opacity: 0.03,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '128px 128px',
          pointerEvents: 'none',
          zIndex: 1,
        }} />

        {/* ── LEFT BRAND PANEL ── */}
        <div style={{
          flex: '0 0 46%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px',
          background: 'linear-gradient(165deg, #1c2b2a 0%, #243836 40%, #2a403d 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative geometric pattern */}
          <div style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.04,
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 40px,
              rgba(224,138,60,0.5) 40px,
              rgba(224,138,60,0.5) 41px
            )`,
            pointerEvents: 'none',
          }} />
          
          {/* Warm glow accent */}
          <div style={{
            position: 'absolute',
            bottom: '-20%',
            right: '-10%',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(224,138,60,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Top: Logo + brand */}
          <div style={{
            position: 'relative',
            zIndex: 2,
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            <img src="/images/blh-logo.png" alt="Beatrice Loving Heart" style={{ width: '80px', height: 'auto', marginBottom: '24px', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))' }} />
            <div style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontSize: '20px',
              fontWeight: 600,
              color: '#f4f1ea',
              letterSpacing: '0.05em',
            }}>PrimeaHR</div>
            <div style={{
              fontSize: '13px',
              color: 'rgba(244,241,234,0.45)',
              marginTop: '4px',
              letterSpacing: '0.02em',
            }}>Human Resources Platform</div>
          </div>

          {/* Center: Hero text */}
          <div style={{
            position: 'relative',
            zIndex: 2,
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.15s',
          }}>
            <div style={{
              width: '48px',
              height: '2px',
              background: 'linear-gradient(90deg, #e08a3c, transparent)',
              marginBottom: '32px',
            }} />
            <h1 style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontSize: '48px',
              fontWeight: 400,
              lineHeight: 1.15,
              color: '#f4f1ea',
              margin: 0,
              letterSpacing: '-0.01em',
            }}>
              Beatrice<br />
              <span style={{ fontStyle: 'italic', fontWeight: 400 }}>Loving Heart</span>
            </h1>
            <p style={{
              fontSize: '14px',
              lineHeight: 1.7,
              color: 'rgba(244,241,234,0.5)',
              marginTop: '24px',
              maxWidth: '340px',
            }}>
            Your complete onboarding &amp; career portal. From first application to first day &mdash; streamlined, automated, all in one place.
            </p>
          </div>

          {/* Bottom: Trust badges */}
          <div style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.3s',
          }}>
            {[
              { label: '100+', sub: 'Employees' },
              { label: '9', sub: 'Departments' },
              { label: '24/7', sub: 'AI-Powered' },
            ].map((stat, i) => (
              <div key={i} style={{
                display: 'flex',
                flexDirection: 'column',
                paddingRight: i < 2 ? '24px' : '0',
                borderRight: i < 2 ? '1px solid rgba(244,241,234,0.1)' : 'none',
              }}>
                <span style={{
                  fontFamily: '"Cormorant Garamond", Georgia, serif',
                  fontSize: '24px',
                  fontWeight: 600,
                  color: '#e08a3c',
                }}>{stat.label}</span>
                <span style={{
                  fontSize: '11px',
                  color: 'rgba(244,241,234,0.4)',
                  marginTop: '2px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}>{stat.sub}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT LOGIN PANEL ── */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '48px',
          position: 'relative',
          zIndex: 2,
        }}>
          {/* Decorative corner accents */}
          <div style={{
            position: 'absolute',
            top: '40px',
            right: '40px',
            width: '60px',
            height: '60px',
            borderTop: '1.5px solid rgba(224,138,60,0.2)',
            borderRight: '1.5px solid rgba(224,138,60,0.2)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            bottom: '40px',
            left: '40px',
            width: '60px',
            height: '60px',
            borderBottom: '1.5px solid rgba(224,138,60,0.2)',
            borderLeft: '1.5px solid rgba(224,138,60,0.2)',
            pointerEvents: 'none',
          }} />

          <div style={{
            width: '100%',
            maxWidth: '400px',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
          }}>
            {/* Section header */}
            <div style={{ marginBottom: '40px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
              }}>
                <Sparkles style={{ width: '14px', height: '14px', color: '#e08a3c' }} />
                <span style={{
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: '#b5a998',
                  fontWeight: 600,
                }}>Secure Access</span>
              </div>
              <h2 style={{
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontSize: '34px',
                fontWeight: 500,
                color: '#2c2c2a',
                margin: 0,
                letterSpacing: '-0.01em',
              }}>Welcome back</h2>
              <p style={{
                fontSize: '14px',
                color: '#8a8475',
                marginTop: '8px',
              }}>Sign in to your PrimeaHR account</p>
            </div>

            {/* Login card */}
            <div style={{
              background: '#fbf9f4',
              borderRadius: '20px',
              padding: '36px',
              border: '1px solid #e4ddcd',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.03)',
            }}>
              <form onSubmit={handleLogin}>
                {/* Email field */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#6b6459',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '16px',
                      height: '16px',
                      color: '#b5a998',
                    }} />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@beatricelovingheart.com"
                      required
                      style={{
                        width: '100%',
                        padding: '13px 16px 13px 42px',
                        border: '1px solid #ddd5c4',
                        borderRadius: '12px',
                        fontSize: '14px',
                        color: '#2c2c2a',
                        background: '#f4f1ea',
                        outline: 'none',
                        transition: 'all 0.2s ease',
                        boxSizing: 'border-box',
                      }}
                      onFocus={e => {
                        e.target.style.borderColor = '#e08a3c'
                        e.target.style.boxShadow = '0 0 0 3px rgba(224,138,60,0.1)'
                        e.target.style.background = '#faf8f3'
                      }}
                      onBlur={e => {
                        e.target.style.borderColor = '#ddd5c4'
                        e.target.style.boxShadow = 'none'
                        e.target.style.background = '#f4f1ea'
                      }}
                    />
                  </div>
                </div>

                {/* Password field */}
                {mode === 'password' && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#6b6459',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}>Password</label>
                    <div style={{ position: 'relative' }}>
                      <Lock style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '16px',
                        height: '16px',
                        color: '#b5a998',
                      }} />
                      <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '13px 16px 13px 42px',
                          border: '1px solid #ddd5c4',
                          borderRadius: '12px',
                          fontSize: '14px',
                          color: '#2c2c2a',
                          background: '#f4f1ea',
                          outline: 'none',
                          transition: 'all 0.2s ease',
                          boxSizing: 'border-box',
                        }}
                        onFocus={e => {
                          e.target.style.borderColor = '#e08a3c'
                          e.target.style.boxShadow = '0 0 0 3px rgba(224,138,60,0.1)'
                          e.target.style.background = '#faf8f3'
                        }}
                        onBlur={e => {
                          e.target.style.borderColor = '#ddd5c4'
                          e.target.style.boxShadow = 'none'
                          e.target.style.background = '#f4f1ea'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    fontSize: '13px',
                    marginBottom: '20px',
                  }}>{error}</div>
                )}

                {/* Success message */}
                {message && (
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#15803d',
                    fontSize: '13px',
                    marginBottom: '20px',
                  }}>{message}</div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '14px',
                    border: 'none',
                    borderRadius: '12px',
                    background: loading
                      ? '#c9a07a'
                      : 'linear-gradient(135deg, #e08a3c 0%, #d4762a 100%)',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.25s ease',
                    boxShadow: '0 4px 16px rgba(224,138,60,0.25), 0 1px 3px rgba(224,138,60,0.15)',
                    opacity: loading ? 0.7 : 1,
                    letterSpacing: '0.02em',
                  }}
                  onMouseEnter={e => {
                    if (!loading) {
                      (e.target as HTMLButtonElement).style.boxShadow = '0 6px 24px rgba(224,138,60,0.35), 0 2px 6px rgba(224,138,60,0.2)'
                      ;(e.target as HTMLButtonElement).style.transform = 'translateY(-1px)'
                    }
                  }}
                  onMouseLeave={e => {
                    (e.target as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(224,138,60,0.25), 0 1px 3px rgba(224,138,60,0.15)'
                    ;(e.target as HTMLButtonElement).style.transform = 'translateY(0)'
                  }}
                >
                  {loading ? (
                    <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <>
                      {mode === 'password' ? 'Sign in' : 'Send magic link'}
                      <ArrowRight style={{ width: '16px', height: '16px' }} />
                    </>
                  )}
                </button>
              </form>

              {/* Mode toggle */}
              <div style={{
                marginTop: '24px',
                paddingTop: '20px',
                borderTop: '1px solid #e4ddcd',
                textAlign: 'center',
              }}>
                <button
                  onClick={() => { setMode(mode === 'password' ? 'magic' : 'password'); setError(''); setMessage('') }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#8a8475',
                    fontSize: '13px',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    (e.target as HTMLButtonElement).style.color = '#e08a3c'
                  }}
                  onMouseLeave={e => {
                    (e.target as HTMLButtonElement).style.color = '#8a8475'
                  }}
                >
                  {mode === 'password' ? 'Sign in with magic link instead' : 'Sign in with password instead'}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              textAlign: 'center',
              marginTop: '32px',
              fontSize: '12px',
              color: '#a39d8e',
            }}>
              Protected by PrimeaHR &middot; 256-bit encryption<br />Built and powered by VELOX &ldquo;Automated Operations&rdquo; LLC
            </div>
          </div>
        </div>

        
      </div>
    </>
  )
}
