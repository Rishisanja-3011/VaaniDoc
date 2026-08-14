import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { ArrowLeft, RefreshCw, CameraOff, QrCode, AlertTriangle } from 'lucide-react'
import { extractCodeFromQR } from '../services/doctorService.js'

const QR_ELEMENT_ID = 'qr-reader'

export default function QRScanner() {
  const navigate = useNavigate()
  const scannerRef = useRef(null)
  const [status, setStatus] = useState('starting') // starting | scanning | error | invalid
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const scanner = new Html5Qrcode(QR_ELEMENT_ID)
    scannerRef.current = scanner
    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      (decodedText) => {
        const code = extractCodeFromQR(decodedText)
        if (code) { stopScanner(scanner); navigate(`/confirm/${code}`) }
        else       { stopScanner(scanner); setStatus('invalid') }
      },
      () => {}
    )
      .then(() => setStatus('scanning'))
      .catch((err) => {
        const msg = String(err)
        if (msg.includes('Permission') || msg.includes('NotAllowed'))
          setErrorMsg('Camera access was denied. Please allow camera access in your browser settings.')
        else if (msg.includes('NotFound') || msg.includes('no camera'))
          setErrorMsg('No camera was found on this device.')
        else
          setErrorMsg('Could not start the camera. Please try again.')
        setStatus('error')
      })
    return () => stopScanner(scanner)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function stopScanner(s) { s.isScanning && s.stop().catch(() => {}) }

  return (
    <div style={s.screen}>
      {/* Header */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate('/')}>
          <ArrowLeft size={18} />
        </button>
        <div style={s.headerCenter}>
          <QrCode size={16} color="rgba(255,255,255,0.8)" />
          <span style={s.headerTitle}>Scan Doctor QR</span>
        </div>
        <div style={{ width: 40 }} />
      </div>

      {/* Camera — always in DOM */}
      <div style={{ ...s.viewportWrap, display: status ==='starting' || status ==='scanning' ? 'flex' : 'none', }}>
        <div style={s.scanFrame}>
          <div id={QR_ELEMENT_ID} style={s.viewport} />
          {/* Corner decorations */}
          <div style={{ ...s.corner, top: 0, left: 0, borderTop: '3px solid var(--teal)', borderLeft: '3px solid var(--teal)' }} />
          <div style={{ ...s.corner, top: 0, right: 0, borderTop: '3px solid var(--teal)', borderRight: '3px solid var(--teal)' }} />
          <div style={{ ...s.corner, bottom: 0, left: 0, borderBottom: '3px solid var(--teal)', borderLeft: '3px solid var(--teal)' }} />
          <div style={{ ...s.corner, bottom: 0, right: 0, borderBottom: '3px solid var(--teal)', borderRight: '3px solid var(--teal)' }} />
        </div>
        <p style={s.hint}>Point your camera at the doctor's QR code</p>
        <button style={s.manualBtn} onClick={() => navigate('/')}>
          Enter Code Manually
        </button>
      </div>

      {/* Hidden mount for non-scanning states */}
      {status !== 'scanning' && <div id={QR_ELEMENT_ID} style={{ display: 'none' }} />}

      {status === 'starting' && (
        <div style={s.centerBox}>
          <div style={s.spinner} />
          <p style={s.msgText}>Starting camera…</p>
        </div>
      )}

      {status === 'error' && (
        <div style={s.centerBox}>
          <div style={s.errorIcon}><CameraOff size={32} color="var(--red)" /></div>
          <p style={s.errorTitle}>Camera unavailable</p>
          <p style={s.errorMsg}>{errorMsg}</p>
          <button style={s.retryBtn} onClick={() => navigate(0)}>
            <RefreshCw size={15} /> Try Again
          </button>
          <button style={s.secondaryBtn} onClick={() => navigate('/')}>
            Enter Code Manually
          </button>
        </div>
      )}

      {status === 'invalid' && (
        <div style={s.centerBox}>
          <div style={s.warnIcon}><AlertTriangle size={32} color="var(--amber)" /></div>
          <p style={s.errorTitle}>Invalid QR Code</p>
          <p style={s.errorMsg}>This QR code is not a valid VaaniDoc doctor code. Please ask your doctor for the correct QR.</p>
          <button style={s.retryBtn} onClick={() => navigate(0)}>
            <RefreshCw size={15} /> Scan Again
          </button>
          <button style={s.secondaryBtn} onClick={() => navigate('/')}>
            Enter Code Manually
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

const s = {
  screen: { minHeight: '100svh', display: 'flex', flexDirection: 'column', background: '#0a0f1a' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 16px', background: 'var(--navy)',
  },
  backBtn: {
    width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8, cursor: 'pointer', color: '#fff',
  },
  headerCenter: { display: 'flex', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 16, fontWeight: 600, color: '#fff' },
  viewportWrap: {
    flex: 1, flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 20, padding: '24px 16px',
  },
  scanFrame: { position: 'relative', width: 280, height: 280 },
  viewport: { width: 280, height: 280, borderRadius: 12, overflow: 'hidden' },
  corner: { position: 'absolute', width: 24, height: 24, borderRadius: 2 },
  hint: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', margin: 0 },
  manualBtn: {
    padding: '11px 24px', borderRadius: 10,
    border: '1.5px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: 500, cursor: 'pointer',
  },
  centerBox: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 14, padding: '32px 24px',
  },
  errorIcon: {
    width: 72, height: 72, borderRadius: '50%', background: 'var(--red-light)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  warnIcon: {
    width: 72, height: 72, borderRadius: '50%', background: 'var(--amber-light)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  errorTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' },
  errorMsg: { margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.65)', textAlign: 'center', maxWidth: 300, lineHeight: 1.6 },
  spinner: {
    width: 40, height: 40, border: '3px solid rgba(255,255,255,0.15)',
    borderTop: '3px solid var(--teal)', borderRadius: '50%', animation: 'spin 0.9s linear infinite',
  },
  msgText: { fontSize: 15, color: 'rgba(255,255,255,0.7)', margin: 0 },
  retryBtn: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '13px 28px',
    borderRadius: 10, border: 'none', background: 'var(--teal)',
    color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '11px 24px', borderRadius: 10,
    border: '1.5px solid rgba(255,255,255,0.2)', background: 'transparent',
    color: 'rgba(255,255,255,0.75)', fontSize: 14, cursor: 'pointer',
  },
}
