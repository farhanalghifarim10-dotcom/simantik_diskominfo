-- ============================================================
-- SIMANTIK - Security Hardening & Audit Verification
-- Explicit Default-Deny Policies & Storage Isolation
-- ============================================================

-- ------------------------------------------------------------
-- 1. STORAGE SECURITY HARDENING
--
-- Pastikan bucket 'simantik-documents' berstatus privat
-- dan seluruh akses direct dari anon/authenticated ditolak.
-- Akses unduh dan unggah wajib melalui NestJS API service role.
-- ------------------------------------------------------------

-- Pastikan bucket privat
update storage.buckets
set public = false
where id = 'simantik-documents';

-- Revoke hak akses storage langsung dari anon & authenticated
revoke all on schema storage from anon, authenticated;
revoke all on table storage.objects from anon, authenticated;
revoke all on table storage.buckets from anon, authenticated;

-- ------------------------------------------------------------
-- 2. EXPLICIT DEFAULT-DENY POLICIES
--
-- Meskipun privileges sudah di-revoke, kita tambahkan kebijakan
-- RLS default-deny eksplisit untuk mencegah eskalasi jika
-- privilege schema diubah di masa depan.
-- ------------------------------------------------------------

-- Hapus kebijakan anon/authenticated yang mungkin ada di storage.objects
drop policy if exists "Deny all direct anon/authenticated access to documents" on storage.objects;

create policy "Deny all direct anon/authenticated access to documents"
  on storage.objects
  for all
  to anon, authenticated
  using (false);

-- ------------------------------------------------------------
-- 3. AUDIT LOG INTEGRITY PROTECTION
--
-- Log audit tidak boleh diubah (UPDATE) atau dihapus (DELETE)
-- oleh siapapun, termasuk pengguna terautentikasi.
-- Hanya boleh INSERT (Append-Only Log).
-- ------------------------------------------------------------

create or replace function public.prevent_audit_log_tampering()
returns trigger as $$
begin
  raise exception 'Audit log entries are immutable and cannot be updated or deleted.';
end;
$$ language plpgsql;

drop trigger if exists trg_prevent_audit_log_update_delete on public.audit_logs;

create trigger trg_prevent_audit_log_update_delete
before update or delete on public.audit_logs
for each row
execute function public.prevent_audit_log_tampering();

comment on table public.audit_logs is 'Append-only immutable audit trail for security and regulatory compliance.';
