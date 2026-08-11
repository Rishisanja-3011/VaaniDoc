import {
  ArrowRight,
  BriefcaseMedical,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  Stethoscope,
} from 'lucide-react'
import { useState } from 'react'

function Register({ onNavigate }) {
  const [formData, setFormData] = useState({
    name: '',
    specialization: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })

  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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

    const name = formData.name.trim()
    const specialization = formData.specialization.trim()
    const email = formData.email.trim()
    const phone = formData.phone.trim()
    const password = formData.password
    const confirmPassword = formData.confirmPassword

    // Full name
    if (!name) {
      nextErrors.name = 'Full name is required.'
    } else if (name.length < 2) {
      nextErrors.name =
        'Full name must contain at least 2 characters.'
    } else if (name.length > 60) {
      nextErrors.name =
        'Full name cannot exceed 60 characters.'
    } else if (!/^[A-Za-zÀ-ÖØ-öø-ÿ.' -]+$/.test(name)) {
      nextErrors.name =
        'Full name can contain only letters, spaces, dots, apostrophes, and hyphens.'
    }

    // Specialization
    if (!specialization) {
      nextErrors.specialization =
        'Specialization is required.'
    } else if (specialization.length < 2) {
      nextErrors.specialization =
        'Specialization must contain at least 2 characters.'
    } else if (specialization.length > 80) {
      nextErrors.specialization =
        'Specialization cannot exceed 80 characters.'
    } else if (
      !/^[A-Za-zÀ-ÖØ-öø-ÿ0-9&/.,()' -]+$/.test(
        specialization,
      )
    ) {
      nextErrors.specialization =
        'Please enter a valid specialization.'
    }

    // Email
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

    // Phone
    if (!phone) {
      nextErrors.phone = 'Phone number is required.'
    } else if (!/^\d{10}$/.test(phone)) {
      nextErrors.phone =
        'Phone number must contain exactly 10 digits.'
    }

    // Password
    if (!password) {
      nextErrors.password = 'Password is required.'
    } else if (password.length < 8) {
      nextErrors.password =
        'Password must contain at least 8 characters.'
    } else if (password.length > 64) {
      nextErrors.password =
        'Password cannot exceed 64 characters.'
    } else if (!/[A-Z]/.test(password)) {
      nextErrors.password =
        'Password must contain at least one uppercase letter.'
    } else if (!/[a-z]/.test(password)) {
      nextErrors.password =
        'Password must contain at least one lowercase letter.'
    } else if (!/\d/.test(password)) {
      nextErrors.password =
        'Password must contain at least one number.'
    } else if (
      !/[!@#$%^&*(),.?":{}|<>_\-\\[\]'/`~+=;]/.test(password)
    ) {
      nextErrors.password =
        'Password must contain at least one special character.'
    }

    // Confirm password
    if (!confirmPassword) {
      nextErrors.confirmPassword =
        'Please confirm your password.'
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword =
        'Passwords do not match.'
    }

    setErrors(nextErrors)

    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    onNavigate('doctor-code')
  }

  return (
    <div className="auth-page">
      <div className="auth-card register-card">
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
          <span className="eyebrow">DOCTOR REGISTRATION</span>

          <h2>Create your account</h2>

          <p>
            Register your doctor profile to start receiving patient
            consultations.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="doctor-name">
            Full name
          </label>

          <div className="input-with-icon">
            <Stethoscope size={17} />

            <input
              id="doctor-name"
              name="name"
              type="text"
              placeholder="Dr. Your Name"
              autoComplete="name"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          {errors.name && (
            <p className="form-error">{errors.name}</p>
          )}

          <label htmlFor="doctor-specialization">
            Specialization
          </label>

          <div className="input-with-icon">
            <BriefcaseMedical size={17} />

            <input
              id="doctor-specialization"
              name="specialization"
              type="text"
              placeholder="General Physician"
              autoComplete="organization-title"
              value={formData.specialization}
              onChange={handleChange}
            />
          </div>

          {errors.specialization && (
            <p className="form-error">
              {errors.specialization}
            </p>
          )}

          <label htmlFor="doctor-register-email">
            Email address
          </label>

          <div className="input-with-icon">
            <Mail size={17} />

            <input
              id="doctor-register-email"
              name="email"
              type="email"
              placeholder="doctor@example.com"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          {errors.email && (
            <p className="form-error">{errors.email}</p>
          )}

          <label htmlFor="doctor-phone">
            Phone number
          </label>

          <div className="input-with-icon">
            <Phone size={17} />

            <input
              id="doctor-phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="9876543210"
              autoComplete="tel"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          {errors.phone && (
            <p className="form-error">{errors.phone}</p>
          )}

          <label htmlFor="doctor-register-password">
            Password
          </label>

          <div className="password-field">
            <LockKeyhole size={17} />

            <input
              id="doctor-register-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a secure password"
              autoComplete="new-password"
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

          <label htmlFor="doctor-confirm-password">
            Confirm password
          </label>

          <div className="password-field">
            <LockKeyhole size={17} />

            <input
              id="doctor-confirm-password"
              name="confirmPassword"
              type={
                showConfirmPassword ? 'text' : 'password'
              }
              placeholder="Re-enter your password"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange}
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() =>
                setShowConfirmPassword((current) => !current)
              }
              aria-label={
                showConfirmPassword
                  ? 'Hide confirm password'
                  : 'Show confirm password'
              }
              title={
                showConfirmPassword
                  ? 'Hide confirm password'
                  : 'Show confirm password'
              }
            >
              {showConfirmPassword ? (
                <EyeOff size={17} />
              ) : (
                <Eye size={17} />
              )}
            </button>
          </div>

          {errors.confirmPassword && (
            <p className="form-error">
              {errors.confirmPassword}
            </p>
          )}

          <button
            type="submit"
            className="auth-primary-button"
          >
            Create Doctor Account
            <ArrowRight size={17} />
          </button>
        </form>

        <div className="auth-divider">
          <span>Already registered?</span>
        </div>

        <button
          type="button"
          className="auth-secondary-button"
          onClick={() => onNavigate('login')}
        >
          Back to Login
        </button>

        <p className="auth-privacy">
          Your doctor account is managed through the secure VaaniDoc
          authentication system.
        </p>
      </div>
    </div>
  )
}

export default Register