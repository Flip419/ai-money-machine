-- VALIDATION ONLY. Run the complete script in ONE SQL Editor execution.
-- Replace ONLY REPLACE_WITH_CONFIRMED_AUTH_USER_UUID with the UUID of the one
-- confirmed test account. No password/token/service key belongs in this script.
-- Successful execution rolls back every fixture and temporary profile update.
begin;
select set_config('validation.user_id', 'REPLACE_WITH_CONFIRMED_AUTH_USER_UUID', true);
select set_config('validation.other_user_id', gen_random_uuid()::text, true);
select set_config('validation.suffix', replace(gen_random_uuid()::text, '-', ''), true);
do $$
begin
  if not exists (select 1 from auth.users where id = current_setting('validation.user_id')::uuid and email_confirmed_at is not null) then
    raise exception 'A confirmed real Auth test user is required';
  end if;
  if not exists (select 1 from public.profiles where id = current_setting('validation.user_id')::uuid) then
    raise exception 'Signup profile trigger did not create a profile';
  end if;
end;
$$;
-- Synthetic, canceled sandbox records; these are NOT Paddle entities or paid access.
insert into public.paddle_customers (environment,user_id,owner_reference,paddle_customer_id)
values ('sandbox',current_setting('validation.user_id')::uuid,current_setting('validation.user_id')::uuid,'ctm_'||current_setting('validation.suffix'));
insert into public.paddle_webhook_events (environment,event_id,event_type,occurred_at,payload)
values ('sandbox','evt_'||current_setting('validation.suffix'),'subscription.canceled',now(),'{"validation_only":true}');
insert into public.billing_subscriptions
  (environment,user_id,owner_reference,paddle_customer_id,paddle_subscription_id,paddle_price_id,plan,status,last_event_id,last_event_occurred_at)
values ('sandbox',current_setting('validation.user_id')::uuid,current_setting('validation.user_id')::uuid,
  'ctm_'||current_setting('validation.suffix'),'sub_'||current_setting('validation.suffix'),
  'pri_'||current_setting('validation.suffix'),'starter','canceled','evt_'||current_setting('validation.suffix'),now());

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
declare t text;
begin
  foreach t in array array['profiles','paddle_customers','billing_checkouts','billing_subscriptions','paddle_webhook_events'] loop
    begin
      execute format('select * from public.%I', t);
      raise exception 'FAIL: anon can read %', t;
    exception when insufficient_privilege then null;
    end;
    begin
      execute format('insert into public.%I default values', t);
      raise exception 'FAIL: anon can insert %', t;
    exception when insufficient_privilege then null;
    end;
    begin
      if t = 'profiles' then
        execute 'update public.profiles set display_name=display_name where false';
      else
        execute format('update public.%I set environment=environment where false',t);
      end if;
      raise exception 'FAIL: anon can update %',t;
    exception when insufficient_privilege then null;
    end;
    begin
      execute format('delete from public.%I where false', t);
      raise exception 'FAIL: anon can delete %', t;
    exception when insufficient_privilege then null;
    end;
  end loop;
end;
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('validation.user_id'), true);
select set_config('request.jwt.claims', json_build_object('sub',current_setting('validation.user_id'),'role','authenticated')::text, true);
do $$
declare t text; n integer;
begin
  select count(*) into n from public.profiles where id = auth.uid();
  if n <> 1 then raise exception 'FAIL: own profile unreadable'; end if;
  if exists (select 1 from public.profiles where id <> auth.uid()) then
    raise exception 'FAIL: another profile visible';
  end if;
  if not exists (select 1 from public.billing_subscriptions where paddle_subscription_id='sub_'||current_setting('validation.suffix')) then
    raise exception 'FAIL: own subscription unreadable';
  end if;
  if exists (select 1 from public.billing_subscriptions where user_id is distinct from auth.uid()) then
    raise exception 'FAIL: another subscription visible';
  end if;
  update public.profiles set display_name='Temporary validation name' where id=auth.uid();
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: permitted profile update failed'; end if;
  begin
    update public.profiles set created_at=now() where id=auth.uid();
    raise exception 'FAIL: client can edit protected profile column';
  exception when insufficient_privilege then null;
  end;
  foreach t in array array['paddle_customers','billing_checkouts','paddle_webhook_events'] loop
    begin
      execute format('select * from public.%I',t);
      raise exception 'FAIL: client can read server-only %',t;
    exception when insufficient_privilege then null;
    end;
  end loop;
  foreach t in array array['paddle_customers','billing_checkouts','billing_subscriptions','paddle_webhook_events'] loop
    begin
      execute format('insert into public.%I default values',t);
      raise exception 'FAIL: client can insert %',t;
    exception when insufficient_privilege then null;
    end;
    begin
      execute format('update public.%I set environment=environment where false',t);
      raise exception 'FAIL: client can update %',t;
    exception when insufficient_privilege then null;
    end;
    begin
      execute format('delete from public.%I where false',t);
      raise exception 'FAIL: client can delete %',t;
    exception when insufficient_privilege then null;
    end;
  end loop;
end;
$$;

-- Simulate a different authenticated identity; no second real user is created.
select set_config('request.jwt.claim.sub', current_setting('validation.other_user_id'), true);
select set_config('request.jwt.claims', json_build_object('sub',current_setting('validation.other_user_id'),'role','authenticated')::text, true);
do $$
declare n integer;
begin
  if exists (select 1 from public.profiles where id=current_setting('validation.user_id')::uuid) then
    raise exception 'FAIL: foreign profile visible';
  end if;
  if exists (select 1 from public.billing_subscriptions where paddle_subscription_id='sub_'||current_setting('validation.suffix')) then
    raise exception 'FAIL: foreign subscription visible';
  end if;
  update public.profiles set display_name='Forbidden' where id=current_setting('validation.user_id')::uuid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: foreign profile modified'; end if;
end;
$$;
reset role;
select 'PASS: anonymous denial, own-row reads, foreign-row isolation, restricted profile updates and server-only billing writes' as validation_result;
rollback;
-- If execution errors, execute ROLLBACK separately before further SQL. Never COMMIT.
