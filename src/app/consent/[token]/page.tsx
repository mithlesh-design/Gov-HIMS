"use client"

import { use, useEffect, useRef, useState } from "react"
import { useConsentStore } from "@/store/useConsentStore"
import { useInpatientStore } from "@/store/useInpatientStore"
import { useNotificationStore } from "@/store/useNotificationStore"
import { useAuditStore } from "@/store/useAuditStore"
import { validateFamilyToken } from "@/lib/familyToken"
import { generateConsentForm, type ConsentFormContent } from "@/ai-services/consent-form-generator"
import { SignaturePad } from "@/components/consent/SignaturePad"
import {
  Shield, CheckCircle, AlertTriangle, Clock, ChevronRight,
  Hospital, FileText, PenLine, Loader2, Lock,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Rehydrate stores once (SSR-safe) ──────────────────────────────────────────
function useHydrated() {
  const [ok, setOk] = useState(false)
  useEffect(() => {
    useConsentStore.persist.rehydrate()
    useInpatientStore.persist.rehydrate()
    useNotificationStore.persist.rehydrate()
    setOk(true)
  }, [])
  return ok
}

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            i < step ? "w-4 bg-[var(--color-primary)]" : i === step ? "w-6 bg-[var(--color-primary)]" : "w-2 bg-slate-200",
          )}
        />
      ))}
    </div>
  )
}

// ── Error screen ──────────────────────────────────────────────────────────────
function ConsentErrorScreen({ reason }: { reason: string }) {
  const messages: Record<string, { title: string; body: string }> = {
    expired:      { title: 'Link Expired', body: 'This consent link has expired. Please ask the doctor to send a new link.' },
    invalid:      { title: 'Invalid Link', body: 'This consent link is invalid or has already been used. Please contact the hospital.' },
    already_signed: { title: 'Already Signed', body: 'Consent has already been submitted for this procedure. No further action is needed.' },
    missing:      { title: 'Link Not Found', body: 'This consent link could not be found. Please ask the doctor to resend it.' },
  }
  const msg = messages[reason] ?? messages.invalid
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        <div className="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">{msg.title}</h1>
        <p className="text-slate-500 text-sm leading-relaxed">{msg.body}</p>
        <p className="mt-6 text-xs text-slate-400">Agentix HIMS · Secure Consent Portal</p>
      </div>
    </div>
  )
}

// ── OTP input row ─────────────────────────────────────────────────────────────
function OtpInput({ onComplete }: { onComplete: (otp: string) => void }) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const update = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return
    const next = [...digits]
    next[i] = val
    setDigits(next)
    if (val && i < 5) refs.current[i + 1]?.focus()
    if (next.every(d => d !== '')) onComplete(next.join(''))
  }

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setDigits(pasted.split(''))
      onComplete(pasted)
      refs.current[5]?.focus()
    }
    e.preventDefault()
  }

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => update(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          className={cn(
            "w-11 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-colors",
            d ? "border-[var(--color-primary)] bg-[rgba(8,145,178,0.07)] text-[var(--color-primary-dark)]" : "border-slate-200 bg-white text-slate-900",
            "focus:border-[var(--color-primary)] focus:bg-[rgba(8,145,178,0.07)]",
          )}
          autoFocus={i === 0}
        />
      ))}
    </div>
  )
}

// ── Section block for consent form content ────────────────────────────────────
function ConsentSection({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
      </div>
      <ul className="space-y-1.5 pl-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-slate-600 leading-relaxed">
            <span className="text-slate-300 mt-1 flex-shrink-0">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ConsentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const hydrated = useHydrated()

  const getByToken   = useConsentStore(s => s.getByToken)
  const markViewed   = useConsentStore(s => s.markViewed)
  const verifyOTP    = useConsentStore(s => s.verifyOTP)
  const signConsent  = useConsentStore(s => s.signConsent)
  const signIPD      = useInpatientStore(s => s.signConsent)
  const addNotif     = useNotificationStore(s => s.add)
  const auditLog     = useAuditStore(s => s.log)

  const [step, setStep] = useState(0)   // 0=loading, 1=info, 2=otp, 3=form, 4=done
  const [error, setError] = useState<string | null>(null)
  const [otpError, setOtpError] = useState(false)
  const [consentContent, setConsentContent] = useState<ConsentFormContent | null>(null)
  const [loadingForm, setLoadingForm] = useState(false)
  const [declared, setDeclared] = useState(false)
  const [sig, setSig] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const record = hydrated ? getByToken(token) : undefined

  // On hydration: validate token + mark viewed
  useEffect(() => {
    if (!hydrated) return
    if (!record) { setError('missing'); return }
    if (record.status === 'signed') { setError('already_signed'); return }

    const result = validateFamilyToken(token, record.patientId)
    if (!result.ok) {
      setError(result.reason === 'expired' ? 'expired' : 'invalid')
      return
    }

    markViewed(record.id)
    auditLog({
      userId: 'public_consent',
      userName: record.nok.name || 'Next of Kin',
      action: 'consent_viewed',
      resource: 'consent',
      resourceId: record.id,
      detail: `Consent link opened for ${record.procedureName} · patient ${record.patientName}`,
    })
    setStep(1)
  }, [hydrated]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleOtp = (entered: string) => {
    if (!record) return
    const ok = verifyOTP(record.id, entered)
    if (!ok) { setOtpError(true); return }
    setOtpError(false)
    setStep(3)
    // Load AI consent form
    setLoadingForm(true)
    generateConsentForm(record.procedureName, record.patientName).then(env => {
      setConsentContent(env.data)
      setLoadingForm(false)
    })
  }

  const handleSubmit = async () => {
    if (!record || !sig || !declared) return
    setSubmitting(true)
    const ok = signConsent(record.id, sig, record.nok.name)
    if (!ok) { setSubmitting(false); setError('invalid'); return }

    // Update IPD surgery consent flag
    signIPD(record.patientId, { signedBy: record.nok.name, signedAt: new Date().toISOString() })

    // Notify doctor
    addNotif({
      type: 'consent_signed',
      priority: 'high',
      title: `Consent received · ${record.patientName}`,
      body: `${record.nok.name} (${record.nok.relationship}) has signed consent for ${record.procedureName}. Procedure may now proceed.`,
      targetRole: 'doctor',
      patientName: record.patientName,
      channels: ['in_app'],
      link: `/doctor/ipd/${record.patientId}`,
    })

    auditLog({
      userId: 'public_consent',
      userName: record.nok.name,
      action: 'consent_signed',
      resource: 'consent',
      resourceId: record.id,
      detail: `Digital consent signed for ${record.procedureName} by ${record.nok.name} (${record.nok.relationship})`,
    })

    setSubmitting(false)
    setStep(4)
  }

  // ── Loading ──
  if (!hydrated || step === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[var(--color-primary)] animate-spin" />
      </div>
    )
  }

  // ── Error screen ──
  if (error) return <ConsentErrorScreen reason={error} />

  if (!record) return <ConsentErrorScreen reason="missing" />

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Security banner */}
      <div className="bg-[var(--color-primary)] px-4 py-2.5 text-center">
        <p className="text-xs text-[rgba(255,255,255,0.75)] flex items-center justify-center gap-1.5">
          <Lock className="h-3 w-3" />
          Secure Digital Consent Portal · Agentix HIMS
        </p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Hospital branding */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
            <Hospital className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm">Agentix HIMS</p>
            <p className="text-xs text-slate-500">Digital Consent Form</p>
          </div>
        </div>

        {/* ── Step 1: Procedure Info ── */}
        {step === 1 && (
          <div>
            <StepDots step={0} total={3} />
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="text-center">
                <div className="h-14 w-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-amber-200">
                  <FileText className="h-7 w-7 text-amber-600" />
                </div>
                <h1 className="text-xl font-bold text-slate-900">Consent Required</h1>
                <p className="text-sm text-slate-500 mt-1">Your signature is needed to proceed</p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Patient</span>
                  <span className="font-bold text-slate-800">{record.patientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Procedure</span>
                  <span className="font-bold text-slate-800 text-right max-w-[55%]">{record.procedureName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Doctor</span>
                  <span className="font-bold text-slate-800">{record.requestedBy}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Expires</span>
                  <span className="flex items-center gap-1 text-amber-700 font-semibold">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(record.expiresAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed bg-[rgba(8,145,178,0.07)] rounded-xl p-3 border border-[rgba(8,145,178,0.15)]">
                You are being asked to provide consent as the next-of-kin / legal guardian of the above patient. Please read the consent form carefully before signing.
              </p>

              <button
                onClick={() => setStep(2)}
                className="w-full h-12 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] active:scale-[0.98] text-white font-bold flex items-center justify-center gap-2 transition-all"
              >
                Continue to Verify <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: OTP ── */}
        {step === 2 && (
          <div>
            <StepDots step={1} total={3} />
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="text-center">
                <div className="h-14 w-14 bg-[rgba(8,145,178,0.07)] rounded-full flex items-center justify-center mx-auto mb-3 border border-[rgba(8,145,178,0.20)]">
                  <Shield className="h-7 w-7 text-[var(--color-primary)]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Verify Identity</h2>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Enter the 6-digit code provided by the treating doctor
                </p>
              </div>

              <OtpInput onComplete={handleOtp} />

              {otpError && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold border border-red-200">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  Incorrect code. Please check with the doctor and try again.
                </div>
              )}

              <p className="text-center text-xs text-slate-400">
                This code was shared with your doctor when they sent the consent link.
              </p>
            </div>
          </div>
        )}

        {/* ── Step 3: Consent Form ── */}
        {step === 3 && (
          <div>
            <StepDots step={2} total={3} />
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[var(--color-primary)]" />
                  Consent for {record.procedureName}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Please read all sections before signing</p>
              </div>

              <div className="px-6 py-5 max-h-[55vh] overflow-y-auto">
                {loadingForm ? (
                  <div className="space-y-3 py-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className={cn("h-3 bg-slate-100 rounded-full animate-pulse", i % 3 === 2 ? "w-3/4" : "w-full")} />
                    ))}
                    <p className="text-xs text-center text-slate-400 pt-2 flex items-center justify-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" /> Generating consent form…
                    </p>
                  </div>
                ) : consentContent && (
                  <div className="text-sm">
                    <div className="mb-5 p-4 bg-[rgba(8,145,178,0.07)] rounded-xl border border-[rgba(8,145,178,0.15)]">
                      <h3 className="font-bold text-[var(--color-primary-dark)] text-sm mb-1.5">Procedure Overview</h3>
                      <p className="text-[var(--color-primary-dark)] leading-relaxed text-xs">{consentContent.procedureOverview}</p>
                    </div>

                    <ConsentSection
                      title="Risks"
                      items={consentContent.risks}
                      icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
                    />
                    <ConsentSection
                      title="Benefits"
                      items={consentContent.benefits}
                      icon={<CheckCircle className="h-4 w-4 text-emerald-500" />}
                    />
                    <ConsentSection
                      title="Alternatives"
                      items={consentContent.alternatives}
                      icon={<ChevronRight className="h-4 w-4 text-slate-400" />}
                    />
                    <ConsentSection
                      title="Your Rights as a Patient"
                      items={consentContent.patientRights}
                      icon={<Shield className="h-4 w-4 text-[var(--color-primary)]" />}
                    />

                    <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <h3 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-1.5">
                        <PenLine className="h-4 w-4 text-slate-600" /> Declaration
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{consentContent.declarationText}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Signature + submit area */}
              {!loadingForm && consentContent && (
                <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/40 space-y-4">
                  {/* Declaration checkbox */}
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={declared}
                      onChange={e => setDeclared(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded accent-blue-600 cursor-pointer flex-shrink-0"
                    />
                    <span className="text-xs text-slate-600 leading-relaxed">
                      I have read and understood the consent form above, and I give my informed consent for this procedure.
                    </span>
                  </label>

                  {/* Signature pad */}
                  <SignaturePad
                    onSignature={b64 => setSig(b64)}
                    onClear={() => setSig(null)}
                    disabled={!declared}
                  />

                  {!declared && (
                    <p className="text-[11px] text-slate-400 text-center">Check the declaration above to enable signing</p>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={!declared || !sig || submitting}
                    className="w-full h-12 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] active:scale-[0.98] text-white font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    {submitting ? 'Submitting…' : 'Submit Consent'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Step 4: Confirmation ── */}
        {step === 4 && (
          <div className="text-center py-8">
            <div className="h-20 w-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5 border-2 border-emerald-200 shadow-sm">
              <CheckCircle className="h-10 w-10 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Consent Submitted</h1>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto mb-6">
              Thank you, {record.nok.name}. Your consent for <strong>{record.procedureName}</strong> has been
              received and the medical team has been notified.
            </p>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 text-left text-sm space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-slate-500">Patient</span>
                <span className="font-bold text-slate-800">{record.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Signed by</span>
                <span className="font-bold text-slate-800">{record.nok.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Relationship</span>
                <span className="font-bold text-slate-800">{record.nok.relationship}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Time</span>
                <span className="font-bold text-slate-800">{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            {/* Signature thumbnail */}
            {sig && (
              <div className="bg-white rounded-xl border border-slate-200 p-3 mb-5 inline-block">
                <p className="text-xs text-slate-400 mb-1 text-center">Your signature</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sig} alt="Signature" className="h-12 w-auto mx-auto" />
              </div>
            )}

            <p className="text-xs text-slate-400">You may safely close this window.</p>
            <p className="mt-4 text-xs text-slate-300">Agentix HIMS · Secure Consent Portal</p>
          </div>
        )}
      </div>
    </div>
  )
}
