import { useState } from 'react';
import {
  Badge,
  Button,
  ConfirmationDialog,
  Dialog,
  EmptyState,
  ErrorState,
  Input,
  Select,
  Skeleton,
  useToast,
} from '../components/ui';
import {
  useAdminOpds,
  useCreateOpd,
  useToggleOpdStatus,
  useUpdateOpd,
  type OpdUnit,
} from '../features/opd/useAdminOpd';

export function AdminOpdPage() {
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'true' | 'false'>('all');

  const {
    data: opdList,
    isLoading,
    isError,
    error,
    refetch,
  } = useAdminOpds({
    search: search.trim() || undefined,
    is_active: statusFilter === 'all' ? undefined : statusFilter === 'true',
  });

  const createOpdMutation = useCreateOpd();
  const updateOpdMutation = useUpdateOpd();
  const toggleStatusMutation = useToggleOpdStatus();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingOpd, setEditingOpd] = useState<OpdUnit | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    is_active: true,
  });

  const [statusDialogOpd, setStatusDialogOpd] = useState<OpdUnit | null>(null);

  const handleOpenCreate = () => {
    setEditingOpd(null);
    setFormData({ code: '', name: '', is_active: true });
    setModalOpen(true);
  };

  const handleOpenEdit = (opd: OpdUnit) => {
    setEditingOpd(opd);
    setFormData({ code: opd.code, name: opd.name, is_active: opd.is_active });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      toast({
        type: 'danger',
        title: 'Validasi Gagal',
        message: 'Kode dan nama Perangkat Daerah wajib diisi.',
      });
      return;
    }

    try {
      if (editingOpd) {
        await updateOpdMutation.mutateAsync({
          id: editingOpd.id,
          data: {
            code: formData.code.trim().toUpperCase(),
            name: formData.name.trim(),
            is_active: formData.is_active,
          },
        });
        toast({
          type: 'success',
          title: 'OPD Diperbarui',
          message: `Data Perangkat Daerah "${formData.name}" berhasil disimpan.`,
        });
      } else {
        await createOpdMutation.mutateAsync({
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          is_active: formData.is_active,
        });
        toast({
          type: 'success',
          title: 'OPD Ditambahkan',
          message: `Perangkat Daerah "${formData.name}" berhasil didaftarkan.`,
        });
      }
      setModalOpen(false);
      setEditingOpd(null);
    } catch (err: unknown) {
      toast({
        type: 'danger',
        title: 'Gagal Menyimpan OPD',
        message: (err as Error)?.message || 'Terjadi kesalahan sistem.',
      });
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!statusDialogOpd) return;

    try {
      const nextStatus = !statusDialogOpd.is_active;
      await toggleStatusMutation.mutateAsync({
        id: statusDialogOpd.id,
        is_active: nextStatus,
      });

      toast({
        type: 'success',
        title: nextStatus ? 'OPD Diaktifkan' : 'OPD Dinonaktifkan',
        message: nextStatus
          ? `Perangkat Daerah "${statusDialogOpd.name}" aktif kembali untuk pengajuan permohonan baru.`
          : `Perangkat Daerah "${statusDialogOpd.name}" dinonaktifkan. Seluruh berkas historis tetap terjaga.`,
      });
      setStatusDialogOpd(null);
    } catch (err: unknown) {
      toast({
        type: 'danger',
        title: 'Gagal Mengubah Status',
        message: (err as Error)?.message || 'Terjadi kesalahan sistem.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Master Data Perangkat Daerah (OPD)
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Pengelolaan referensi resmi unit kerja pemohon di lingkungan Pemerintah Kabupaten Bandung.
          </p>
        </div>
        <Button onClick={handleOpenCreate} variant="primary" size="md">
          + Tambah Unit OPD
        </Button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="w-full md:w-80">
          <Input
            placeholder="Cari kode atau nama dinas/badan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Status:
          </span>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'true' | 'false')}
            className="text-xs"
          >
            <option value="all">Semua Status</option>
            <option value="true">Aktif Saja</option>
            <option value="false">Nonaktif Saja</option>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : isError ? (
        <ErrorState
          title="Gagal Memuat Master OPD"
          description={error?.message || 'Terjadi gangguan saat mengambil data.'}
          onRetry={refetch}
        />
      ) : !opdList || opdList.length === 0 ? (
        <EmptyState
          title="Tidak Ada Unit Perangkat Daerah"
          description={
            search
              ? `Tidak ditemukan OPD yang cocok dengan kata kunci "${search}".`
              : 'Belum ada data unit OPD yang tersimpan.'
          }
          action={
            <Button onClick={handleOpenCreate} variant="primary" size="sm">
              Tambah OPD Pertama
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Kode</th>
                  <th className="px-5 py-3.5">Nama Perangkat Daerah</th>
                  <th className="px-5 py-3.5 text-center">Permohonan</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {opdList.map((opd) => (
                  <tr key={opd.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4 font-mono font-semibold text-[#1B5040] text-xs">
                      {opd.code}
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {opd.name}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                        {opd.application_count || 0} Tiket
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <Badge variant={opd.is_active ? 'success' : 'neutral'}>
                        {opd.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right space-x-2 whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(opd)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant={opd.is_active ? 'outline' : 'primary'}
                        size="sm"
                        onClick={() => setStatusDialogOpd(opd)}
                        className={
                          opd.is_active
                            ? 'text-amber-700 hover:bg-amber-50 border-amber-300'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        }
                      >
                        {opd.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
            <span>Total: <strong>{opdList.length}</strong> Perangkat Daerah terdaftar</span>
            <span>SIMANTIK Master Data &copy; Pemkab Bandung</span>
          </div>
        </div>
      )}

      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingOpd ? 'Edit Perangkat Daerah' : 'Tambah Perangkat Daerah Baru'}
        description="Pastikan kode OPD unik dan sesuai nomenklatur resmi tata kelola Pemkab Bandung."
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kode OPD <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Contoh: DISKOMINFO, BAPENDA, DINKES"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              required
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Gunakan huruf kapital tanpa spasi untuk memudahkan pencocokan kode tiket.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nama Lengkap Perangkat Daerah <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Contoh: Dinas Komunikasi dan Informatika"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="opd_is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-[#1B5040] focus:ring-[#1B5040]"
            />
            <label htmlFor="opd_is_active" className="text-xs font-semibold text-slate-700">
              Unit OPD Aktif (Dapat dipilih pemohon pada portal layanan publik)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
              disabled={createOpdMutation.isPending || updateOpdMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={createOpdMutation.isPending || updateOpdMutation.isPending}
            >
              {createOpdMutation.isPending || updateOpdMutation.isPending
                ? 'Menyimpan...'
                : 'Simpan OPD'}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmationDialog
        isOpen={Boolean(statusDialogOpd)}
        onClose={() => setStatusDialogOpd(null)}
        onConfirm={handleConfirmToggleStatus}
        title={
          statusDialogOpd?.is_active
            ? `Nonaktifkan ${statusDialogOpd?.code}?`
            : `Aktifkan Kembali ${statusDialogOpd?.code}?`
        }
        description={
          statusDialogOpd?.is_active
            ? `Apakah Anda yakin ingin menonaktifkan "${statusDialogOpd?.name}"? Unit ini tidak akan muncul pada pilihan formulir baru. Seluruh tiket permohonan dan dokumen historis yang telah terdaftar dari OPD ini tetap utuh dan terlindungi.`
            : `Aktifkan kembali "${statusDialogOpd?.name}" agar dapat dipilih oleh pemohon OPD pada formulir pengajuan layanan.`
        }
        confirmLabel={
          statusDialogOpd?.is_active ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan'
        }
        cancelLabel="Batal"
        variant={statusDialogOpd?.is_active ? 'danger' : 'primary'}
      />
    </div>
  );
}
