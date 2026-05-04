-- Conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_key TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('web','instagram','messenger','whatsapp')),
  customer_id TEXT NOT NULL,
  customer_name TEXT,
  customer_avatar TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_preview TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_last_message_at ON public.conversations(last_message_at DESC);
CREATE INDEX idx_conversations_platform ON public.conversations(platform);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage conversations"
ON public.conversations FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students view own web conversation"
ON public.conversations FOR SELECT TO authenticated
USING (conversation_key = 'web:' || auth.uid()::text);

CREATE POLICY "Students insert own web conversation"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (conversation_key = 'web:' || auth.uid()::text AND platform = 'web');

CREATE POLICY "Students update own web conversation"
ON public.conversations FOR UPDATE TO authenticated
USING (conversation_key = 'web:' || auth.uid()::text);

-- Messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_key TEXT NOT NULL REFERENCES public.conversations(conversation_key) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('web','instagram','messenger','whatsapp')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  sender_id TEXT,
  text TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  external_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation_key ON public.messages(conversation_key, created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage messages"
ON public.messages FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students view own web messages"
ON public.messages FOR SELECT TO authenticated
USING (conversation_key = 'web:' || auth.uid()::text);

CREATE POLICY "Students insert own web messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  conversation_key = 'web:' || auth.uid()::text
  AND platform = 'web'
  AND direction = 'inbound'
);

-- Platform credentials (single row, admin only)
CREATE TABLE public.platform_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  app_secret TEXT,
  verify_token TEXT,
  page_access_token TEXT,
  whatsapp_token TEXT,
  whatsapp_phone_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.platform_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage platform credentials"
ON public.platform_credentials FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger to update conversations.updated_at-like field via last_message_at handled in app code
CREATE TRIGGER update_platform_credentials_updated_at
BEFORE UPDATE ON public.platform_credentials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;