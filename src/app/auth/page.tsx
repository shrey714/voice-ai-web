'use client'
import { useState, useEffect, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { cn, safeRedirectPath } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GrainientBackground } from '@/components/GrainientBackground'
import {
  Phone, ArrowLeft, ShieldCheck, RotateCcw,
  ChevronRight, Loader2, Store, Check, AlertCircle,
} from 'lucide-react'

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = safeRedirectPath(searchParams.get('redirect'))

  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', ''])
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(0)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace(redirectTo)
    })
  }, [router, redirectTo])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  useEffect(() => {
    if (step === 'otp') setTimeout(() => otpRefs.current[0]?.focus(), 150)
  }, [step])

  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '')
    return digits.startsWith('91') ? `+${digits}` : `+91${digits}`
  }

  const sendOtp = async () => {
    const formatted = formatPhone(phone)
    if (formatted.replace(/\D/g, '').length < 12) { setError('Enter a valid 10-digit mobile number.'); return }
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithOtp({ phone: formatted })
    setLoading(false)
    if (err) { setError(err.message); return }
    setStep('otp')
    setCountdown(30)
  }

  const otpString = otp.join('')

  // Accepts the code explicitly so auto-submit can pass the fresh value instead
  // of reading `otpString` from a stale render closure (which was still 5 digits
  // at the moment the 6th was typed → a spurious "Enter the 6-digit code" error).
  const verifyOtp = async (code?: string) => {
    const value = code ?? otpString
    if (value.length !== 6) { setError('Enter the 6-digit code.'); return }
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.verifyOtp({
      phone: formatPhone(phone), token: value, type: 'sms',
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    router.replace(redirectTo)
  }

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[index] = digit
    setOtp(next)
    if (digit && index < 5) otpRefs.current[index + 1]?.focus()
    const joined = next.join('')
    if (joined.length === 6) verifyOtp(joined)
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus()
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const next = [...otp]
    pasted.split('').forEach((ch, i) => { if (i < 6) next[i] = ch })
    setOtp(next)
    if (pasted.length === 6) verifyOtp(pasted)
    else otpRefs.current[pasted.length]?.focus()
  }

  return (
    <div className="min-h-screen bg-background relative isolate flex flex-col">
      <GrainientBackground className="absolute inset-0 -z-10" />
      {/* Top nav */}
      <div className="flex items-center gap-2 p-4 sm:p-6 pb-0!">
        {step === 'otp' && (
          <button
            onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); setError('') }}
            className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={15} /> Back
          </button>
        )}
        <div className={cn('flex items-center gap-2', step === 'phone' && 'ml-auto mr-auto sm:ml-0 sm:mr-0')}>
          <div className="size-7 bg-primary rounded-lg flex items-center justify-center">
            <Store size={14} className="text-primary-foreground" />
          </div>
          <span className="font-black text-[16px] text-foreground">ShopNear</span>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="w-full max-w-sm space-y-6">
          {/* Icon + heading */}
          <div className="text-center space-y-3">
            <div className="size-16 rounded-2xl mx-auto flex items-center justify-center bg-chart-1/20 text-chart-1 shadow-sm transition-all duration-300">
              {step === 'phone'
                ? <Phone size={26} />
                : <ShieldCheck size={26} />}
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">
                {step === 'phone' ? 'Sign in to order' : 'Verify your number'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                {step === 'phone'
                  ? 'Enter your mobile number to receive a one-time verification code'
                  : `We sent a 6-digit code to +91 ${phone.slice(-10)}`}
              </p>
            </div>
          </div>

          {/* Card */}
          <div className="relative liquid-surface rounded-2xl border border-border shadow-sm p-5 space-y-4">
            {step === 'phone' ? (
              <>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Mobile Number</label>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1.5 bg-muted border border-border rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground shrink-0 select-none">
                      +91
                    </div>
                    <Input
                      type="tel"
                      inputMode="numeric"
                      placeholder="98765 43210"
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      onKeyDown={e => e.key === 'Enter' && sendOtp()}
                      autoFocus
                      className="text-base font-semibold tracking-wider"
                    />
                  </div>
                </div>

                {error && (
                  <div role="alert" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium border border-destructive/25 bg-destructive/10 text-destructive animate-fade-in">
                    <AlertCircle size={14} className="shrink-0" /> {error}
                  </div>
                )}

                <Button className="w-full gap-2" size="lg" onClick={sendOtp} disabled={loading || phone.replace(/\D/g, '').length < 10}>
                  {loading ? <Loader2 size={17} className="animate-spin" /> : null}
                  {loading ? 'Sending OTP…' : 'Send OTP'}
                  {!loading && <ChevronRight size={17} />}
                </Button>
              </>
            ) : (
              <>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-3">Verification Code</label>
                  <div className="flex gap-2 justify-between" onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={el => { otpRefs.current[i] = el }}
                        type="tel"
                        inputMode="numeric"
                        autoComplete={i === 0 ? 'one-time-code' : 'off'}
                        maxLength={1}
                        value={digit}
                        aria-label={`Verification code digit ${i + 1} of 6`}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(i, e)}
                        className={cn(
                          // min-w-0 is load-bearing: a bare <input> has a browser-default
                          // intrinsic width that flex-1 can't shrink below on its own,
                          // which pushed these boxes off-screen on narrow phones.
                          'flex-1 min-w-0 h-12 text-center text-xl font-black rounded-xl border-2 outline-none transition-all duration-150 bg-muted text-foreground',
                          digit ? 'border-primary bg-primary/10 text-primary' : 'border-border',
                          'focus:border-primary focus:bg-card focus:ring-3 focus:ring-primary/10',
                        )}
                      />
                    ))}
                  </div>
                </div>

                {error && (
                  <div role="alert" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium border border-destructive/25 bg-destructive/10 text-destructive animate-fade-in">
                    <AlertCircle size={14} className="shrink-0" /> {error}
                  </div>
                )}

                <Button className="w-full gap-2 mb-0" size="lg" onClick={() => verifyOtp()} disabled={loading || otpString.length !== 6}>
                  {loading ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}
                  {loading ? 'Verifying…' : 'Verify & Continue'}
                </Button>

                <div className="flex flex-col items-center gap-2 pt-2">
                  {countdown > 0 ? (
                    <p className="text-xs text-muted-foreground">Resend code in <span className="font-bold text-foreground">{countdown}s</span></p>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => { setOtp(['', '', '', '', '', '']); otpRefs.current[0]?.focus(); sendOtp() }} className="gap-1.5 text-sm">
                      <RotateCcw size={13} /> Resend OTP
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground leading-relaxed px-4 flex items-center justify-center gap-1.5">
            <span>Your number is used only for order verification. We never share your data.</span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  )
}
