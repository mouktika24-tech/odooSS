import { useState } from 'react'
import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell.jsx'
import api from '../services/api.js'
import { getApiErrorMessage } from '../services/apiErrors.js'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const inputBaseClass =
  'mt-1.5 h-11 w-full rounded-lg border bg-surface px-3 text-sm text-secondary outline-none transition placeholder:text-secondary/40 focus:ring-2'

function getFieldError(field, values) {
  if (field === 'name' && !values.name.trim()) return 'Name is required.'
  if (field === 'email') {
    if (!values.email.trim()) return 'Email is required.'
    if (!emailPattern.test(values.email.trim())) return 'Enter a valid email address.'
  }
  if (field === 'password') {
    if (!values.password) return 'Password is required.'
    if (values.password.length < 8) return 'Password must be at least 8 characters.'
  }
  if (field === 'confirmPassword') {
    if (!values.confirmPassword) return 'Please confirm your password.'
    if (values.confirmPassword !== values.password) return 'Passwords do not match.'
  }
  return ''
}

function Register() {
  const navigate = useNavigate()
  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [confirmVisible, setConfirmVisible] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const errors = Object.fromEntries(
    Object.keys(values).map((field) => [
      field,
      touched[field] || submitted ? getFieldError(field, values) : '',
    ]),
  )

  function updateField(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
    setTouched((current) => ({ ...current, [field]: true }))
    setFeedback(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitted(true)

    if (Object.keys(values).some((field) => getFieldError(field, values))) {
      setFeedback({ type: 'error', message: 'Correct the highlighted fields to continue.' })
      return
    }

    setIsSubmitting(true)
    setFeedback(null)
    try {
      const response = await api.post('/auth/register', {
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      })

      if (response.data?.success !== true || !response.data.user) {
        setFeedback({
          type: 'error',
          message: 'Registration could not be confirmed. Please try again.',
        })
        return
      }

      navigate('/login', {
        replace: true,
        state: { notice: 'Account created successfully. Please sign in.' },
      })
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(
          error,
          'Unable to create your account right now. Check your connection and try again.',
        ),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  function fieldClass(field) {
    return `${inputBaseClass} ${errors[field] ? 'border-red-500 focus:border-red-500 focus:ring-red-500/15' : 'border-border focus:border-primary focus:ring-primary/15'}`
  }

  function renderPasswordField({ field, label, visible, onToggle, autocomplete }) {
    const errorId = `register-${field}-error`

    return (
      <div>
        <label htmlFor={`register-${field}`} className="text-sm font-medium text-secondary">
          {label}
        </label>
        <div className="relative">
          <input
            id={`register-${field}`}
            name={field}
            type={visible ? 'text' : 'password'}
            required
            minLength={8}
            autoComplete={autocomplete}
            value={values[field]}
            onChange={(event) => updateField(field, event.target.value)}
            onBlur={() => setTouched((current) => ({ ...current, [field]: true }))}
            aria-invalid={Boolean(errors[field])}
            aria-describedby={errors[field] ? errorId : undefined}
            className={`${fieldClass(field)} pr-11`}
          />
          <button
            type="button"
            onClick={onToggle}
            aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
            className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-secondary/55 hover:bg-background hover:text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {visible ? <EyeOff aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}
          </button>
        </div>
        {errors[field] && (
          <p id={errorId} role="alert" className="mt-1.5 text-xs text-red-600">
            {errors[field]}
          </p>
        )}
      </div>
    )
  }

  return (
    <AuthShell title="Create your account" description="Register for a StockSense account.">
      <form noValidate onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="register-name" className="text-sm font-medium text-secondary">
            Name
          </label>
          <input
            id="register-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            value={values.name}
            onChange={(event) => updateField('name', event.target.value)}
            onBlur={() => setTouched((current) => ({ ...current, name: true }))}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'register-name-error' : undefined}
            className={fieldClass('name')}
          />
          {errors.name && (
            <p id="register-name-error" role="alert" className="mt-1.5 text-xs text-red-600">
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="register-email" className="text-sm font-medium text-secondary">
            Email
          </label>
          <input
            id="register-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={values.email}
            onChange={(event) => updateField('email', event.target.value)}
            onBlur={() => setTouched((current) => ({ ...current, email: true }))}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'register-email-error' : undefined}
            placeholder="name@company.com"
            className={fieldClass('email')}
          />
          {errors.email && (
            <p id="register-email-error" role="alert" className="mt-1.5 text-xs text-red-600">
              {errors.email}
            </p>
          )}
        </div>

        {renderPasswordField({
          field: 'password',
          label: 'Password',
          visible: passwordVisible,
          onToggle: () => setPasswordVisible((visible) => !visible),
          autocomplete: 'new-password',
        })}
        {renderPasswordField({
          field: 'confirmPassword',
          label: 'Confirm password',
          visible: confirmVisible,
          onToggle: () => setConfirmVisible((visible) => !visible),
          autocomplete: 'new-password',
        })}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting && <LoaderCircle aria-hidden="true" size={16} className="animate-spin" />}
          {isSubmitting ? 'Creating account...' : 'Register'}
        </button>

        {feedback && (
          <p
            role={feedback.type === 'error' ? 'alert' : 'status'}
            className={`text-sm ${feedback.type === 'error' ? 'text-red-700' : 'text-teal-800'}`}
          >
            {feedback.message}
          </p>
        )}

        <p className="text-center text-sm text-secondary/65">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}

export default Register