/*
  Account system for index.html: phone-number sign-in (no email, no SMS
  code) plus syncing which access codes an account has unlocked across
  devices. Defines window.TelestaiAccount; see CLAUDE.md's "Accounts
  (Supabase)" section and supabase/phone_auth.sql for the backing tables.

  The phone number *is* the credential -- 2FA/OTP is deliberately not
  required. Knowing a number loads that number's unlocked-page list, the
  same "unlisted, not private" model as the access codes themselves.

  Config comes from window.TELESTAI_SUPABASE (set in index.html from
  _data/supabase.yml). If those values are blank, init() resolves false
  and every other method is a safe no-op.
*/
window.TelestaiAccount = (function () {
  const STORAGE_KEY = 'telestai.account';
  const LOCAL_DB_KEY = 'telestai.phoneDb';
  let supabase = null;
  let initPromise = null;
  let cached = null;
  let usedLocalFallback = false;

  function configured() {
    const cfg = window.TELESTAI_SUPABASE || {};
    return !!(cfg.url && cfg.anonKey);
  }

  function readCache() {
    if (cached) return cached;
    try {
      cached = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (e) {
      cached = null;
    }
    return cached;
  }

  function writeCache(account) {
    cached = account;
    if (account) localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
    else localStorage.removeItem(STORAGE_KEY);
  }

  function normalizePhone(raw) {
    const digits = String(raw || '').replace(/\D/g, '');
    const withCountry = digits.length === 10 ? '1' + digits : digits;
    if (withCountry.length < 11 || withCountry.length > 15) return null;
    return '+' + withCountry;
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

  function explain(error, fallback) {
    const msg = (error && (error.message || error.code)) || '';
    const lower = String(msg).toLowerCase();
    if (error && error.code === 'PGRST202') {
      return 'phone accounts not installed on the backend yet';
    }
    if (lower.indexOf('invalid phone') !== -1) {
      return "that doesn't look like a phone number";
    }
    if ((error && error.code === '23505') || lower.indexOf('username taken') !== -1) {
      return 'that username is taken, try another';
    }
    console.error('TelestaiAccount:', error);
    return fallback;
  }

  function localSession(phone, username, slugs) {
    let db = {};
    try { db = JSON.parse(localStorage.getItem(LOCAL_DB_KEY) || '{}'); } catch (e) { db = {}; }
    if (!db[phone]) db[phone] = { username: null, slugs: [] };
    if (username != null) db[phone].username = String(username).trim() || null;
    if (slugs && slugs.length) {
      slugs.forEach(function (s) {
        if (s && db[phone].slugs.indexOf(s) === -1) db[phone].slugs.push(s);
      });
    }
    localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db));
    usedLocalFallback = true;
    return { phone: phone, username: db[phone].username, slugs: db[phone].slugs };
  }

  async function callSession(phone, username, slugs) {
    if (!(await init())) throw new Error('accounts not configured');
    const payload = {
      p_phone: phone,
      p_username: username || null,
      p_slugs: slugs && slugs.length ? slugs : null
    };
    const { data, error } = await supabase.rpc('phone_session', payload);
    if (!error) {
      usedLocalFallback = false;
      return data;
    }
    // RPC not installed yet -- keep this-browser accounts working so sign-in
    // isn't a brick wall, then prefer the real table once phone_auth.sql has
    // been run.
    if (error.code === 'PGRST202') {
      console.warn('TelestaiAccount: phone_session missing, using this-browser store');
      return localSession(phone, username, slugs);
    }
    throw new Error(explain(error, "couldn't reach accounts"));
  }

  async function signIn(phoneRaw) {
    const phone = normalizePhone(phoneRaw);
    if (!phone) throw new Error("that doesn't look like a phone number");
    const data = await callSession(phone, null, null);
    const account = {
      phone: data.phone,
      username: data.username || null,
      slugs: data.slugs || []
    };
    writeCache({ phone: account.phone, username: account.username });
    return account;
  }

  async function signOut() {
    writeCache(null);
  }

  async function getSession() {
    if (!(await init())) return null;
    return readCache();
  }

  async function getProfile() {
    const session = await getSession();
    if (!session) return null;
    try {
      const data = await callSession(session.phone, null, null);
      const account = {
        phone: data.phone,
        username: data.username || null
      };
      writeCache(account);
      return account;
    } catch (e) {
      console.error('TelestaiAccount: failed to load profile', e);
      return session;
    }
  }

  async function setUsername(username) {
    const session = await getSession();
    if (!session) throw new Error('not signed in');
    const data = await callSession(session.phone, username, null);
    writeCache({ phone: data.phone, username: data.username || null });
    return data;
  }

  async function syncUnlockedCode(slug) {
    const session = await getSession();
    if (!session || !slug) return;
    try {
      const data = await callSession(session.phone, null, [slug]);
      writeCache({ phone: data.phone, username: data.username || null });
    } catch (e) {
      console.error('TelestaiAccount: failed to sync unlocked code', e);
    }
  }

  async function syncUnlockedCodes(slugs) {
    const session = await getSession();
    if (!session) return [];
    const list = (slugs || []).filter(Boolean);
    const data = await callSession(session.phone, null, list.length ? list : null);
    writeCache({ phone: data.phone, username: data.username || null });
    return data.slugs || [];
  }

  async function fetchUnlockedCodes() {
    const session = await getSession();
    if (!session) return [];
    try {
      const data = await callSession(session.phone, null, null);
      return data.slugs || [];
    } catch (e) {
      console.error('TelestaiAccount: failed to fetch unlocked codes', e);
      return [];
    }
  }

  return {
    init: init,
    normalizePhone: normalizePhone,
    signIn: signIn,
    signOut: signOut,
    getSession: getSession,
    getProfile: getProfile,
    setUsername: setUsername,
    syncUnlockedCode: syncUnlockedCode,
    syncUnlockedCodes: syncUnlockedCodes,
    fetchUnlockedCodes: fetchUnlockedCodes
  };
})();
