import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  ConfirmationDialog,
  Dialog,
  Drawer,
  EmptyState,
  ErrorState,
  FileTextIcon,
  Input,
  PlusIcon,
  Select,
  Skeleton,
  Textarea,
  useToast,
} from '../components/ui';
import {
  useAdminServices,
  useCreateRequirement,
  useCreateService,
  useDeleteRequirement,
  useUpdateRequirement,
  useUpdateService,
  type RequirementType,
  type Service,
  type ServiceRequirement,
  type ServiceType,
} from '../features/services/useAdminServices';

export function AdminServicesPage() {
  const { toast } = useToast();

  const {
    data: services,
    isLoading,
    isError,
    error,
    refetch,
  } = useAdminServices();

  const createServiceMutation = useCreateService();
  const updateServiceMutation = useUpdateService();
  const createRequirementMutation = useCreateRequirement();
  const updateRequirementMutation = useUpdateRequirement();
  const deleteRequirementMutation = useDeleteRequirement();

  const [createServiceModalOpen, setCreateServiceModalOpen] = useState(false);
  const [newServiceForm, setNewServiceForm] = useState({
    code: '',
    name: '',
    type: 'DEVELOPMENT' as ServiceType,
    description: '',
    sort_order: 1,
    is_active: true,
  });

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    is_active: true,
    sort_order: 1,
  });

  const [requirementModalOpen, setRequirementModalOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<ServiceRequirement | null>(null);
  const [requirementForm, setRequirementForm] = useState({
    name: '',
    description: '',
    type: 'DOCUMENT' as RequirementType,
    is_required: true,
    sort_order: 1,
    is_active: true,
    allowed_file_types: 'application/pdf,image/png,image/jpeg',
    max_file_size_mb: 10,
    is_placeholder: false,
  });

  const [deletingRequirement, setDeletingRequirement] = useState<{
    serviceId: string;
    requirement: ServiceRequirement;
  } | null>(null);

  const selectedService = services?.find((s) => s.id === selectedServiceId) || null;

  const handleOpenEditService = (service: Service) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      description: service.description || '',
      is_active: service.is_active,
      sort_order: service.sort_order,
    });
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    try {
      await updateServiceMutation.mutateAsync({
        id: editingService.id,
        data: serviceForm,
      });
      toast({
        type: 'success',
        title: 'Layanan Diperbarui',
        message: `Metadata layanan "${serviceForm.name}" berhasil disimpan.`,
      });
      setEditingService(null);
    } catch (err: unknown) {
      toast({
        type: 'danger',
        title: 'Gagal Memperbarui Layanan',
        message: (err as Error)?.message || 'Terjadi kesalahan saat menyimpan perubahan.',
      });
    }
  };

  const handleOpenAddRequirement = () => {
    if (!selectedService) return;
    setEditingRequirement(null);
    setRequirementForm({
      name: '',
      description: '',
      type: 'DOCUMENT',
      is_required: true,
      sort_order: (selectedService.requirements?.length || 0) + 1,
      is_active: true,
      allowed_file_types: 'application/pdf,image/png,image/jpeg',
      max_file_size_mb: 10,
      is_placeholder: false,
    });
    setRequirementModalOpen(true);
  };

  const handleOpenEditRequirement = (req: ServiceRequirement) => {
    setEditingRequirement(req);
    setRequirementForm({
      name: req.name,
      description: req.description || '',
      type: req.type,
      is_required: req.is_required,
      sort_order: req.sort_order,
      is_active: req.is_active !== false,
      allowed_file_types: req.allowed_file_types || 'application/pdf,image/png,image/jpeg',
      max_file_size_mb: req.max_file_size_mb || 10,
      is_placeholder: Boolean(req.is_placeholder),
    });
    setRequirementModalOpen(true);
  };

  const handleSaveNewService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceForm.code.trim() || !newServiceForm.name.trim()) {
      toast({
        type: 'danger',
        title: 'Validasi Gagal',
        message: 'Kode dan nama layanan wajib diisi.',
      });
      return;
    }

    try {
      await createServiceMutation.mutateAsync(newServiceForm);
      toast({
        type: 'success',
        title: 'Layanan Ditambahkan',
        message: `Layanan "${newServiceForm.name}" berhasil ditambahkan ke katalog SIMANTIK.`,
      });
      setCreateServiceModalOpen(false);
      setNewServiceForm({
        code: '',
        name: '',
        type: 'DEVELOPMENT',
        description: '',
        sort_order: 1,
        is_active: true,
      });
    } catch (err: unknown) {
      toast({
        type: 'danger',
        title: 'Gagal Menambah Layanan',
        message: (err as Error)?.message || 'Terjadi kesalahan sistem.',
      });
    }
  };

  const handleSaveRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    if (!requirementForm.name.trim()) {
      toast({
        type: 'danger',
        title: 'Validasi Gagal',
        message: 'Nama persyaratan wajib diisi.',
      });
      return;
    }

    try {
      if (editingRequirement) {
        await updateRequirementMutation.mutateAsync({
          serviceId: selectedService.id,
          reqId: editingRequirement.id,
          data: requirementForm,
        });
        toast({
          type: 'success',
          title: 'Persyaratan Diperbarui',
          message: `Persyaratan "${requirementForm.name}" berhasil dimutakhirkan.`,
        });
      } else {
        await createRequirementMutation.mutateAsync({
          serviceId: selectedService.id,
          data: requirementForm,
        });
        toast({
          type: 'success',
          title: 'Persyaratan Ditambahkan',
          message: `Persyaratan "${requirementForm.name}" berhasil ditambahkan ke layanan.`,
        });
      }
      setRequirementModalOpen(false);
      setEditingRequirement(null);
    } catch (err: unknown) {
      toast({
        type: 'danger',
        title: 'Gagal Menyimpan Persyaratan',
        message: (err as Error)?.message || 'Terjadi kesalahan pada peladen.',
      });
    }
  };

  const handleConfirmDeleteRequirement = async () => {
    if (!deletingRequirement) return;

    try {
      await deleteRequirementMutation.mutateAsync({
        serviceId: deletingRequirement.serviceId,
        reqId: deletingRequirement.requirement.id,
      });
      toast({
        type: 'success',
        title: 'Persyaratan Dihapus',
        message: `Persyaratan "${deletingRequirement.requirement.name}" telah dihapus.`,
      });
      setDeletingRequirement(null);
    } catch (err: unknown) {
      toast({
        type: 'danger',
        title: 'Gagal Menghapus Persyaratan',
        message: (err as Error)?.message || 'Terjadi kesalahan pada peladen.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Katalog Master Layanan TI
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola katalog layanan permohonan TI, kriteria kelayakan, dan persyaratan dokumen wajib vs opsional OPD.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => setCreateServiceModalOpen(true)}
            className="font-bold"
          >
            + Tambah Layanan Baru
          </Button>
          <Badge variant="primary" className="font-semibold text-xs">
            Akses: SUPER_ADMIN
          </Badge>
        </div>
      </div>

      <Alert variant="info" title="Panduan Integritas Regulasi SPBE">
        <p className="text-xs text-slate-700 leading-relaxed">
          Jangan mengarang persyaratan resmi instansi yang belum dikonfirmasi melalui SK atau Perbup. 
          Persyaratan yang belum ditetapkan secara yuridis dapat ditandai sebagai <strong>Data Konfigurasi / Implementasi</strong> agar tetap fleksibel.
        </p>
      </Alert>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      )}

      {!isLoading && isError && (
        <div className="bg-white rounded-xl border border-red-200 p-8">
          <ErrorState
            title="Gagal Memuat Master Layanan"
            description={error?.message || 'Terjadi kendala saat menghubungkan ke peladen API.'}
            onRetry={() => refetch()}
          />
        </div>
      )}

      {!isLoading && !isError && (!services || services.length === 0) && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <EmptyState
            title="Katalog Layanan Kosong"
            description="Belum ada layanan yang terdaftar dalam master data sistem SIMANTIK."
          />
        </div>
      )}

      {!isLoading && !isError && services && services.length > 0 && (
        <div className="grid grid-cols-1 gap-6">
          {services.map((service) => {
            const reqs = service.requirements || [];
            const requiredCount = reqs.filter((r) => r.is_required).length;
            const optionalCount = reqs.filter((r) => !r.is_required).length;

            return (
              <div
                key={service.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-slate-300 transition-colors"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-xs font-bold bg-[#CAF3E4] text-[#1B5040] px-2.5 py-0.5 rounded border border-[#98F7D9]">
                      {service.code}
                    </span>
                    <Badge variant={service.type === 'DEVELOPMENT' ? 'primary' : 'info'} className="text-xs font-semibold">
                      {service.type === 'DEVELOPMENT' ? 'Pembangunan Aplikasi Baru' : 'Pengembangan Aplikasi Eksisting'}
                    </Badge>
                    <Badge variant={service.is_active ? 'success' : 'neutral'} className="text-xs">
                      {service.is_active ? 'Publik / Aktif' : 'Nonaktif'}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      Urutan: {service.sort_order}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {service.name}
                    </h2>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Slug: /{service.slug}
                    </p>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed max-w-3xl">
                      {service.description || 'Belum ada deskripsi layanan.'}
                    </p>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5 font-medium">
                      <FileTextIcon size={14} className="text-slate-400" />
                      Total Persyaratan: <strong>{reqs.length}</strong>
                    </span>
                    <span className="text-red-700 font-semibold bg-red-50 px-2 py-0.5 rounded">
                      {requiredCount} Dokumen Wajib
                    </span>
                    <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {optionalCount} Dokumen Pendukung / Opsional
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-2.5 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
                  <Button
                    variant="primary"
                    size="sm"
                    className="font-bold justify-center"
                    onClick={() => setSelectedServiceId(service.id)}
                  >
                    Kelola Persyaratan ({reqs.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-center"
                    onClick={() => handleOpenEditService(service)}
                  >
                    Edit Metadata Layanan
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Drawer
        isOpen={Boolean(selectedServiceId)}
        onClose={() => setSelectedServiceId(null)}
        title={selectedService?.name || 'Kelola Persyaratan Layanan'}
        description={`Daftar dokumen dan data prasyarat pengajuan permohonan (${selectedService?.code})`}
        size="xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-slate-500">
              Total {selectedService?.requirements?.length || 0} persyaratan terdaftar
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedServiceId(null)}
            >
              Tutup Panel
            </Button>
          </div>
        }
      >
        {selectedService && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Daftar Persyaratan Layanan
                </h3>
                <p className="text-xs text-slate-500">
                  Pastikan dokumen wajib dibedakan jelas dari dokumen opsional.
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenAddRequirement}
                leftIcon={<PlusIcon size={14} />}
                className="font-bold shrink-0"
              >
                Tambah Persyaratan
              </Button>
            </div>

            {(!selectedService.requirements || selectedService.requirements.length === 0) ? (
              <div className="p-8 text-center border border-dashed border-slate-300 rounded-xl">
                <p className="text-sm font-semibold text-slate-700">Belum ada persyaratan</p>
                <p className="text-xs text-slate-500 mt-1">Klik tombol di atas untuk menambahkan persyaratan pengajuan.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedService.requirements.map((req, idx) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">
                          {req.name}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant={req.is_required ? 'danger' : 'neutral'}
                          className="text-[10px] font-bold"
                        >
                          {req.is_required ? 'WAJIB' : 'OPSIONAL'}
                        </Badge>
                        <Badge variant="info" className="text-[10px]">
                          {req.type}
                        </Badge>
                        <Badge
                          variant={req.is_active !== false ? 'success' : 'neutral'}
                          className="text-[10px]"
                        >
                          {req.is_active !== false ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </div>
                    </div>

                    {req.description && (
                      <p className="text-xs text-slate-600 pl-7 leading-relaxed">
                        {req.description}
                      </p>
                    )}

                    {req.allowed_file_types && (
                      <p className="text-[11px] text-slate-500 pl-7">
                        Format berkas: <span className="font-mono text-slate-700">{req.allowed_file_types}</span> {req.max_file_size_mb ? `(Maks. ${req.max_file_size_mb} MB)` : ''}
                      </p>
                    )}

                    {req.is_placeholder && (
                      <div className="pl-7">
                        <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-mono">
                          *Placeholder / Data Implementasi (Belum SK Resmi)
                        </span>
                      </div>
                    )}

                    <div className="pt-2 pl-7 flex items-center justify-between border-t border-slate-100 text-xs text-slate-500">
                      <span>Urutan: #{req.sort_order}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditRequirement(req)}
                          className="text-[#1B5040] hover:underline font-semibold cursor-pointer"
                        >
                          Ubah
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() =>
                            setDeletingRequirement({
                              serviceId: selectedService.id,
                              requirement: req,
                            })
                          }
                          className="text-red-600 hover:text-red-800 font-semibold cursor-pointer"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Drawer>

      <Dialog
        isOpen={Boolean(editingService)}
        onClose={() => setEditingService(null)}
        title={`Edit Metadata: ${editingService?.code}`}
        description="Perbarui informasi publik dan status katalog layanan"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingService(null)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveService}
              isLoading={updateServiceMutation.isPending}
            >
              Simpan Perubahan
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveService} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Layanan <span className="text-red-500">*</span>
            </label>
            <Input
              value={serviceForm.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setServiceForm({ ...serviceForm, name: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Deskripsi Layanan
            </label>
            <Textarea
              rows={3}
              value={serviceForm.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setServiceForm({ ...serviceForm, description: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Urutan Tampilan
              </label>
              <Input
                type="number"
                value={serviceForm.sort_order}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setServiceForm({
                    ...serviceForm,
                    sort_order: parseInt(e.target.value, 10) || 1,
                  })
                }
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Publik
              </label>
              <Select
                value={serviceForm.is_active ? 'true' : 'false'}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setServiceForm({
                    ...serviceForm,
                    is_active: e.target.value === 'true',
                  })
                }
              >
                <option value="true">Aktif (Tampil di Publik)</option>
                <option value="false">Nonaktif (Disembunyikan)</option>
              </Select>
            </div>
          </div>
        </form>
      </Dialog>

      <Dialog
        isOpen={requirementModalOpen}
        onClose={() => setRequirementModalOpen(false)}
        title={editingRequirement ? 'Ubah Persyaratan Layanan' : 'Tambah Persyaratan Baru'}
        description={`Konfigurasi persyaratan dokumen untuk ${selectedService?.name}`}
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRequirementModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveRequirement}
              isLoading={
                createRequirementMutation.isPending ||
                updateRequirementMutation.isPending
              }
            >
              {editingRequirement ? 'Simpan Perubahan' : 'Tambahkan Persyaratan'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveRequirement} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Persyaratan <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Contoh: Kerangka Acuan Kerja (KAK)"
              value={requirementForm.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setRequirementForm({ ...requirementForm, name: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Petunjuk / Format Dokumen
            </label>
            <Textarea
              rows={2}
              placeholder="Contoh: Dokumen memuat maksud, tujuan, ruang lingkup proses bisnis (Format PDF, maks. 10 MB)."
              value={requirementForm.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setRequirementForm({
                  ...requirementForm,
                  description: e.target.value,
                })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipe Persyaratan
              </label>
              <Select
                value={requirementForm.type}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setRequirementForm({
                    ...requirementForm,
                    type: e.target.value as RequirementType,
                  })
                }
              >
                <option value="DOCUMENT">Dokumen (Unggah File PDF)</option>
                <option value="DATA">Data / Isian Formulir</option>
                <option value="CONFIRMATION">Pernyataan Komitmen</option>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sifat Persyaratan
              </label>
              <Select
                value={requirementForm.is_required ? 'true' : 'false'}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setRequirementForm({
                    ...requirementForm,
                    is_required: e.target.value === 'true',
                  })
                }
              >
                <option value="true">Wajib (Mandatory)</option>
                <option value="false">Opsional / Pendukung</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Format Berkas Diizinkan
              </label>
              <Input
                placeholder="Contoh: application/pdf,image/png"
                value={requirementForm.allowed_file_types}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRequirementForm({ ...requirementForm, allowed_file_types: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Batas Ukuran Maksimal (MB)
              </label>
              <Input
                type="number"
                value={requirementForm.max_file_size_mb}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRequirementForm({
                    ...requirementForm,
                    max_file_size_mb: parseInt(e.target.value, 10) || 10,
                  })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Urutan
              </label>
              <Input
                type="number"
                value={requirementForm.sort_order}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRequirementForm({
                    ...requirementForm,
                    sort_order: parseInt(e.target.value, 10) || 1,
                  })
                }
              />
            </div>

            <div className="pt-4 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={requirementForm.is_active}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setRequirementForm({
                      ...requirementForm,
                      is_active: e.target.checked,
                    })
                  }
                  className="rounded border-slate-300 text-[#1B5040] focus:ring-[#1B5040]"
                />
                <span>Persyaratan Aktif (Dipersyaratkan)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={requirementForm.is_placeholder}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setRequirementForm({
                      ...requirementForm,
                      is_placeholder: e.target.checked,
                    })
                  }
                  className="rounded border-slate-300 text-[#1B5040] focus:ring-[#1B5040]"
                />
                <span>Tandai sebagai Placeholder / Konfigurasi</span>
              </label>
            </div>
          </div>
        </form>
      </Dialog>

      <Dialog
        isOpen={createServiceModalOpen}
        onClose={() => setCreateServiceModalOpen(false)}
        title="Tambah Layanan TI Baru"
        description="Daftarkan layanan baru ke dalam katalog resmi SIMANTIK Diskominfo."
      >
        <form onSubmit={handleSaveNewService} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kode Layanan <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Contoh: SRV-DEV, SRV-ENH, SRV-INT"
              value={newServiceForm.code}
              onChange={(e) => setNewServiceForm({ ...newServiceForm, code: e.target.value.toUpperCase() })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nama Layanan <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Contoh: Pembangunan Aplikasi Baru"
              value={newServiceForm.name}
              onChange={(e) => setNewServiceForm({ ...newServiceForm, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tipe Layanan
              </label>
              <Select
                value={newServiceForm.type}
                onChange={(e) => setNewServiceForm({ ...newServiceForm, type: e.target.value as ServiceType })}
              >
                <option value="DEVELOPMENT">Pembangunan Aplikasi</option>
                <option value="ENHANCEMENT">Pengembangan Eksisting</option>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Urutan Tampilan
              </label>
              <Input
                type="number"
                value={newServiceForm.sort_order}
                onChange={(e) => setNewServiceForm({ ...newServiceForm, sort_order: parseInt(e.target.value, 10) || 1 })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Deskripsi Layanan
            </label>
            <Textarea
              rows={3}
              placeholder="Uraikan ruang lingkup dan tujuan layanan ini..."
              value={newServiceForm.description}
              onChange={(e) => setNewServiceForm({ ...newServiceForm, description: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="new_srv_is_active"
              checked={newServiceForm.is_active}
              onChange={(e) => setNewServiceForm({ ...newServiceForm, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-[#1B5040] focus:ring-[#1B5040]"
            />
            <label htmlFor="new_srv_is_active" className="text-xs font-semibold text-slate-700">
              Layanan Aktif (Tampil pada portal pengajuan publik)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateServiceModalOpen(false)}
              disabled={createServiceMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={createServiceMutation.isPending}
            >
              {createServiceMutation.isPending ? 'Menyimpan...' : 'Simpan Layanan'}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmationDialog
        isOpen={Boolean(deletingRequirement)}
        onClose={() => setDeletingRequirement(null)}
        onConfirm={handleConfirmDeleteRequirement}
        title="Hapus Persyaratan Layanan?"
        description={
          <span>
            Apakah Anda yakin ingin menghapus persyaratan{' '}
            <strong>"{deletingRequirement?.requirement.name}"</strong>? Pemohon tidak akan
            diminta melampirkan berkas ini lagi.
          </span>
        }
        confirmLabel="Ya, Hapus Persyaratan"
        variant="danger"
        isLoading={deleteRequirementMutation.isPending}
      />
    </div>
  );
}
