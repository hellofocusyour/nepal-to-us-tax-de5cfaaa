create extension if not exists pg_net with schema extensions;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (user_id) do update
    set email = excluded.email,
        full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name);

  insert into public.user_roles (user_id, role)
  values (new.id, 'student')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

create or replace function public.send_welcome_email_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  req_id bigint;
begin
  select net.http_post(
    url := 'https://heupdkfdjdrbdwvzlywf.supabase.co/functions/v1/send-welcome-email',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'users',
      'schema', 'auth',
      'record', jsonb_build_object(
        'id', new.id,
        'email', new.email,
        'raw_user_meta_data', new.raw_user_meta_data
      )
    )
  ) into req_id;

  return new;
exception when others then
  raise warning 'send_welcome_email_on_signup failed: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

drop trigger if exists on_auth_user_created_send_welcome on auth.users;
create trigger on_auth_user_created_send_welcome
  after insert on auth.users
  for each row
  execute function public.send_welcome_email_on_signup();