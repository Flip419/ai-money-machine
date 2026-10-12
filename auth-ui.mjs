import { authConfig } from './auth-config.mjs';
import { createAuthController } from './auth-controller.mjs';

const form = document.getElementById('authForm');
const message = document.getElementById('authMessage');
const account = document.getElementById('accountSession');
const accountEmail = document.getElementById('accountEmail');
const signOut = document.getElementById('signOut');
const email = document.getElementById('authEmail');
const password = document.getElementById('authPassword');
const actions = [...document.querySelectorAll('#account button')];
const busy = value => { actions.forEach(button => { button.disabled = value; }); };
const notify = text => { message.textContent = text; };
let controller;
busy(true);
try {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/+esm');
  const client = createClient(authConfig.url, authConfig.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true,
      flowType: 'pkce', storageKey: 'ai-resume-studio-auth' },
  });
  controller = createAuthController(client, user => {
    form.classList.toggle('hidden', Boolean(user));
    account.classList.toggle('hidden', !user);
    accountEmail.textContent = user?.email ?? '';
    document.getElementById('accountNav').textContent = user ? 'My account' : 'Sign in';
    password.value = '';
  });
  await controller.initialize();
  busy(false);
} catch {
  notify('Account services could not load. Please refresh and try again.');
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!controller || !form.reportValidity()) return;
  busy(true);
  notify('Please wait…');
  try {
    const address = email.value.trim();
    if (event.submitter?.value === 'signup') {
      if (password.value.length < 8) {
        notify('Use a password with at least 8 characters.');
        return;
      }
      // Preserve /ai-money-machine/ on GitHub Pages; discard URL tokens/hash.
      const redirect = new URL(window.location.pathname, window.location.origin).href;
      notify(await controller.signUp(address, password.value, redirect));
    } else {
      notify(await controller.signIn(address, password.value));
    }
  } catch {
    // Avoid leaking server diagnostics or disclosing account existence.
    notify('Could not complete authentication. Check your details and email confirmation, then try again.');
  } finally { password.value = ''; busy(false); }
});
signOut.addEventListener('click', async () => {
  if (!controller) return;
  busy(true);
  try { notify(await controller.signOut()); }
  catch { notify('Sign-out failed. Please try again.'); }
  finally { busy(false); }
});
