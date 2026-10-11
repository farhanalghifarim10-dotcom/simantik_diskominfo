import { useState } from 'react';
import {
  Badge,
  Button,
  ConfirmationDialog,
  Dialog,
  Drawer,
  EmptyState,
  ErrorState,
  Input,
  Select,
  Skeleton,
  useToast,
} from '../components/ui';
import {
  useAdminTechnicians,
  useCreateTechnician,
  useTechnicianDetail,
  useToggleTechnicianStatus,
  useUpdateTechnician,
  type TechnicianAccount,
} from '../features/technicians/useAdminTechnicians';

export function AdminTechniciansPage() {
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'true' | 'false'>('all');

  const {
    data: technicians,
    isLoading,
    isError,
    error,
    refetch,
  } = useAdminTechnicians({
    search: search.trim() || undefined,
    is_active: statusFilter === 'all' ? undefined : statusFilter === 'true',
  });

  const createTechMutation = useCreateTechnician();
  const updateTechMutation = useUpdateTechnician();
  const toggleStatusMutation = useToggleTechnicianStatus();

  // Dialog State: Create / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<TechnicianAccount | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    is_active: true,
  });

  // Drawer Detail & Workload State
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const { data: techDetail, isLoading: isDetailLoading } = useTechnicianDetail(
    selectedTechId || '',
  );

  // Status Dialog State
  const [statusDialogTech, setStatusDialogTech] = useState<TechnicianAccount | null>(null);

  const handleOpenCreate = () => {
    setEditingTech(null);
    setFormData({
      full_name: '',
      email: '',
      password: '',
      is_active: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (tech: TechnicianAccount) => {
    setEditingTech(tech);
    setFormData({
      full_name: tech.full_name,
      email: tech.email,
      password: '',
      is_active: tech.is_active,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim() || !formData.email.trim()) {
      toast({
        type: 'danger',
        title: 'Validasi Gagal',
        message: 'Nama lengkap dan alamat email wajib diisi.',
      });
      return;
    }

    try {
      if (editingTech) {
        await updateTechMutation.mutateAsync({
          id: editingTech.id,
          data: {
            full_name: formData.full_name.trim(),
            email: formData.email.trim().toLowerCase(),
            password: formData.password ? formData.password : undefined,
            is_active: formData.is_active,
          },
        });
        toast({
          type: 'success',
          title: 'Profil Teknisi Diperbarui',
          message: `Data teknisi "${formData.full_name}" berhasil disimpan.`,
        });
      } else {
        await createTechMutation.mutateAsync({
          full_name: formData.full_name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password || undefined,
          is_active: formData.is_active,
        });
        toast({
          type: 'success',
          title: 'Akun Teknisi Didaftarkan',
          message: `Akun teknisi "${formData.full_name}" telah aktif di Supabase Auth & profil SIMANTIK.`,
        });
      }
      setModalOpen(false);
      setEditingTech(null);
    } catch (err: unknown) {
      toast({
        type: 'danger',
        title: 'Gagal Menyimpan Teknisi',
        message: (err as Error)?.message || 'Terjadi kesalahan sistem.',
      });
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!statusDialogTech) return;

    try {
      const nextStatus = !statusDialogTech.is_active;
      await toggleStatusMutation.mutateAsync({
        id: statusDialogTech.id,
        is_active: nextStatus,
      });

      toast({
        type: 'success',
        title: nextStatus ? 'Akun Teknisi Diaktifkan' : 'Akun Teknisi Dinonaktifkan',
        message: nextStatus
          ? `Akun teknisi "${statusDialogTech.full_name}" kini dapat login kembali dan menerima penugasan baru.`
          : `Akun teknisi "${statusDialogTech.full_name}" dinonaktifkan. Seluruh riwayat penugasan dan catatan teknis tetap aman.`,
      });
      setStatusDialogTech(null);
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Manajemen Personel Teknisi
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Pengelolaan akun teknisi internal Diskominfo yang berhak menerima penugasan pekerjaan aplikasi.
          </p>
        </div>
        <Button onClick={handleOpenCreate} variant="primary" size="md">
          + Daftarkan Teknisi Baru
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="w-full md:w-80">
          <Input
            placeholder="Cari nama atau email teknisi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Status Akun:
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

      {/* Main Table */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : isError ? (
        <ErrorState
          title="Gagal Memuat Data Teknisi"
          description={error?.message || 'Terjadi gangguan koneksi.'}
          onRetry={refetch}
        />
      ) : !technicians || technicians.length === 0 ? (
        <EmptyState
          title="Belum Ada Personel Teknisi"
          description={
            search
              ? `Tidak ditemukan teknisi dengan pencarian "${search}".`
              : 'Belum ada akun teknisi yang terdaftar pada sistem.'
          }
          action={
            <Button onClick={handleOpenCreate} variant="primary" size="sm">
              Daftarkan Teknisi Pertama
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Nama Personel</th>
                  <th className="px-5 py-3.5">Email Akun</th>
                  <th className="px-5 py-3.5 text-center">Beban Aktif</th>
                  <th className="px-5 py-3.5 text-center">Total Riwayat</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {technicians.map((tech) => (
                  <tr key={tech.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {tech.full_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span>{tech.full_name}</span>
                          <span className="block text-[11px] text-slate-500 font-normal">
                            Role: TECHNICIAN
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-600 text-xs">
                      {tech.email}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          tech.active_assignments_count > 0
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {tech.active_assignments_count} Tiket Aktif
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center text-xs font-medium text-slate-600">
                      {tech.total_assignments_count} Penugasan
                    </td>
                    <td className="px-5 py-4 text-center">
                      <Badge variant={tech.is_active ? 'success' : 'neutral'}>
                        {tech.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right space-x-2 whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTechId(tech.id)}
                      >
                        Riwayat
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(tech)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant={tech.is_active ? 'outline' : 'primary'}
                        size="sm"
                        onClick={() => setStatusDialogTech(tech)}
                        className={
                          tech.is_active
                            ? 'text-amber-700 hover:bg-amber-50 border-amber-300'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        }
                      >
                        {tech.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
            <span>Total: <strong>{technicians.length}</strong> Personel Teknisi</span>
            <span>SIMANTIK RBAC &copy; Diskominfo Kab. Bandung</span>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Teknisi */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTech ? 'Edit Profil Teknisi' : 'Daftarkan Teknisi Baru'}
        description="Akun teknisi terintegrasi langsung dengan Supabase Auth untuk otentikasi login aman."
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nama Lengkap & Gelar <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Contoh: Ahmad Fauzi, S.Kom"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Alamat Email Resmi <span className="text-red-500">*</span>
            </label>
            <Input
              type="email"
              placeholder="nama.teknisi@bandungkab.go.id"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {editingTech ? 'Ganti Password (Opsional)' : 'Password Awal'}
            </label>
            <Input
              type="password"
              placeholder={editingTech ? 'Kosongkan jika tidak ingin mengubah password' : 'Min. 8 karakter (opsional, auto-generated jika kosong)'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Kredensial disimpan secara terenkripsi di Supabase Auth dan tidak pernah diekspos ke publik.
            </span>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="tech_is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="tech_is_active" className="text-xs font-semibold text-slate-700">
              Akun Teknisi Aktif (Dapat menerima penugasan & login ke Lembar Kerja)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
              disabled={createTechMutation.isPending || updateTechMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={createTechMutation.isPending || updateTechMutation.isPending}
            >
              {createTechMutation.isPending || updateTechMutation.isPending
                ? 'Menyimpan...'
                : 'Simpan Akun'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Drawer Riwayat Penugasan */}
      <Drawer
        isOpen={Boolean(selectedTechId)}
        onClose={() => setSelectedTechId(null)}
        title={techDetail ? `Riwayat Penugasan: ${techDetail.full_name}` : 'Detail Teknisi'}
        description={`Email: ${techDetail?.email || '-'}`}
        size="lg"
      >
        <div className="space-y-6">
          {isDetailLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : !techDetail ? (
            <EmptyState title="Teknisi tidak ditemukan" />
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                  <span className="text-xs text-blue-700 font-semibold block mb-1">
                    Beban Kerja Aktif
                  </span>
                  <span className="text-2xl font-bold text-blue-900">
                    {techDetail.active_assignments_count} Tiket
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <span className="text-xs text-slate-600 font-semibold block mb-1">
                    Total Riwayat Penugasan
                  </span>
                  <span className="text-2xl font-bold text-slate-900">
                    {techDetail.total_assignments_count} Tiket
                  </span>
                </div>
              </div>

              {/* Assignment List */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Daftar Penugasan Aplikasi
                </h4>
                {techDetail.recent_assignments && techDetail.recent_assignments.length > 0 ? (
                  <div className="space-y-2.5">
                    {techDetail.recent_assignments.map((asgn) => (
                      <div
                        key={asgn.id}
                        className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between shadow-sm"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs font-bold text-blue-700">
                              {asgn.ticket_number}
                            </span>
                            <Badge variant={asgn.is_current ? 'primary' : 'neutral'}>
                              {asgn.is_current ? 'Sedang Berjalan' : 'Selesai / Dialihkan'}
                            </Badge>
                          </div>
                          <span className="text-xs font-semibold text-slate-900 block">
                            {asgn.title}
                          </span>
                          <span className="text-[11px] text-slate-400 mt-0.5 block">
                            Ditugaskan sejak: {new Date(asgn.assigned_at).toLocaleDateString('id-ID')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Belum ada riwayat penugasan untuk teknisi ini.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Drawer>

      {/* Confirmation Dialog Toggle Status */}
      <ConfirmationDialog
        isOpen={Boolean(statusDialogTech)}
        onClose={() => setStatusDialogTech(null)}
        onConfirm={handleConfirmToggleStatus}
        title={
          statusDialogTech?.is_active
            ? `Nonaktifkan Akun ${statusDialogTech?.full_name}?`
            : `Aktifkan Kembali ${statusDialogTech?.full_name}?`
        }
        description={
          statusDialogTech?.is_active
            ? `Menonaktifkan akun teknisi akan mencabut hak akses login ke sistem SIMANTIK. Seluruh riwayat pekerjaan, hasil pengujian, catatan teknis, dan jejak audit terdahulu tetap 100% terjaga dan tidak akan dihapus demi integritas arsip.`
            : `Teknisi "${statusDialogTech?.full_name}" akan dapat login kembali dan menerima penugasan pekerjaan baru.`
        }
        confirmLabel={
          statusDialogTech?.is_active ? 'Ya, Nonaktifkan Akun' : 'Ya, Aktifkan Akun'
        }
        cancelLabel="Batal"
        variant={statusDialogTech?.is_active ? 'danger' : 'primary'}
      />
    </div>
  );
}
