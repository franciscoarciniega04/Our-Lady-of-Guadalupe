-- PostgreSQL / Supabase. All application tables are private to server credentials.
create extension if not exists pgcrypto;
create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,full_name text not null,role text not null default 'member' check(role in('member','content_admin','courses_admin','super_admin')),permissions text[] not null default '{}',revoked boolean not null default false,created_at timestamptz not null default now());
create table public.schedules(id uuid primary key default gen_random_uuid(),title text not null,weekday integer check(weekday between 0 and 6),date date,time time not null,language text not null default 'Español',check((weekday is not null and date is null) or (weekday is null and date is not null)));
create table public.assets(id uuid primary key default gen_random_uuid(),storage_path text not null unique,mime text not null,size bigint not null check(size>0),status text not null default 'quarantine' check(status in('quarantine','clean','rejected')),owner_id uuid not null references public.profiles(id),created_at timestamptz not null default now());
create table public.announcements(id uuid primary key default gen_random_uuid(),title text not null,body text not null,published_at timestamptz not null default now(),expires_at timestamptz,pinned boolean not null default false,image_id uuid references public.assets(id),check(expires_at is null or expires_at>published_at));
create table public.videos(id uuid primary key default gen_random_uuid(),title text not null,description text not null default '',asset_id uuid not null references public.assets(id),thumbnail_id uuid references public.assets(id),published boolean not null default false,created_at timestamptz not null default now());
create table public.courses(id uuid primary key default gen_random_uuid(),title text not null,description text not null,sacrament text not null,price_cents integer not null check(price_cents>=50),tax_included boolean not null default true,published boolean not null default false,created_at timestamptz not null default now());
create table public.lessons(id uuid primary key default gen_random_uuid(),course_id uuid not null references public.courses(id),title text not null,body text not null default '',kind text not null default 'text' check(kind in('text','video','pdf')),asset_id uuid references public.assets(id),position integer not null check(position>=0),question text,options jsonb,correct_answer integer,unique(course_id,position),check((question is null and correct_answer is null) or (question is not null and options is not null and correct_answer>=0 and correct_answer<jsonb_array_length(options))));
create table public.payments(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),course_id uuid not null references public.courses(id),amount_cents integer not null check(amount_cents>0),currency text not null default 'usd' check(currency='usd'),status text not null default 'pending' check(status in('pending','confirmed','failed','refunded')),stripe_session_id text unique,stripe_payment_intent text unique,created_at timestamptz not null default now());
create unique index one_open_payment on public.payments(user_id,course_id) where status in('pending','confirmed');
create table public.enrollments(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),course_id uuid not null references public.courses(id),payment_id uuid not null unique references public.payments(id),status text not null default 'active' check(status in('active','revoked')),created_at timestamptz not null default now(),unique(user_id,course_id));
create table public.lesson_progress(user_id uuid not null references public.profiles(id),lesson_id uuid not null references public.lessons(id),completed_at timestamptz not null default now(),primary key(user_id,lesson_id));
create table public.certificates(id uuid primary key default gen_random_uuid(),folio uuid not null unique default gen_random_uuid(),user_id uuid not null references public.profiles(id),course_id uuid not null references public.courses(id),recipient_name text not null,course_title text not null,issued_at timestamptz not null default now(),storage_path text,revoked boolean not null default false,unique(user_id,course_id));
create table public.audit_logs(id bigint generated always as identity primary key,actor_id uuid,action text not null,entity text not null,record_id text,details jsonb not null default '{}',created_at timestamptz not null default now());
create table public.stripe_events(id text primary key,type text not null,created_at timestamptz not null default now());
create table public.rate_limits(key text primary key,window_start timestamptz not null,hits integer not null);
create index lessons_course on public.lessons(course_id);
create index payments_user on public.payments(user_id);
create index announcements_public on public.announcements(published_at,expires_at);

create function public.create_profile() returns trigger language plpgsql security definer set search_path=public as $$begin insert into profiles(id,full_name) values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name','Feligrés'),100));return new;end;$$;
create trigger auth_profile after insert on auth.users for each row execute function public.create_profile();
create function public.reject_audit_mutation() returns trigger language plpgsql as $$begin raise exception 'Audit log is append only';end;$$;
create trigger immutable_audit before update or delete or truncate on public.audit_logs for each statement execute function public.reject_audit_mutation();

create function public.take_rate_limit(p_key text,p_limit integer) returns boolean language plpgsql security definer set search_path=public as $$declare n integer;begin insert into rate_limits(key,window_start,hits) values(p_key,now(),1) on conflict(key) do update set hits=case when rate_limits.window_start<now()-interval '15 minutes' then 1 else rate_limits.hits+1 end,window_start=case when rate_limits.window_start<now()-interval '15 minutes' then now() else rate_limits.window_start end returning hits into n;return n<=p_limit;end;$$;

-- Only the verified-webhook route calls this atomic, idempotent transition.
create function public.apply_stripe_event(p_event_id text,p_type text,p_object jsonb) returns void language plpgsql security definer set search_path=public as $$
declare p payments;new_status text;
begin
 if exists(select 1 from stripe_events where id=p_event_id) then return;end if;
 if p_type in('checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed') then
  select * into p from payments where stripe_session_id=p_object->>'id' for update;
  if p.id is null then raise exception 'Payment session not yet persisted; retry webhook';end if;
  if p_type='checkout.session.async_payment_failed' then new_status:='failed';
  elsif p_object->>'payment_status'='paid' and p_object->'metadata'->>'payment_id'=p.id::text and p_object->>'currency'=p.currency and (p_object->>'amount_subtotal')::integer=p.amount_cents then new_status:='confirmed';
  else insert into stripe_events values(p_event_id,p_type,now()) on conflict do nothing;return;end if;
 elsif p_type='charge.refunded' then
  select * into p from payments where stripe_payment_intent=p_object->>'payment_intent' for update;
  if p.id is null then raise exception 'Payment not yet confirmed; retry webhook';end if;
  if (p_object->>'amount_refunded')::integer>0 then new_status:='refunded';end if;
 else insert into stripe_events values(p_event_id,p_type,now()) on conflict do nothing;return;
 end if;
 if exists(select 1 from stripe_events where id=p_event_id) then return;end if;
 if p.status='refunded' or (p.status='confirmed' and new_status='failed') then insert into stripe_events values(p_event_id,p_type,now()) on conflict do nothing;return;end if;
 update payments set status=new_status,stripe_payment_intent=coalesce(p_object->>'payment_intent',stripe_payment_intent) where id=p.id;
 if new_status='confirmed' then
  insert into enrollments(user_id,course_id,payment_id) values(p.user_id,p.course_id,p.id) on conflict(user_id,course_id) do update set status='active',payment_id=excluded.payment_id;
 elsif new_status='refunded' then
  update enrollments set status='revoked' where payment_id=p.id;
  update certificates set revoked=true where user_id=p.user_id and course_id=p.course_id;
 end if;
 insert into stripe_events values(p_event_id,p_type,now()) on conflict do nothing;
 insert into audit_logs(action,entity,record_id,details) values('payment.'||new_status,'payments',p.id::text,jsonb_build_object('event_id',p_event_id));
end;$$;

create function public.complete_lesson(p_user uuid,p_lesson uuid,p_answer integer default null) returns uuid language plpgsql security definer set search_path=public as $$
declare l lessons;cert uuid;total integer;done integer;begin
 select * into l from lessons where id=p_lesson;
 if l.id is null then raise exception 'Lesson not found';end if;
 perform 1 from enrollments e join payments p on p.id=e.payment_id where e.user_id=p_user and e.course_id=l.course_id and e.status='active' and p.status='confirmed' for update of e;
 if not found then raise exception 'Paid enrollment required';end if;
 if l.question is not null and p_answer is distinct from l.correct_answer then raise exception 'Incorrect answer';end if;
 insert into lesson_progress(user_id,lesson_id) values(p_user,l.id) on conflict do nothing;
 select count(*) into total from lessons where course_id=l.course_id;
 select count(*) into done from lesson_progress lp join lessons ls on ls.id=lp.lesson_id where lp.user_id=p_user and ls.course_id=l.course_id;
 if total>0 and done=total then
  insert into certificates(user_id,course_id,recipient_name,course_title) select p_user,l.course_id,p.full_name,c.title from profiles p,courses c where p.id=p_user and c.id=l.course_id on conflict(user_id,course_id) do update set revoked=false returning id into cert;
 end if;return cert;end;$$;

-- Table changes and their audit entries commit in the same transaction.
create function public.audit_change() returns trigger language plpgsql security definer set search_path=public as $$begin
 insert into audit_logs(actor_id,action,entity,record_id,details) values(nullif(current_setting('parish.actor',true),'')::uuid,TG_OP,TG_TABLE_NAME,coalesce(to_jsonb(NEW)->>'id',to_jsonb(OLD)->>'id'),jsonb_build_object('before',to_jsonb(OLD),'after',to_jsonb(NEW)));return coalesce(NEW,OLD);end;$$;
do $$declare t text;begin foreach t in array array['profiles','schedules','announcements','videos','courses','lessons'] loop execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.audit_change()',t,t);end loop;end;$$;

create function public.admin_write(p_actor uuid,p_table text,p_action text,p_id uuid,p_data jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare cols text;vals text;result jsonb;begin
 if p_table not in('schedules','announcements','videos','courses','lessons','profiles') then raise exception 'Invalid table';end if;
 perform set_config('parish.actor',p_actor::text,true);
 if p_action='delete' then execute format('delete from %I where id=$1 returning to_jsonb(%I.*)',p_table,p_table) into result using p_id;return result;end if;
 select string_agg(format('%I',key),','),string_agg(format('(jsonb_populate_record(null::%I,$1)).%I',p_table,key),',') into cols,vals from jsonb_object_keys(p_data) as key;
 if p_action='insert' then execute format('insert into %I (%s) select %s returning to_jsonb(%I.*)',p_table,cols,vals,p_table) into result using p_data;
 elsif p_action='update' then execute format('update %I set (%s)=(select %s) where id=$2 returning to_jsonb(%I.*)',p_table,cols,vals,p_table) into result using p_data,p_id;
 else raise exception 'Invalid action';end if;return result;end;$$;

do $$declare t text;begin for t in select tablename from pg_tables where schemaname='public' loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon,authenticated',t);execute format('grant all on public.%I to service_role',t);end loop;end;$$;
revoke all on all functions in schema public from public,anon,authenticated;
grant execute on all functions in schema public to service_role;
revoke update,delete,truncate on public.audit_logs from service_role;
-- Create private object-storage buckets separately using scripts/setup-storage.mjs.
