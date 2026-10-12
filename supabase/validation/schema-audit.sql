-- Read-only structural audit after BOTH migrations. Run as project administrator.
select c.relname as table_name,c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r'
  and c.relname in ('profiles','paddle_customers','billing_checkouts','billing_subscriptions','paddle_webhook_events')
order by c.relname;
-- Expect exactly five rows, all rls_enabled=true.
select table_name,column_name,data_type,is_nullable,column_default
from information_schema.columns where table_schema='public'
  and table_name in ('profiles','paddle_customers','billing_checkouts','billing_subscriptions','paddle_webhook_events')
order by table_name,ordinal_position;
select tablename,policyname,roles,cmd,qual,with_check
from pg_policies where schemaname='public'
  and tablename in ('profiles','paddle_customers','billing_checkouts','billing_subscriptions','paddle_webhook_events')
order by tablename,policyname;
-- Expect only profiles_read_own, profiles_update_own, subscriptions_read_own.
select t.name,r.name as role_name,
  has_table_privilege(r.name,'public.'||t.name,'SELECT') as can_select,
  has_table_privilege(r.name,'public.'||t.name,'INSERT') as can_insert,
  has_table_privilege(r.name,'public.'||t.name,'UPDATE') as can_update_all_columns,
  has_table_privilege(r.name,'public.'||t.name,'DELETE') as can_delete
from (values ('profiles'),('paddle_customers'),('billing_checkouts'),('billing_subscriptions'),('paddle_webhook_events')) t(name)
cross join (values ('anon'),('authenticated'),('service_role')) r(name)
order by t.name,r.name;
-- anon: all false. authenticated: SELECT only on profiles/subscriptions;
-- service_role: SELECT/INSERT/UPDATE true, DELETE false.
-- Profile display-name UPDATE is a COLUMN grant (not an all-columns UPDATE grant).
select has_column_privilege('authenticated','public.profiles','display_name','UPDATE') as display_name_update,
  has_column_privilege('authenticated','public.profiles','id','UPDATE') as id_update,
  has_column_privilege('authenticated','public.profiles','created_at','UPDATE') as created_at_update;
-- Expect true,false,false.
select conrelid::regclass as table_name,conname,pg_get_constraintdef(oid) as definition
from pg_constraint where connamespace='public'::regnamespace
  and conrelid in ('public.profiles'::regclass,'public.paddle_customers'::regclass,
    'public.billing_checkouts'::regclass,'public.billing_subscriptions'::regclass,'public.paddle_webhook_events'::regclass)
order by conrelid::regclass::text,conname;
-- Financial Auth FKs: SET NULL. Customer/event FKs: RESTRICT. Only profiles cascades.
select t.tgrelid::regclass as table_name,t.tgname,pg_get_triggerdef(t.oid) as definition
from pg_trigger t where not t.tgisinternal and t.tgrelid in
  ('auth.users'::regclass,'public.paddle_customers'::regclass,'public.billing_checkouts'::regclass,'public.billing_subscriptions'::regclass)
order by t.tgname;
select p.proname,p.prosecdef as security_definer,p.proconfig
from pg_proc p where p.pronamespace='public'::regnamespace
  and p.proname in ('create_account_profile','prevent_billing_owner_change');
-- Profile trigger function: security definer + empty search_path; ownership guard: invoker.
