-- Keep course completion requirements stable after the first paid enrollment.
create function public.guard_enrolled_lessons() returns trigger language plpgsql set search_path=public as $$
begin
 if exists(select 1 from enrollments where course_id in(coalesce(NEW.course_id,OLD.course_id),OLD.course_id)) then raise exception 'Course has enrollments; create a new course edition to change lessons';end if;
 return coalesce(NEW,OLD);
end;$$;
create trigger freeze_enrolled_lessons before insert or update or delete on public.lessons for each row execute function public.guard_enrolled_lessons();
revoke all on function public.guard_enrolled_lessons() from public,anon,authenticated;
