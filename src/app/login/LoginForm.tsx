'use client'

import { useActionState, useState } from 'react'
import { Icon } from '@/components/Icon'
import { signIn, signUp } from '@/lib/actions'

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [inState, inAction, inPending] = useActionState(signIn, undefined)
  const [upState, upAction, upPending] = useActionState(signUp, undefined)

  const err = mode === 'in' ? (inState && !inState.ok ? inState.error : '') : upState && !upState.ok ? upState.error : ''
  const confirm = mode === 'up' && upState?.ok && upState.data.confirm
  const pending = inPending || upPending

  return (
    <div className="auth-card">
      <div className="auth-brand">
        <svg className="appicon" aria-hidden="true">
          <use href="#logo" />
        </svg>
        <b>Ma moni</b>
      </div>
      <h1>{mode === 'in' ? 'Welcome back' : 'Create your account'}</h1>
      <p className="lead">{mode === 'in' ? 'Sign in to see where your money stands.' : 'Track spending, income and savings — tontines included.'}</p>

      {notice && (
        <div className="notice" style={{ marginBottom: 16 }}>
          <Icon name="circle-check" />
          <span>{notice}</span>
        </div>
      )}

      {confirm ? (
        <div className="notice">
          <Icon name="send" />
          <span>Check your inbox and tap the link we sent to confirm your email. Then come back and sign in.</span>
        </div>
      ) : (
        <form action={mode === 'in' ? inAction : upAction} className="stack">
          <input type="hidden" name="next" value={next ?? ''} />
          {mode === 'up' && (
            <div className="fld">
              <label htmlFor="name">Your first name</label>
              <div className="text-in">
                <Icon name="users" />
                <input id="name" name="name" autoComplete="given-name" maxLength={40} placeholder="e.g. Aïcha" />
              </div>
            </div>
          )}
          <div className="fld">
            <label htmlFor="email">Email</label>
            <div className="text-in">
              <Icon name="send" />
              <input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
            </div>
          </div>
          <div className="fld">
            <label htmlFor="password">Password</label>
            <div className="text-in">
              <Icon name="eye-off" />
              <input id="password" name="password" type="password" required minLength={mode === 'up' ? 8 : undefined} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} placeholder={mode === 'up' ? 'At least 8 characters' : 'Your password'} />
            </div>
          </div>
          <p className="form-err" role="alert">
            {err}
          </p>
          <button className="btn block" disabled={pending}>
            <Icon name={pending ? 'loader' : 'check'} />
            {mode === 'in' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      )}

      <p className="switch-mode">
        {mode === 'in' ? 'New to Ma moni?' : 'Already have an account?'}{' '}
        <button type="button" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
          {mode === 'in' ? 'Create an account' : 'Sign in'}
        </button>
      </p>
    </div>
  )
}
