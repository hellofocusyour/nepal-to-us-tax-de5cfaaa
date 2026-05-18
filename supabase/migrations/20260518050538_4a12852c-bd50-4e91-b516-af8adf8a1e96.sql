
-- Enable pg_net for HTTP calls from Postgres
create extension if not exists pg_net with schema extensions;

-- Trigger function that calls the send-welcome-email edge function
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

drop trigger if exists on_auth_user_created_send_welcome on auth.users;
create trigger on_auth_user_created_send_welcome
  after insert on auth.users
  for each row
  execute function public.send_welcome_email_on_signup();
