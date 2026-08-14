import {
  Activity, ArrowRight, CheckCircle2, ClipboardList, Languages,
  Mic, QrCode, ShieldCheck, Stethoscope, UserRound, Sparkles, Smartphone
} from 'lucide-react'

const DOCTOR_URL = 'https://vaani-doc-doctordashboard.vercel.app'
const PATIENT_URL = 'https://vaani-doc-kappa.vercel.app'

function App() {
  const go = (url) => { window.location.href = url }

  const steps = [
    [1, Stethoscope, 'Doctor registers', 'The doctor creates an account and receives a permanent doctor code and QR.'],
    [2, QrCode, 'Patient connects', 'The patient scans the doctor QR or enters the doctor code.'],
    [3, Mic, 'Patient describes symptoms', 'The patient uses voice or text in the language they are comfortable with.'],
    [4, ClipboardList, 'Doctor receives intake', 'AI-assisted processing turns the input into a concise structured intake for review.'],
  ]

  return (
    <div className="site">
      <header className="nav">
        <a className="brand" href="#top">
          <span className="brand-mark"><Activity size={21} strokeWidth={2.6}/></span>
          <span><strong>VaaniDoc</strong><small>Multilingual AI Health Intake</small></span>
        </a>
        <nav className="nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#features">Features</a>
          <a href="#demo">Demo</a>
        </nav>
        <button className="nav-cta" onClick={() => go(DOCTOR_URL)}>Start Demo <ArrowRight size={16}/></button>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <div className="pill"><span className="pulse-dot"/> Built for multilingual patient intake</div>
            <h1>Let patients speak naturally.<span> Help doctors start prepared.</span></h1>
            <p className="hero-text">
              VaaniDoc connects patients and doctors through a simple QR-based consultation flow.
              Patients can describe symptoms by voice or text in their preferred language, while
              doctors receive a structured AI-assisted intake before consultation.
            </p>
            <div className="hero-actions">
              <button className="primary-btn" onClick={() => go(DOCTOR_URL)}>
                <Stethoscope size={19}/> I'm a Doctor <ArrowRight size={17}/>
              </button>
              <button className="secondary-btn" onClick={() => go(PATIENT_URL)}>
                <UserRound size={19}/> I'm a Patient <ArrowRight size={17}/>
              </button>
            </div>
            <p className="micro-note">No patient account required to start an intake.</p>
          </div>

          <div className="hero-visual">
            <div className="glow glow-one"/><div className="glow glow-two"/>
            <div className="dashboard-window">
              <div className="window-bar">
                <div className="window-dots"><i/><i/><i/></div>
                <span>VaaniDoc consultation</span>
                <span className="secure"><ShieldCheck size={13}/> secure session</span>
              </div>
              <div className="flow-card">
                <div className="flow-icon doctor-icon"><Stethoscope size={22}/></div>
                <div><small>DOCTOR</small><strong>Doctor dashboard</strong><span>Permanent QR & doctor code</span></div>
                <CheckCircle2 className="check" size={20}/>
              </div>
              <div className="connector"><span/><QrCode size={22}/><span/></div>
              <div className="flow-card active">
                <div className="flow-icon patient-icon"><Smartphone size={22}/></div>
                <div><small>PATIENT</small><strong>Connected via QR</strong><span>Voice / text symptom intake</span></div>
                <span className="live">LIVE</span>
              </div>
              <div className="mini-intake">
                <div className="mini-head"><span><Sparkles size={15}/> AI-assisted intake</span><span>English summary</span></div>
                <div className="mini-lines"><span/><span/><span/></div>
                <div className="mini-tags"><b>Symptoms</b><b>Duration</b><b>Urgency</b></div>
              </div>
            </div>
          </div>
        </section>

        <section className="trust-strip">
          <div><QrCode size={19}/> QR-based doctor connection</div>
          <div><Languages size={19}/> Preferred-language input</div>
          <div><Mic size={19}/> Voice or text</div>
          <div><ShieldCheck size={19}/> Temporary consultation session</div>
        </section>

        <section id="how-it-works" className="section">
          <div className="section-heading">
            <span className="eyebrow">THE WORKFLOW</span>
            <h2>One simple path from patient to doctor.</h2>
            <p>Designed so a first-time user can understand the flow without training.</p>
          </div>
          <div className="steps">
            {steps.map(([n, Icon, title, text]) => (
              <article className="step-card" key={n}>
                <div className="step-number">{n}</div>
                <div className="step-icon"><Icon size={21}/></div>
                <h3>{title}</h3><p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="features" className="section feature-section">
          <div className="section-heading left">
            <span className="eyebrow">WHY VAANIDOC</span>
            <h2>Built around the real consultation handoff.</h2>
          </div>
          <div className="feature-grid">
            {[
              [Languages, 'Multilingual by design', 'Patients can communicate in their preferred language instead of being forced into an English-first intake.'],
              [Mic, 'Voice + text input', 'Patients can speak naturally or type their symptoms, depending on what is easiest for them.'],
              [Sparkles, 'AI-assisted structure', 'The system organizes patient input into a concise clinical intake to help the doctor review it faster.'],
              [QrCode, 'Permanent doctor QR', 'Each doctor has a reusable QR/code, so a new QR does not need to be created for every consultation.'],
              [ShieldCheck, 'Session-focused privacy', 'Patient information is designed around the active consultation session rather than a permanent patient record.'],
              [UserRound, 'Doctor-first review', 'AI output is assistance for the doctor; it does not replace clinical judgment or provide a diagnosis.'],
            ].map(([Icon, title, text]) => (
              <article key={title}>
                <div className="feature-icon"><Icon size={21}/></div>
                <h3>{title}</h3><p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="demo" className="demo-section">
          <div className="demo-copy">
            <span className="eyebrow">HACKATHON DEMO</span>
            <h2>Try the complete workflow.</h2>
            <p>
              For the clearest demo, open the Doctor Dashboard first, register a doctor,
              note the generated QR/code, then open the Patient App and connect to that doctor.
            </p>
            <div className="demo-checks">
              <div><CheckCircle2 size={17}/> Doctor registration</div>
              <div><CheckCircle2 size={17}/> Permanent QR generation</div>
              <div><CheckCircle2 size={17}/> Patient QR/code connection</div>
              <div><CheckCircle2 size={17}/> Voice/text intake</div>
              <div><CheckCircle2 size={17}/> Doctor queue & AI intake review</div>
            </div>
          </div>
          <div className="demo-actions">
            <button onClick={() => go(DOCTOR_URL)} className="demo-doctor">
              <span><Stethoscope size={22}/></span>
              <div><strong>Open Doctor Dashboard</strong><small>Register or sign in as a doctor</small></div>
              <ArrowRight/>
            </button>
            <button onClick={() => go(PATIENT_URL)} className="demo-patient">
              <span><UserRound size={22}/></span>
              <div><strong>Open Patient App</strong><small>Scan a QR or enter a doctor code</small></div>
              <ArrowRight/>
            </button>
          </div>
        </section>
      </main>

      <footer>
        <div className="footer-brand">
          <span className="brand-mark"><Activity size={18}/></span>
          <div><strong>VaaniDoc</strong><span>Multilingual AI Health Intake</span></div>
        </div>
        <p>AI-assisted health intake. Not a diagnostic system.</p>
      </footer>
    </div>
  )
}

export default App
