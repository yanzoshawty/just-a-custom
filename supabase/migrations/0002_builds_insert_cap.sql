-- Global backstop against storage flooding (audit-001 #1, #4).
-- The API's per-IP limit is in-memory per server instance, so it can't stop a
-- distributed flood. This trigger caps total inserts per hour across every instance.
-- Trade-off: a flood can block saves for everyone for up to an hour, but can no
-- longer fill the database. Raise the number if real traffic gets close.

create index builds_created_at_idx on public.builds (created_at);

create function public.builds_insert_cap() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.builds where created_at > now() - interval '1 hour') >= 1000 then
    -- errcode P0001 is mapped to HTTP 429 in src/lib/builds.ts
    raise exception 'builds insert cap reached' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger builds_insert_cap before insert on public.builds
  for each row execute function public.builds_insert_cap();

-- DB backstop for the SAFE_TEXT check in src/lib/build-schema.ts
alter table public.builds
  add constraint builds_name_no_cntrl check (name !~ '[[:cntrl:]]'),
  add constraint builds_builder_no_cntrl check (builder is null or builder !~ '[[:cntrl:]]');
