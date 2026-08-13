/*
  Account system for index.html: email-OTP sign-in, a chosen username (shown
  in place of the terminal prompt's device/browser/IP text), and syncing
  which access codes an account has unlocked across devices. Defines
  window.TelestaiAccount; see CLAUDE.md's "Accounts (Supabase)" section for
  the full design and supabase/schema.sql for the backing tables.

  Backed by Supabase (https://supabase.com) -- config comes from
  window.TELESTAI_SUPABASE, set inline in index.html from
  _data/supabase.yml. Loaded in <head> like the other assets/js/*.js
  engines, but everything here is async: call TelestaiAccount.init() once
  and await it before using anything else.

  If _data/supabase.yml is left blank (the default for a fresh clone),
  init() resolves to false and every other method becomes a safe no-op --
  the rest of the site must keep working with zero account backend
  configured.
*/
window.TelestaiAccount = (function () {
  let supabase = null;
  let initPromise = null;

  function configured() {
    const cfg = window.TELESTAI_SUPABASE || {};
    return !!(cfg.url && cfg.anonKey);
  }

  function init() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      if (!configured()) return false;
      try {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        supabase = createClient(window.TELESTAI_SUPABASE.url, window.TELESTAI_SUPABASE.anonKey);
        return true;
      } catch (e) {
        console.error('TelestaiAccount: failed to load Supabase client', e);
        return false;
      }
    })();
    return initPromise;
  }

  async function sendCode(email) {
    if (!(await init())) throw new Error('accounts not configured');
    const { error } = await supabase.auth.signInWithOtp({ email: email });
    if (error) throw error;
  }

  async function verifyCode(email, code) {
    if (!(await init())) throw new Error('accounts not configured');
    const { data, error } = await supabase.auth.verifyOtp({ email: email, token: code, type: 'email' });
    if (error) throw error;
    return data.session;
  }

  async function signOut() {
    if (!(await init())) return;
    await supabase.auth.signOut();
  }

  async function getSession() {
    if (!(await init())) return null;
    const { data } = await supabase.auth.getSession();
    return data.session;
  }

  async function getProfile() {
    if (!(await init())) return null;
    const session = await getSession();
    if (!session) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('username, phone')
      .eq('id', session.user.id)
      .single();
    if (error) {
      console.error('TelestaiAccount: failed to load profile', error);
      return null;
    }
    return data;
  }

  async function setUsername(username) {
    if (!(await init())) throw new Error('accounts not configured');
    const session = await getSession();
    if (!session) throw new Error('not signed in');
    const { error } = await supabase
      .from('profiles')
      .update({ username: username })
      .eq('id', session.user.id);
    if (error) throw error;
  }

  async function setPhone(phone) {
    if (!(await init())) throw new Error('accounts not configured');
    const session = await getSession();
    if (!session) throw new Error('not signed in');
    const { error } = await supabase
      .from('profiles')
      .update({ phone: phone })
      .eq('id', session.user.id);
    if (error) throw error;
  }

  // Fire-and-forget from check()'s success path -- failures are logged, not
  // thrown, so a flaky network never blocks the (already-succeeded) local
  // unlock experience.
  async function syncUnlockedCode(slug) {
    if (!(await init())) return;
    const session = await getSession();
    if (!session) return;
    const { error } = await supabase
      .from('unlocked_codes')
      .upsert({ account_id: session.user.id, slug: slug }, { onConflict: 'account_id,slug', ignoreDuplicates: true });
    if (error) console.error('TelestaiAccount: failed to sync unlocked code', error);
  }

  async function fetchUnlockedCodes() {
    if (!(await init())) return [];
    const session = await getSession();
    if (!session) return [];
    const { data, error } = await supabase.from('unlocked_codes').select('slug');
    if (error) {
      console.error('TelestaiAccount: failed to fetch unlocked codes', error);
      return [];
    }
    return data.map(function (row) { return row.slug; });
  }

  return {
    init: init,
    sendCode: sendCode,
    verifyCode: verifyCode,
    signOut: signOut,
    getSession: getSession,
    getProfile: getProfile,
    setUsername: setUsername,
    setPhone: setPhone,
    syncUnlockedCode: syncUnlockedCode,
    fetchUnlockedCodes: fetchUnlockedCodes
  };
})();
