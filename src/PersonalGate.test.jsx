import React from 'react';
import { it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { webcrypto, pbkdf2Sync } from 'node:crypto';
import { PersonalGate, verifyPin } from './PersonalGate';
import { App } from './main';

it('verifies PINs with WebCrypto and rejects incorrect and malformed values',async()=>{
  vi.stubGlobal('crypto',webcrypto);
  const config={salt:'test-salt',iterations:210000,hash:pbkdf2Sync('1234','test-salt',210000,32,'sha256').toString('hex')};
  try {expect(await verifyPin('1234',config)).toBe(true);expect(await verifyPin('1111',config)).toBe(false);expect(await verifyPin('123',config)).toBe(false);expect(await verifyPin('abcd',config)).toBe(false);}
  finally {vi.unstubAllGlobals();}
});

it('hides the app until correct entry, greets Subham and relocks without removing records',async()=>{
  const user=userEvent.setup();const checkPin=vi.fn(async pin=>pin==='1234');
  render(<PersonalGate checkPin={checkPin}>{onLock=><App onLock={onLock}/>}</PersonalGate>);
  expect(screen.queryByText('Welcome Subham Nayak')).toBeNull();expect(screen.queryByRole('button',{name:'Export backup'})).toBeNull();
  await user.type(screen.getByLabelText('Your 4-digit PIN'),'1111');await user.click(screen.getByRole('button',{name:'Unlock my journal'}));await screen.findByRole('alert');expect(screen.queryByRole('button',{name:'Export backup'})).toBeNull();
  await user.type(screen.getByLabelText('Your 4-digit PIN'),'1234');await user.click(screen.getByRole('button',{name:'Unlock my journal'}));await screen.findByText('Welcome Subham Nayak');await user.click(screen.getByRole('button',{name:'Lock',exact:true}));expect(screen.queryByText('Welcome Subham Nayak')).toBeNull();expect(screen.getByLabelText('Your 4-digit PIN').value).toBe('');expect(screen.queryByRole('button',{name:'Export backup'})).toBeNull();
});

it('requires a fresh PIN on a new mount and recovers from verifier errors',async()=>{
  const user=userEvent.setup();const checkPin=vi.fn().mockRejectedValueOnce(Error('Unavailable')).mockResolvedValue(true);const children=()=> <p>Unlocked journal</p>;
  const view=render(<PersonalGate checkPin={checkPin}>{children}</PersonalGate>);
  await user.type(screen.getByLabelText('Your 4-digit PIN'),'1234');await user.click(screen.getByRole('button',{name:'Unlock my journal'}));await screen.findByRole('alert');await user.click(screen.getByRole('button',{name:'Unlock my journal'}));await screen.findByText('Unlocked journal');
  view.unmount();render(<PersonalGate checkPin={checkPin}>{children}</PersonalGate>);expect(screen.queryByText('Unlocked journal')).toBeNull();expect(screen.getByRole('button',{name:'Unlock my journal'}).disabled).toBe(true);
});
