import { useEffect } from 'react'

/**
 * Top-right menu: Home; when signed in, library sections + log out; when guest, request account + sign in.
 * `onSelect` receives view id ('home' | 'myInspirations' | …); caller closes menu.
 */
export function HamburgerNav({
  open,
  onOpen,
  onClose,
  onSelect,
  activeView,
  currentUser,
  authLoading,
  authBusy,
  onSignIn,
  onLogout,
}) {
  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <div className="hamburger-nav">
      <button
        type="button"
        className="hamburger-btn"
        aria-expanded={open}
        aria-controls="app-nav-menu"
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => (open ? onClose() : onOpen())}
      >
        <span className="hamburger-line" />
        <span className="hamburger-line" />
        <span className="hamburger-line" />
      </button>
      {open && (
        <>
          <button
            type="button"
            className="nav-backdrop"
            aria-label="Close menu"
            onClick={onClose}
          />
          <nav id="app-nav-menu" className="nav-menu-panel" aria-label="Main">
            <ul className="nav-menu-list">
              <li>
                <button
                  type="button"
                  className={`nav-menu-item${activeView === 'home' ? ' is-active' : ''}`}
                  onClick={() => onSelect('home')}
                >
                  Home
                </button>
              </li>
              {!authLoading && currentUser && (
                <>
                  <li>
                    <button
                      type="button"
                      className={`nav-menu-item${activeView === 'myInspirations' ? ' is-active' : ''}`}
                      onClick={() => onSelect('myInspirations')}
                    >
                      My inspirations
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className={`nav-menu-item${activeView === 'addInspiration' ? ' is-active' : ''}`}
                      onClick={() => onSelect('addInspiration')}
                    >
                      Add inspiration
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className={`nav-menu-item${activeView === 'sourcesGallery' ? ' is-active' : ''}`}
                      onClick={() => onSelect('sourcesGallery')}
                    >
                      Inspiration sources
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className={`nav-menu-item${activeView === 'addSource' ? ' is-active' : ''}`}
                      onClick={() => onSelect('addSource')}
                    >
                      Add source
                    </button>
                  </li>
                  <li className="nav-menu-divider" role="presentation" />
                  <li>
                    <button
                      type="button"
                      className={`nav-menu-item${activeView === 'tagSearch' ? ' is-active' : ''}`}
                      onClick={() => onSelect('tagSearch')}
                    >
                      Search by tag
                    </button>
                  </li>
                  <li className="nav-menu-divider" role="presentation" />
                  <li>
                    <button
                      type="button"
                      className={`nav-menu-item${activeView === 'wordLibrary' ? ' is-active' : ''}`}
                      onClick={() => onSelect('wordLibrary')}
                    >
                      Word library
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className={`nav-menu-item${activeView === 'addWord' ? ' is-active' : ''}`}
                      onClick={() => onSelect('addWord')}
                    >
                      Add word
                    </button>
                  </li>
                  <li className="nav-menu-divider" role="presentation" />
                  <li className="nav-menu-meta">
                    Signed in as <strong>{currentUser.username}</strong>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="nav-menu-item"
                      disabled={authBusy}
                      onClick={() => {
                        onClose()
                        onLogout()
                      }}
                    >
                      {authBusy ? 'Signing out…' : 'Log out'}
                    </button>
                  </li>
                </>
              )}
              {!authLoading && !currentUser && (
                <>
                  <li>
                    <button
                      type="button"
                      className={`nav-menu-item${activeView === 'requestAccount' ? ' is-active' : ''}`}
                      onClick={() => onSelect('requestAccount')}
                    >
                      Request an account
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="nav-menu-item"
                      onClick={() => {
                        onClose()
                        onSignIn()
                      }}
                    >
                      Sign in
                    </button>
                  </li>
                </>
              )}
            </ul>
          </nav>
        </>
      )}
    </div>
  )
}
