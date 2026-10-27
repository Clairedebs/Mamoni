'use client'

import { useActionState, useState } from 'react'
import { Icon } from '@/components/Icon'
import { useT } from '@/components/i18n'
import { signIn, signUp } from '@/lib/actions'

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [showPw, setShowPw] = useState(false)
  const [inState, inAction, inPending] = useActionState(signIn, undefined)
  const [upState, upAction, upPending] = useActionState(signUp, undefined)

  const err = mode === 'in' ? (inState && !inState.ok ? inState.error : '') : upState && !upState.ok ? upState.error : ''
  const confirm = mode === 'up' && upState?.ok && upState.data.confirm
  const pending = inPending || upPending
  const t = useT().login

  return (
    <div className="auth-card">
      <div className="auth-brand">
        <svg className="appicon" aria-hidden="true">
          <use href="#logo" />
        </svg>
        <b>Moni yem</b>
      </div>
      <h1>{mode === 'in' ? t.welcomeBack : t.createTitle}</h1>
      <p className="lead">{mode === 'in' ? t.signInLead : t.signUpLead}</p>

      {notice && (
        <div className="notice" style={{ marginBottom: 16 }}>
          <Icon name="circle-check" />
          <span>{notice}</span>
        </div>
      )}

      {confirm ? (
        <div className="notice">
          <Icon name="send" />
          <span>{t.checkInbox}</span>
        </div>
      ) : (
        <form action={mode === 'in' ? inAction : upAction} className="stack">
          <input type="hidden" name="next" value={next ?? ''} />
          {mode === 'up' && (
            <div className="fld">
              <label htmlFor="name">{t.firstName}</label>
              <div className="text-in">
                <Icon name="users" />
                <input id="name" name="name" autoComplete="given-name" maxLength={40} placeholder={t.firstNamePlaceholder} />
              </div>
            </div>
          )}
          <div className="fld">
            <label htmlFor="email">{t.email}</label>
            <div className="text-in">
              <Icon name="send" />
              <input id="email" name="email" type="email" required autoComplete="email" placeholder={t.emailPlaceholder} />
            </div>
          </div>
          <div className="fld">
            <label htmlFor="password">{t.password}</label>
            <div className="text-in">
              <Icon name="lock" />
              <input id="password" name="password" type={showPw ? 'text' : 'password'} required minLength={mode === 'up' ? 8 : undefined} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} placeholder={mode === 'up' ? t.newPassword : t.currentPassword} />
              <button type="button" className="pw-toggle" aria-label={showPw ? t.hidePassword : t.showPassword} aria-pressed={showPw} onClick={() => setShowPw((v) => !v)}>
                <Icon name={showPw ? 'eye-off' : 'eye'} />
              </button>
            </div>
          </div>
          <p className="form-err" role="alert">
            {err}
          </p>
          <button className="btn block" disabled={pending}>
            <Icon name={pending ? 'loader' : 'check'} />
            {mode === 'in' ? t.signIn : t.createAccount}
          </button>
        </form>
      )}

      <p className="switch-mode">
        {mode === 'in' ? t.newHere : t.haveAccount}{' '}
        <button type="button" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
          {mode === 'in' ? t.createAnAccount : t.signIn}
        </button>
      </p>
    </div>
  )
}
