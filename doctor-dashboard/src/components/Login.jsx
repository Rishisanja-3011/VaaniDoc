import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Stethoscope,
} from 'lucide-react'
import { useState } from 'react'

function Login({ onNavigate }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value,
    }))

    setErrors((current) => ({
      ...current,
      [name]: '',
    }))
  }

  const validateForm = () => {
    const nextErrors = {}

    const email = formData.email.trim()
    const password = formData.password

    if (!email) {
      nextErrors.email = 'Email address is required.'
    } else if (
      !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(
        email,
      )
    ) {
      nextErrors.email =
        'Please enter a valid email address.'
    }

    if (!password) {
      nextErrors.password = 'Password is required.'
    } else if (password.length < 8) {
      nextErrors.password =
        'Password must contain at least 8 characters.'
    } else if (password.length > 64) {
      nextErrors.password =
        'Password cannot exceed 64 characters.'
    }

    setErrors(nextErrors)

    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    onNavigate('dashboard')
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <Stethoscope size={25} strokeWidth={2.2} />
          </div>

          <div>
            <h1>VaaniDoc</h1>
            <span>Doctor Dashboard</span>
          </div>
        </div>

        <div className="auth-heading">
          <span className="eyebrow">DOCTOR PORTAL</span>

          <h2>Welcome back</h2>

          <p>
            Sign in to manage your patient queue and consultations.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="doctor-email">
            Email address
          </label>

          <input
            id="doctor-email"
            name="email"
            type="email"
            placeholder="doctor@example.com"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
          />

          {errors.email && (
            <p className="form-error">{errors.email}</p>
          )}

          <label htmlFor="doctor-password">
            Password
          </label>

          <div className="password-field">
            <LockKeyhole size={17} />

            <input
              id="doctor-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() =>
                setShowPassword((current) => !current)
              }
              aria-label={
                showPassword
                  ? 'Hide password'
                  : 'Show password'
              }
              title={
                showPassword
                  ? 'Hide password'
                  : 'Show password'
              }
            >
              {showPassword ? (
                <EyeOff size={17} />
              ) : (
                <Eye size={17} />
              )}
            </button>
          </div>

          {errors.password && (
            <p className="form-error">{errors.password}</p>
          )}

          <button
            type="submit"
            className="auth-primary-button"
          >
            Sign in
            <ArrowRight size={17} />
          </button>
        </form>

        <div className="auth-divider">
          <span>New to VaaniDoc?</span>
        </div>

        <button
          type="button"
          className="auth-secondary-button"
          onClick={() => onNavigate('register')}
        >
          Create Doctor Account
        </button>

        <p className="auth-privacy">
          Doctor authentication is secured through the VaaniDoc
          authentication system.
        </p>
      </div>
    </div>
  )
}

export default Login