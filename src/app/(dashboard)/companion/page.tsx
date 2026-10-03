import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { ChatWindow, type DisplayMessage } from '@/components/companion/ChatWindow';

export default async function CompanionPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Resume the latest conversation (RLS limits this to the user's own rows)
  const { data } = await supabase
    .from('ai_conversations')
    .select('id, messages')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const messages: DisplayMessage[] = Array.isArray(data?.messages)
    ? (data.messages as { role: 'user' | 'assistant'; content: string }[]).map((m) => ({ role: m.role, content: m.content }))
    : [];

  return <ChatWindow initialMessages={messages} initialConversationId={data?.id ?? null} />;
}
