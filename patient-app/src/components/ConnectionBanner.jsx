import { WifiOff, CheckCircle, Wifi } from 'lucide-react'
import { useOnlineStatus } from '../hooks/useOnlineStatus.js'

export default function ConnectionBanner() {
  const { online, wasOffline } = useOnlineStatus()
  if (online && !wasOffline) return null

  if (!online) {
    return (
      <div style={{ ...s.banner, background: 'var(--amber-light)', borderColor: 'var(--amber-border)', color: 'var(--amber)' }}>
        <WifiOff size={14} />
        <span>No internet connection — your input is saved and will be sent when you reconnect.</span>
      </div>
    )
  }
  return (
    <div style={{ ...s.banner, background: 'var(--green-light)', borderColor: 'var(--green-border)', color: 'var(--green)' }}>
      <CheckCircle size={14} />
      <span>Back online — syncing your information…</span>
    </div>
  )
}

const s = {
  banner: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '9px 16px', fontSize: 13, fontWeight: 500,
    borderBottom: '1px solid', lineHeight: 1.4,
  },
}
