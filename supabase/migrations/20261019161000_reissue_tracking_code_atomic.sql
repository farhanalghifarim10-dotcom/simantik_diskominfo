-- ============================================================
-- SIMANTIK - Atomic Tracking Code Reissue Transaction Function
-- Eksekusi atomik pembaruan hash dan pencatatan audit log
-- ============================================================

create or replace function public.reissue_tracking_code_atomic(
  p_application_id uuid,
  p_new_hash text,
  p_actor_profile_id uuid,
  p_actor_email text,
  p_actor_name text,
  p_actor_role text,
  p_ticket_number text,
  p_reason text,
  p_now timestamptz default pg_catalog.now()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated_count integer;
  v_audit_id uuid;
begin
  -- 1. Mutasi tabel applications
  update public.applications
  set
    tracking_code_hash = p_new_hash,
    updated_at = p_now
  where id = p_application_id;

  get diagnostics v_updated_count = row_count;
  if v_updated_count = 0 then
    raise exception 'Permohonan dengan ID % tidak ditemukan.', p_application_id;
  end if;

  -- 2. Mutasi tabel audit_logs dalam transaksi database yang SAMA
  v_audit_id := pg_catalog.gen_random_uuid();
  insert into public.audit_logs (
    id,
    actor_profile_id,
    application_id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data,
    created_at
  ) values (
    v_audit_id,
    p_actor_profile_id,
    p_application_id,
    'TRACKING_CODE_REISSUED',
    'applications',
    p_application_id,
    null,
    pg_catalog.jsonb_build_object(
      'ticket_number', p_ticket_number,
      'actor_id', p_actor_profile_id,
      'actor_email', p_actor_email,
      'actor_name', p_actor_name,
      'actor_role', p_actor_role,
      'reason', p_reason,
      'reissued_at', p_now
    ),
    p_now
  );

  return pg_catalog.jsonb_build_object(
    'application_id', p_application_id,
    'audit_id', v_audit_id,
    'updated_at', p_now
  );
end;
$$;

-- Cabut seluruh hak eksekusi dari role publik, anon, dan authenticated
revoke all on function public.reissue_tracking_code_atomic(uuid, text, uuid, text, text, text, text, text, timestamptz) from public;
revoke all on function public.reissue_tracking_code_atomic(uuid, text, uuid, text, text, text, text, text, timestamptz) from anon;
revoke all on function public.reissue_tracking_code_atomic(uuid, text, uuid, text, text, text, text, text, timestamptz) from authenticated;

-- Berikan hak EXECUTE secara eksklusif hanya kepada service_role
grant execute on function public.reissue_tracking_code_atomic(uuid, text, uuid, text, text, text, text, text, timestamptz) to service_role;

comment on function public.reissue_tracking_code_atomic is 'Transaksional ACID: Memperbarui hash kode pelacakan dan mencatat jejak audit dalam satu transaksi PostgreSQL tunggal.';
