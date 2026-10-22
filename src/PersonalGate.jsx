import React, { useRef, useState } from 'react';
import { Dumbbell, LockKeyhole, ArrowRight } from 'lucide-react';
import { PIN_CONFIG } from './pin-config';

// The verifier lives in the downloaded app. This protects against casual
// screen access only: it cannot secure public source or encrypt IndexedDB.
export async function verifyPin(pin, config = PIN_CONFIG) {
  if (!/^\d{4}$/.test(pin)) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(config.salt), iterations: config.iterations, hash: 'SHA-256' }, key, 256);
  const hash = Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2, '0')).join('');
  return hash === config.hash;
}

export function PersonalGate({ children, checkPin = verifyPin }) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef();
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      if (await checkPin(pin)) { setPin(''); setUnlocked(true); }
      else { setPin(''); setError('That PIN isn’t right. Try again.'); input.current?.focus(); }
    } catch { setError('Could not unlock. Open RepLog using HTTPS or localhost and try again.'); }
    finally { setBusy(false); }
  }
  if (unlocked) return children(() => { setUnlocked(false); setError(''); setPin(''); });
  return <main className="lock-screen"><section className="lock-card" aria-labelledby="lock-title">
    <a className="brand lock-brand" href="#/workouts"><span className="brand-icon"><Dumbbell size={24}/></span>RepLog<span className="brand-dot">.</span></a>
    <span className="lock-symbol"><LockKeyhole size={25}/></span>
    <span className="eyebrow">YOUR PERSONAL TRAINING SPACE</span>
    <h1 id="lock-title">Your journal awaits.</h1>
    <p>Enter your PIN to open your workouts and notes.</p>
    <form onSubmit={submit}>
      <label htmlFor="personal-pin">Your 4-digit PIN</label>
      <input ref={input} id="personal-pin" type="password" inputMode="numeric" pattern="[0-9]{4}" minLength={4} maxLength={4} autoComplete="off" autoFocus required value={pin} onChange={e=>{setPin(e.target.value.replace(/\D/g,'')); setError('');}} aria-invalid={!!error} aria-describedby={error?'pin-error':'pin-hint'} disabled={busy}/>
      {error&&<p id="pin-error" className="pin-error" role="alert">{error}</p>}
      <button className="primary" disabled={busy||pin.length!==4}>{busy?'Unlocking…':'Unlock my journal'}<ArrowRight size={16}/></button>
    </form>
    <p id="pin-hint" className="lock-hint">Locks again when you reload or tap Lock.</p>
    <p className="lock-disclosure">A local screen lock for casual privacy. Your data stays on this device. This doesn’t encrypt data or make the public website private.</p>
  </section></main>;
}
