// Browser session state improves UI only; it never authorizes paid access.
export function createAuthController(client, render) {
  let generation = 0;
  let disposed = false;
  const show = session => { if (!disposed) render(session?.user ?? null); };
  const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
    generation += 1;
    show(session);
  });
  return {
    async initialize() {
      const version = generation;
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (version === generation) show(data.session);
    },
    async signIn(email, password) {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return 'Signed in.';
    },
    async signUp(email, password, emailRedirectTo) {
      const { data, error } = await client.auth.signUp({
        email, password, options: { emailRedirectTo },
      });
      if (error) throw error;
      return data.session ? 'Account created. You are signed in.'
        : 'Check your email to confirm your account, then sign in.';
    },
    async signOut() {
      // Signing out this browser does not revoke other devices' sessions.
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw error;
      return 'Signed out on this device.';
    },
    dispose() { disposed = true; subscription.unsubscribe(); },
  };
}
