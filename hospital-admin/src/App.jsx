import React from 'react'
import { Building2, ShieldCheck, Stethoscope, Users } from 'lucide-react'

export default function App() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '3rem 2rem',
        maxWidth: '560px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          display: 'inline-flex',
          padding: '1rem',
          borderRadius: '50%',
          backgroundColor: 'rgba(14, 165, 233, 0.15)',
          color: '#38bdf8',
          marginBottom: '1.5rem'
        }}>
          <Building2 size={40} />
        </div>

        <h1 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.5rem', color: '#ffffff' }}>
          VaaniDoc Hospital Admin
        </h1>
        
        <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: '1.6', marginBottom: '2rem' }}>
          System Administration & Multi-Doctor Roster Management Portal.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          textAlign: 'left',
          marginBottom: '2rem'
        }}>
          <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '10px' }}>
            <Stethoscope size={20} color="#38bdf8" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#f1f5f9' }}>Doctor Roster</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Manage doctor registration codes</div>
          </div>
          <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '10px' }}>
            <ShieldCheck size={20} color="#34d399" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#f1f5f9' }}>Audit & Privacy</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Monitor session auto-purging</div>
          </div>
        </div>

        <div style={{
          fontSize: '0.85rem',
          color: '#38bdf8',
          background: 'rgba(56, 189, 248, 0.1)',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          border: '1px solid rgba(56, 189, 248, 0.2)'
        }}>
          Phase 2 Extension Module • Active Core: Patient App & Doctor Dashboard
        </div>
      </div>
    </div>
  )
}
