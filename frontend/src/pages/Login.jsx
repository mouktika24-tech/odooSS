import { useState } from 'react'
import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell.jsx'
import api, { setAuthToken } from '../services/api.js'
import { getApiErrorMessage } from '../services/apiErrors.js'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const inputBaseClass =
  'mt-1.5 h-11 w-full rounded-lg border bg-surface px-3 text-sm text-secondary outline-none transition placeholder:text-secondary/40 focus:ring-2'

function getEmailError(email) {
  if (!email.trim()) return 'Email is required.'
  if (!emailPattern.test(email.trim())) return 'Enter a valid email address.'
  return ''
}

function getPasswordError(password) {
  if (!password) return 'Password is required.'
  if (password.length < 6) return 'Password must be at least 6 characters.'
  return ''
}

function Login() {
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [feedback, setFeedback] = useState(() =>
    location.state?.notice ? { type: 'success', message: location.state.notice } : null,
  )

  const emailError = touched.email || submitted ? getEmailError(email) : ''
  const passwordError = touched.password || submitted ? getPasswordError(password) : ''

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitted(true)

    if (getEmailError(email) || getPasswordError(password)) {
      setFeedback({ type: 'error', message: 'Correct the highlighted fields to continue.' })
      return
    }

    setIsSubmitting(true)
    setFeedback(null)
    try {
      const response = await api.post('/auth/login', {
        email: email.trim(),
        password,
      })

      if (response.data?.success !== true || typeof response.data.token !== 'string') {
        setFeedback({
          type: 'error',
          message: 'The login response did not include a valid session. Please try again.',
        })
        return
      }

      setAuthToken(response.data.token)
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Unable to sign in right now. Check your connection and try again.'),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell title="Welcome back" description="Sign in to your StockSense account.">
      <form noValidate onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="login-email" className="text-sm font-medium text-secondary">
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setTouched((current) => ({ ...current, email: true }))
              setFeedback(null)
            }}
            onBlur={() => setTouched((current) => ({ ...current, email: true }))}
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? 'login-email-error' : undefined}
            placeholder="name@company.com"
            className={`${inputBaseClass} ${emailError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/15' : 'border-border focus:border-primary focus:ring-primary/15'}`}
          />
          {emailError && (
            <p id="login-email-error" role="alert" className="mt-1.5 text-xs text-red-600">
              {emailError}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="login-password" className="text-sm font-medium text-secondary">
              Password
            </label>
            <button
              type="button"
              className="text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input
              id="login-password"
              name="password"
              type={passwordVisible ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setTouched((current) => ({ ...current, password: true }))
                setFeedback(null)
              }}
              onBlur={() => setTouched((current) => ({ ...current, password: true }))}
              aria-invalid={Boolean(passwordError)}
              aria-describedby={passwordError ? 'login-password-error' : undefined}
              placeholder="Enter your password"
              className={`${inputBaseClass} pr-11 ${passwordError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/15' : 'border-border focus:border-primary focus:ring-primary/15'}`}
            />
            <button
              type="button"
              onClick={() => setPasswordVisible((visible) => !visible)}
              aria-label={passwordVisible ? 'Hide password' : 'Show password'}
              className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-secondary/55 hover:bg-background hover:text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              {passwordVisible ? <EyeOff aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}
            </button>
          </div>
          {passwordError && (
            <p id="login-password-error" role="alert" className="mt-1.5 text-xs text-red-600">
              {passwordError}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting && <LoaderCircle aria-hidden="true" size={16} className="animate-spin" />}
          {isSubmitting ? 'Signing in...' : 'Log in'}
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
          New to StockSense?{' '}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}

export default Login