import {
  LayoutDashboard,
  Users,
  UserRound,
  Settings,
  LogOut,
  Stethoscope,
} from 'lucide-react'

function Sidebar({ activePage, onNavigate }) {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'queue',
      label: 'Patient Queue',
      icon: Users,
    },
    {
      id: 'current-patient',
      label: 'Current Patient',
      icon: UserRound,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
    },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Stethoscope size={22} strokeWidth={2.2} />
        </div>

        <div>
          <h1>VaaniDoc</h1>
          <span>Doctor Dashboard</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Doctor dashboard navigation">
        <p className="sidebar-section-title">MAIN MENU</p>

        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activePage === item.id

          return (
            <button
              key={item.id}
              type="button"
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <Icon size={19} strokeWidth={2} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-status">
          <span className="sidebar-status-dot" />
          <div>
            <strong>System Online</strong>
            <span>Ready for consultation</span>
          </div>
        </div>

        <button
          type="button"
          className="sidebar-logout"
          onClick={() => onNavigate('login')}
        >
          <LogOut size={18} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar