import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;

const STATE_TABLE = 'thinklive_state';
const STATE_ROW_ID = 'main';

export function isSupabaseEnabled(): boolean {
  return Boolean(supabase);
}

export async function loadRemoteDbState<T>(): Promise<{ payload: T; updatedAt: string } | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from(STATE_TABLE)
      .select('payload, updated_at')
      .eq('id', STATE_ROW_ID)
      .maybeSingle();

    if (error) {
      console.warn('[Thinklive Supabase] Falha ao ler estado remoto:', error.message);
      return null;
    }

    if (!data || !data.payload) return null;
    return {
      payload: data.payload as T,
      updatedAt: typeof data.updated_at === 'string' ? data.updated_at : new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[Thinklive Supabase] Erro inesperado na leitura:', err);
    return null;
  }
}

export async function saveRemoteDbState<T>(payload: T): Promise<boolean> {
  if (!supabase) return false;
  try {
    const updatedAt = new Date().toISOString();
    const { error } = await supabase
      .from(STATE_TABLE)
      .upsert(
        {
          id: STATE_ROW_ID,
          payload,
          updated_at: updatedAt,
        },
        { onConflict: 'id' }
      );

    if (error) {
      console.warn('[Thinklive Supabase] Falha ao salvar estado remoto:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Thinklive Supabase] Erro inesperado ao salvar:', err);
    return false;
  }
}
