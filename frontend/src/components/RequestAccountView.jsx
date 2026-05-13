import { useState } from 'react'

const emptyForm = {
  first_name: '',
  last_name: '',
  location: '',
  email: '',
  username: '',
  password: '',
}

/**
 * @param {object} props
 * @param {(payload: typeof emptyForm) => Promise<void>} props.onSubmitRequest
 * @param {() => void} props.onCancel
 * @param {boolean} [props.isPageLayout] Dedicated URL page: page-level title on orange, card is form only.
 */
export function RequestAccountView({ onSubmitRequest, onCancel, isPageLayout = false }) {
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  function onFieldChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await onSubmitRequest({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        location: form.location.trim(),
        email: form.email.trim(),
        username: form.username.trim(),
        password: form.password,
      })
      setDone(true)
      setForm(emptyForm)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <section className="card login-card request-account-card">
        {isPageLayout ? (
          <h1 className="request-account-page-title">Request sent</h1>
        ) : (
          <h2>Request sent</h2>
        )}
        <p className="hint request-account-success">
          Thanks — your details were submitted. The site owner will follow up by email when your
          account is ready.
        </p>
        <div className="login-actions">
          <button type="button" onClick={onCancel}>
            Back to home
          </button>
        </div>
      </section>
    )
  }

  return (
    <>
      {isPageLayout ? (
        <>
          <h1 className="request-account-page-title" id="request-account-page-title">
            Request an account
          </h1>
          <p className="subtitle request-account-page-lead">
            Your message is emailed to the site owner. You are not signed in yet.
          </p>
        </>
      ) : null}
      <section className={`card login-card request-account-card${isPageLayout ? ' request-account-card--page' : ''}`}>
        {!isPageLayout ? <h2>Request an account</h2> : null}
        {!isPageLayout ? (
          <p className="hint request-account-lead">
            Fill in the form below. Your request is emailed to the site owner; you are not signed in
            yet.
          </p>
        ) : null}
        <form className="form" onSubmit={onSubmit}>
          <label>
            First name
            <input
              name="first_name"
              value={form.first_name}
              onChange={onFieldChange}
              autoComplete="given-name"
              required
              maxLength={100}
            />
          </label>
          <label>
            Last name
            <input
              name="last_name"
              value={form.last_name}
              onChange={onFieldChange}
              autoComplete="family-name"
              required
              maxLength={100}
            />
          </label>
          <label>
            Location
            <input
              name="location"
              value={form.location}
              onChange={onFieldChange}
              autoComplete="address-level2"
              required
              maxLength={300}
              placeholder="City, region, or country"
            />
          </label>
          <label>
            Email address
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={onFieldChange}
              autoComplete="email"
              required
              maxLength={254}
            />
          </label>
          <label>
            Username you would like
            <input
              name="username"
              value={form.username}
              onChange={onFieldChange}
              autoComplete="username"
              required
              maxLength={150}
            />
          </label>
          <label>
            Password you would like
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={onFieldChange}
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={256}
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <div className="login-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Sending…' : 'Send request'}
            </button>
            <button type="button" className="secondary" disabled={busy} onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
    </section>
    </>
  )
}
