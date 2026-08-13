import { Copy, QrCode, ShieldCheck, UserRound } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../services/api'

function copyText(value) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value)
  const input = document.createElement('textarea')
  input.value = value
  input.setAttribute('readonly', '')
  input.style.position = 'fixed'
  input.style.opacity = '0'
  document.body.appendChild(input)
  input.select()
  const copied = document.execCommand('copy')
  input.remove()
  return copied ? Promise.resolve() : Promise.reject(new Error('Copy unavailable'))
}

function Settings() {
  const [doctor, setDoctor] = useState(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const loadProfile = useCallback(async () => {
    try {
      setError('')
      setDoctor(await apiFetch('/doctors/me'))
    } catch {
      setError('Unable to load your profile right now. Please try again.')
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadProfile() }, 0)
    return () => window.clearTimeout(timer)
  }, [loadProfile])

  const copyCode = async () => {
    if (!doctor?.doctor_code) return
    try {
      await copyText(doctor.doctor_code)
      setNotice('Code copied')
    } catch {
      setNotice('Unable to copy the code. Please select it manually.')
    }
    window.setTimeout(() => setNotice(''), 2200)
  }

  return (
    <div className="page-content settings-page">
      <section className="settings-header"><span className="eyebrow">PROFILE</span><h3>Your doctor profile</h3><p>Your permanent patient-join identity.</p></section>
      {error && <div className="form-error" role="alert">{error} <button type="button" onClick={loadProfile}>Try again</button></div>}
      <section className="settings-grid">
        <article className="settings-card">
          <div className="settings-card-heading"><div className="settings-card-icon"><UserRound size={19} /></div><div><h4>{doctor?.name || 'Loading profile…'}</h4><p>{doctor?.email || 'Authenticated VaaniDoc doctor'}</p></div></div>
          <div className="settings-list">
            <div className="settings-row"><div><strong>Permanent VAN code</strong><span>{doctor?.doctor_code || '—'}</span></div><button type="button" className="settings-copy-button" onClick={copyCode} disabled={!doctor?.doctor_code} aria-label="Copy permanent VAN code" title="Copy permanent VAN code"><Copy size={16} /></button></div>
            <div className="settings-row"><div><strong>Patient join link</strong><span>{doctor?.qr_value ? 'Available through your QR code' : 'Loading…'}</span></div><QrCode size={17} aria-hidden="true" /></div>
          </div>
          {notice && <div className="settings-copy-success" role="status">{notice}</div>}
        </article>
        <article className="settings-card privacy-settings-card"><div className="settings-card-heading"><div className="settings-card-icon"><ShieldCheck size={19} /></div><div><h4>Privacy by session</h4><p>Patient content is removed when a consultation ends.</p></div></div><div className="privacy-settings-note"><strong>AI-assisted intake only</strong><p>VaaniDoc structures patient-reported information. It does not diagnose or prescribe treatment.</p></div></article>
      </section>
    </div>
  )
}

export default Settings
