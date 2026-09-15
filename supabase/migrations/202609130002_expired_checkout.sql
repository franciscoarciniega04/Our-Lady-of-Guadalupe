-- Keep the payment lifecycle function from migration 1 and intercept expiration atomically.
alter function public.apply_stripe_event(text,text,jsonb) rename to apply_stripe_event_v1;
create function public.apply_stripe_event(p_event_id text,p_type text,p_object jsonb) returns void language plpgsql security definer set search_path=public as $$
declare p payments;
begin
 if p_type<>'checkout.session.expired' then perform apply_stripe_event_v1(p_event_id,p_type,p_object);return;end if;
 if exists(select 1 from stripe_events where id=p_event_id) then return;end if;
 select * into p from payments where stripe_session_id=p_object->>'id' for update;
 if p.id is null then raise exception 'Payment session not yet persisted; retry webhook';end if;
 if p.status='pending' then update payments set status='failed' where id=p.id;insert into audit_logs(action,entity,record_id,details) values('payment.expired','payments',p.id::text,jsonb_build_object('event_id',p_event_id));end if;
 insert into stripe_events values(p_event_id,p_type,now()) on conflict do nothing;
end;$$;
revoke all on function public.apply_stripe_event(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.apply_stripe_event(text,text,jsonb) to service_role;
