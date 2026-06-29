"use client"

/* Walk-in identity capture — three desk tools the MoM asks for at registration:
 *
 *   1. Camera   — snap a patient photo (getUserMedia → canvas data URL), with a
 *                 file-input fallback when the webcam is unavailable/denied.
 *   2. Barcode  — keyboard-wedge scan of an existing UHID / patient card. USB
 *                 scanners type the code then Enter; we capture that and emit it.
 *   3. Mobile   — OTP verification of the phone the clerk entered. Demo OTP is
 *                 surfaced via toast (same convention as the ABHA sandbox).
 *
 * Each tool is independent and optional; the form stays the source of truth.
 */

import { useEffect, useRef, useState } from "react"
import { Camera, ScanBarcode, Smartphone, Check, X, RefreshCw, ShieldCheck, Loader2, Upload } from "lucide-react"
import { useAuditStore } from "@/store/useAuditStore"
import { toast } from "sonner"

function Tool({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg bg-white ring-1 ring-slate-200 p-2.5 space-y-2">{children}</div>
}

interface Props {
  phone: string
  photoUrl?: string
  verified?: boolean
  onPhoto: (dataUrl: string) => void
  onClearPhoto: () => void
  onScan: (code: string) => void
  onVerified: (phone: string) => void
  className?: string
}

export function IdentityCaptureCard({ phone, photoUrl, verified, onPhoto, onClearPhoto, onScan, onVerified, className }: Props) {
  const audit = useAuditStore((s) => s.log)

  // ── Camera ──────────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [camOn, setCamOn] = useState(false)
  const [camError, setCamError] = useState(false)

  const stopCam = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCamOn(false)
  }
  useEffect(() => () => stopCam(), [])

  async function startCam() {
    setCamError(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
      streamRef.current = stream
      setCamOn(true)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch {
      setCamError(true)
      fileRef.current?.click()  // fall back to device camera / file picker
    }
  }

  function capturePhoto() {
    const video = videoRef.current
    if (!video) return
    const w = 240
    const h = Math.round((video.videoHeight / video.videoWidth) * w) || 240
    const canvas = document.createElement("canvas")
    canvas.width = w; canvas.height = h
    canvas.getContext("2d")?.drawImage(video, 0, 0, w, h)
    onPhoto(canvas.toDataURL("image/jpeg", 0.7))
    stopCam()
    audit({ action: "reception_registered", resource: "patient_photo", detail: "Patient photo captured at registration desk.", userId: "user", userName: "Reception" })
  }

  function onFile(file?: File) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { if (typeof reader.result === "string") onPhoto(reader.result) }
    reader.readAsDataURL(file)
  }

  // ── Barcode (keyboard wedge) ────────────────────────────────────────────
  const [code, setCode] = useState("")
  function submitScan() {
    const v = code.trim()
    if (!v) return
    onScan(v)
    audit({ action: "reception_registered", resource: "patient_card_scan", resourceId: v, detail: `Scanned patient card / UHID ${v}.`, userId: "user", userName: "Reception" })
    setCode("")
  }

  // ── Mobile OTP ──────────────────────────────────────────────────────────
  const [otpSent, setOtpSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [otp, setOtp] = useState("")
  const expectedRef = useRef<string>("")
  const phoneOk = /^\d{10}$/.test(phone.replace(/\D/g, "").slice(-10)) && phone.replace(/\D/g, "").length === 10

  async function sendOtp() {
    setSending(true)
    await new Promise((r) => setTimeout(r, 500))
    // Demo OTP — deterministic-ish from the phone so it's reproducible on screen.
    const generated = String(((Number(phone.slice(-4)) || 1234) * 7 % 900000) + 100000).slice(0, 6)
    expectedRef.current = generated
    setOtpSent(true)
    setSending(false)
    setOtp("")
    toast.info(`OTP sent to ${phone}`, { description: `Demo code: ${generated}` })
    audit({ action: "reception_registered", resource: "mobile_otp", detail: `OTP dispatched to ${phone} for walk-in verification.`, userId: "user", userName: "Reception" })
  }
  function verifyOtp() {
    if (otp.trim() === expectedRef.current) {
      onVerified(phone)
      toast.success(`Mobile ${phone} verified`)
      audit({ action: "reception_registered", resource: "mobile_otp", detail: `Mobile ${phone} verified via OTP.`, userId: "user", userName: "Reception" })
    } else {
      toast.error("Incorrect OTP — try again")
    }
  }

  return (
    <div className={`rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-50/40 ring-1 ring-emerald-200 overflow-hidden ${className ?? ""}`}>
      <header className="flex items-center gap-2 px-3 py-2 border-b border-emerald-200/60">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
        <h3 className="text-[12.5px] font-semibold text-emerald-800">Verify identity</h3>
        <span className="ml-auto text-[10px] font-medium text-emerald-700">Photo · Card scan · Mobile OTP</span>
      </header>

      <div className="p-3 grid grid-cols-1 gap-2.5">
        {/* Camera */}
        <Tool>
          <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-700">
            <Camera className="h-3.5 w-3.5 text-emerald-600" /> Patient photo
          </div>
          {photoUrl ? (
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="Captured patient" className="h-14 w-14 rounded-lg object-cover ring-1 ring-slate-200" />
              <span className="text-[11.5px] text-emerald-700 font-medium flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Photo captured</span>
              <button type="button" onClick={onClearPhoto} className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700">
                <RefreshCw className="h-3 w-3" /> Retake
              </button>
            </div>
          ) : camOn ? (
            <div className="space-y-2">
              <video ref={videoRef} muted playsInline className="w-full max-h-40 rounded-lg bg-slate-900 object-cover" />
              <div className="flex gap-1.5">
                <button type="button" onClick={capturePhoto} className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11.5px] font-semibold">
                  <Camera className="h-3.5 w-3.5" /> Capture
                </button>
                <button type="button" onClick={stopCam} className="h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11.5px] font-semibold">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-1.5">
              <button type="button" onClick={startCam} className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 text-[11.5px] font-semibold">
                <Camera className="h-3.5 w-3.5" /> Open camera
              </button>
              <button type="button" onClick={() => fileRef.current?.click()} className="h-8 px-3 inline-flex items-center gap-1 rounded-lg bg-white hover:bg-slate-50 text-slate-600 ring-1 ring-slate-200 text-[11.5px] font-semibold">
                <Upload className="h-3.5 w-3.5" /> Upload
              </button>
            </div>
          )}
          {camError && !photoUrl && <p className="text-[10.5px] text-amber-600">Webcam unavailable — pick a photo instead.</p>}
          <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.currentTarget.value = "" }} />
        </Tool>

        {/* Barcode / UHID card */}
        <Tool>
          <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-700">
            <ScanBarcode className="h-3.5 w-3.5 text-emerald-600" /> Scan UHID / patient card
          </div>
          <div className="flex gap-1.5">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitScan() } }}
              placeholder="Scan or type UHID barcode…"
              aria-label="Scan UHID or patient card"
              className="flex-1 h-8 rounded-lg ring-1 ring-slate-200 px-2.5 text-[12px] focus:outline-none focus:ring-emerald-400"
            />
            <button type="button" onClick={submitScan} className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11.5px] font-semibold">Find</button>
          </div>
          <p className="text-[10px] text-slate-400">Hardware scanners type the code and press Enter automatically.</p>
        </Tool>

        {/* Mobile OTP */}
        <Tool>
          <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-700">
            <Smartphone className="h-3.5 w-3.5 text-emerald-600" /> Mobile verification
          </div>
          {verified ? (
            <span className="text-[11.5px] text-emerald-700 font-semibold flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> {phone} verified</span>
          ) : !phoneOk ? (
            <p className="text-[11px] text-slate-400">Enter a 10-digit phone above to send an OTP.</p>
          ) : !otpSent ? (
            <button type="button" onClick={sendOtp} disabled={sending} className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 text-[11.5px] font-semibold disabled:opacity-50">
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Smartphone className="h-3.5 w-3.5" />} Send OTP to {phone}
            </button>
          ) : (
            <div className="flex gap-1.5">
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); verifyOtp() } }}
                placeholder="6-digit OTP"
                inputMode="numeric"
                aria-label="Enter OTP"
                className="flex-1 h-8 rounded-lg ring-1 ring-slate-200 px-2.5 text-[12px] tracking-widest focus:outline-none focus:ring-emerald-400"
              />
              <button type="button" onClick={verifyOtp} className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11.5px] font-semibold">Verify</button>
              <button type="button" onClick={() => setOtpSent(false)} aria-label="Cancel OTP" className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"><X className="h-3.5 w-3.5" /></button>
            </div>
          )}
        </Tool>
      </div>
    </div>
  )
}
