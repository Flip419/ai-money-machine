import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('PostgreSQL migrations enforce ownership, RLS, environment boundaries and history retention', async () => {
  const db = new PGlite();
  const first = '11111111-1111-4111-8111-111111111111';
  const second = '22222222-2222-4222-8222-222222222222';
  const asUser = async id => {
    await db.exec('reset role; set role authenticated;');
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  };
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
      grant usage on schema public, auth to anon, authenticated, service_role;
      grant execute on function auth.uid() to authenticated;
      -- Simulate broad Supabase defaults: migrations must explicitly revoke them.
      alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
      insert into auth.users values ('${first}');
    `);
    for (const file of ['202610120001_paddle_webhook_inbox.sql', '202610120002_account_billing_foundation.sql']) {
      await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
    }
    // First account is backfilled; second exercises the sign-up profile trigger.
    await db.exec(`insert into auth.users values ('${second}');`);
    assert.equal((await db.query('select count(*)::int as count from public.profiles')).rows[0].count, 2);
    const rls = await db.query("select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'");
    assert.equal(rls.rows.length, 5);
    assert.ok(rls.rows.every(row => row.relrowsecurity));
    await db.exec('set role service_role;');
    for (const [id, suffix] of [[first, 'one'], [second, 'two']]) {
      await db.query(`insert into public.paddle_customers (environment,user_id,owner_reference,paddle_customer_id) values ('sandbox',$1,$1,$2)`, [id, `ctm_${suffix}`]);
      await db.query(`insert into public.paddle_webhook_events (environment,event_id,event_type,occurred_at,payload)
        values ('sandbox',$1,'transaction.completed',now(),'{}')`, [`evt_${suffix}`]);
      await db.query(`insert into public.billing_subscriptions
        (environment,user_id,owner_reference,paddle_customer_id,paddle_subscription_id,paddle_price_id,plan,status,last_event_id,last_event_occurred_at)
        values ('sandbox',$1,$1,$2,$3,'pri_test','starter','active',$4,now())`, [id, `ctm_${suffix}`, `sub_${suffix}`, `evt_${suffix}`]);
    }
    await db.query(`insert into public.billing_checkouts
      (environment,user_id,owner_reference,paddle_customer_id,plan,paddle_price_id,request_key)
      values ('sandbox',$1,$1,'ctm_one','starter','pri_test','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')`, [first]);
    // A live checkout cannot reference a sandbox customer.
    await assert.rejects(db.query(`insert into public.billing_checkouts
      (environment,user_id,owner_reference,paddle_customer_id,plan,paddle_price_id,request_key)
      values ('live',$1,$1,'ctm_one','starter','pri_test','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')`, [first]), /foreign key/);
    await assert.rejects(db.query(`update public.paddle_customers set owner_reference=$1,user_id=$1 where paddle_customer_id='ctm_one'`, [second]), /cannot be reassigned/);
    await assert.rejects(db.exec('delete from public.billing_subscriptions'), /permission denied/);
    await assert.rejects(db.exec('delete from public.paddle_webhook_events'), /permission denied/);
    await asUser(first);
    assert.equal((await db.query('select id from public.profiles')).rows.length, 1);
    assert.equal((await db.query('select paddle_subscription_id from public.billing_subscriptions')).rows[0].paddle_subscription_id, 'sub_one');
    await db.query('update public.profiles set display_name=$1 where id=$2', ['First user', first]);
    await db.query('update public.profiles set display_name=$1 where id=$2', ['Hacked', second]);
    await assert.rejects(db.exec("update public.profiles set created_at=now()"), /permission denied/);
    await assert.rejects(db.exec("update public.billing_subscriptions set status='active'"), /permission denied/);
    for (const table of ['paddle_customers', 'billing_checkouts', 'paddle_webhook_events']) {
      await assert.rejects(db.exec(`select * from public.${table}`), /permission denied/);
    }
    await asUser(second);
    assert.equal((await db.query('select display_name from public.profiles')).rows[0].display_name, '');
    assert.equal((await db.query('select paddle_subscription_id from public.billing_subscriptions')).rows[0].paddle_subscription_id, 'sub_two');
    await db.exec('reset role; set role anon;');
    for (const table of ['profiles', 'paddle_customers', 'billing_checkouts', 'billing_subscriptions', 'paddle_webhook_events']) {
      await assert.rejects(db.exec(`select * from public.${table}`), /permission denied/);
      await assert.rejects(db.exec(`delete from public.${table}`), /permission denied/);
    }
    await db.exec('reset role;');
    await db.query('delete from auth.users where id=$1', [first]);
    assert.equal((await db.query('select count(*)::int as count from public.profiles')).rows[0].count, 1);
    for (const table of ['paddle_customers', 'billing_checkouts', 'billing_subscriptions']) {
      const record = (await db.query(`select user_id,owner_reference from public.${table} where owner_reference=$1`, [first])).rows[0];
      assert.equal(record.user_id, null);
      assert.equal(record.owner_reference, first);
    }
    assert.equal((await db.query('select count(*)::int as count from public.paddle_webhook_events')).rows[0].count, 2);
  } finally { await db.close(); }
});

test('deployment handoff SQL passes against PostgreSQL and rolls back fixtures', async () => {
  const db = new PGlite();
  const id = '33333333-3333-4333-8333-333333333333';
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users (id uuid primary key, email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as
        $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
      grant usage on schema public, auth to anon, authenticated, service_role;
      grant execute on function auth.uid() to authenticated;
      alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    `);
    for (const file of ['202610120001_paddle_webhook_inbox.sql', '202610120002_account_billing_foundation.sql']) {
      await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
    }
    await db.query('insert into auth.users (id,email_confirmed_at) values ($1,now())', [id]);
    const sql = await readFile(new URL('../supabase/validation/account-billing-rls.sql', import.meta.url), 'utf8');
    await db.exec(sql.replaceAll('REPLACE_WITH_CONFIRMED_AUTH_USER_UUID', id));
    for (const table of ['paddle_customers','billing_checkouts','billing_subscriptions','paddle_webhook_events']) {
      assert.equal((await db.query(`select count(*)::int as count from public.${table}`)).rows[0].count, 0);
    }
    assert.equal((await db.query('select display_name from public.profiles')).rows[0].display_name, '');
    await db.exec(await readFile(new URL('../supabase/validation/schema-audit.sql', import.meta.url), 'utf8'));
  } finally { await db.close(); }
});
