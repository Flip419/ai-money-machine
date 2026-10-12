import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const mockSdk = `
export function createClient(url, key, options) {
  if (!options.auth.persistSession || !options.auth.autoRefreshToken || options.auth.flowType !== 'pkce') throw Error('Invalid auth options');
  let listener;
  const storage = options.auth.storageKey;
  const emit = session => { if (session) localStorage.setItem(storage, JSON.stringify(session)); else localStorage.removeItem(storage); listener?.(session ? 'SIGNED_IN' : 'SIGNED_OUT', session); };
  return { auth: {
    onAuthStateChange(fn) { listener=fn; return { data:{ subscription:{ unsubscribe(){} } } }; },
    async getSession() { return { data: { session: JSON.parse(localStorage.getItem(storage) || 'null') }, error:null }; },
    async signInWithPassword({email,password}) {
      if(password==='wrong-password') return {error:Error('invalid credentials')};
      emit({user:{id:'11111111-1111-4111-8111-111111111111',email}}); return {error:null};
    },
    async signUp({email,password,options}) { window.testRedirect=options.emailRedirectTo; return {data:{session:null},error:null}; },
    async signOut() { emit(null); return {error:null}; }
  } };
}`;

test('browser sign-up, sign-in, restoration, sign-out and checkout pause', async () => {
  const server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname;
      const file = resolve(root, pathname === '/' ? 'index.html' : `.${pathname}`);
      if (!file.startsWith(`${root}/`)) { response.writeHead(403).end(); return; }
      const types = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css' };
      response.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
      response.end(await readFile(file));
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  const errors = [];
  const remoteRequests = [];
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext();
    await context.route('**/*', async route => {
      const url = route.request().url();
      if (url.startsWith(origin)) return route.continue();
      if (url.includes('/@supabase/supabase-js@2.49.8/+esm')) {
        return route.fulfill({contentType:'text/javascript',body:mockSdk});
      }
      if (url.includes('pdf.min.js') || url.includes('mammoth.browser.min.js')) {
        return route.fulfill({contentType:'text/javascript',body:''});
      }
      remoteRequests.push(url);
      return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    await page.locator('button[value="signup"]').waitFor();
    await page.waitForFunction(() => !document.querySelector('button[value="signup"]').disabled);
    await page.locator('#authEmail').fill('user@example.invalid');
    await page.locator('#authPassword').fill('new-password');
    await page.locator('button[value="signup"]').click();
    await page.waitForFunction(() => document.querySelector('#authMessage').textContent.includes('confirm'));
    assert.equal(await page.evaluate(() => window.testRedirect), `${origin}/`);
    assert.equal(await page.locator('#authPassword').inputValue(), '');
    await page.locator('#authPassword').fill('wrong-password');
    await page.locator('button[value="signin"]').click();
    await page.waitForFunction(() => document.querySelector('#authMessage').textContent.includes('Could not'));
    assert.equal(await page.locator('#accountSession').isVisible(), false);
    await page.locator('#authPassword').fill('correct-password');
    await page.locator('button[value="signin"]').click();
    await page.locator('#accountSession').waitFor({state:'visible'});
    assert.equal(await page.locator('#accountEmail').textContent(), 'user@example.invalid');
    await page.reload();
    await page.locator('#accountSession').waitFor({state:'visible'});
    await page.locator('#signOut').click();
    await page.locator('#authForm').waitFor({state:'visible'});
    await page.reload();
    await page.waitForFunction(() => !document.querySelector('button[value="signin"]').disabled);
    assert.equal(await page.locator('#accountSession').isVisible(), false);
    await page.evaluate(() => {
      renderAnalysisList('keywordsList', ['<img src=x onerror="window.analysisInjected=true">']);
    });
    assert.equal(await page.locator('#keywordsList img').count(), 0);
    assert.equal(await page.evaluate(() => window.analysisInjected), undefined);
    assert.match(await page.locator('#keywordsList').textContent(), /<img/);
    await page.locator('.buy').first().click();
    await page.locator('#modal').waitFor({state:'visible'});
    assert.match(await page.locator('#modalTitle').textContent(), /checkout is next/);
    assert.deepEqual(errors, []);
    assert.deepEqual(remoteRequests, []);
    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
