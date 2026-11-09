import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  ConfirmationDialog,
  Dialog,
  Drawer,
  Dropdown,
  DropdownDivider,
  DropdownItem,
  DiskominfoLogo,
  EmptyState,
  ErrorState,
  Heading,
  Input,
  Kbd,
  LogoHierarchy,
  Pagination,
  PemkabBandungLogo,
  RadioGroup,
  Select,
  SimantikLogo,
  SkeletonCard,
  StageBadge,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
  Textarea,
  ToastProvider,
  Tooltip,
  useToast,
  ArrowRightIcon,
  CheckIcon,
  FileTextIcon,
  FilterIcon,
  LogOutIcon,
  SearchIcon,
  ShieldIcon,
  UserIcon,
} from '../components/ui';

function ShowcaseContent() {
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(2);
  const [checkboxChecked, setCheckboxChecked] = useState(true);
  const [radioValue, setRadioValue] = useState('pengembangan');

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
          <LogoHierarchy layout="horizontal" />
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <Heading level={2}>SIMANTIK Design System Showcase</Heading>
              <Text variant="muted" className="mt-1">
                Visual & Interaction Foundation — Pemerintah Daerah Kabupaten Bandung
              </Text>
            </div>
            <Badge variant="primary" size="md" hasDot>
              Standar Desain UI
            </Badge>
          </div>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <Heading level={3}>1. Hierarki Tiga Logo Resmi</Heading>
          <Text variant="small">
            Mematuhi hierarki kelembagaan: Pemkab Bandung (Induk) → Diskominfo (Instansi Pengampu) → SIMANTIK (Sistem Layanan TI).
          </Text>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-3">
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 flex flex-col justify-center">
              <span className="text-xs font-semibold text-slate-500 mb-3">Layout Horizontal (Header Portal):</span>
              <LogoHierarchy layout="horizontal" />
            </div>

            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 flex flex-col justify-center">
              <span className="text-xs font-semibold text-slate-500 mb-3">Layout Compact (Sidebar/Header Mobile):</span>
              <LogoHierarchy layout="compact" />
            </div>

            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 flex flex-col justify-center">
              <span className="text-xs font-semibold text-slate-500 mb-3">Layout Vertikal (Cover Dokumen / Splash):</span>
              <LogoHierarchy layout="vertical" />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Aset Resmi Brand & Identitas Individual:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
              <div className="p-4 rounded-lg border border-slate-200 bg-white flex flex-col items-center text-center gap-2">
                <PemkabBandungLogo size={52} />
                <span className="text-xs font-bold text-slate-900 mt-1">Pemerintah Daerah</span>
                <span className="text-[11px] text-slate-500">kabupaten-bandung.png</span>
              </div>
              <div className="p-4 rounded-lg border border-slate-200 bg-white flex flex-col items-center text-center gap-2">
                <DiskominfoLogo size={52} />
                <span className="text-xs font-bold text-slate-900 mt-1">Diskominfo</span>
                <span className="text-[11px] text-slate-500">diskominfo.png</span>
              </div>
              <div className="p-4 rounded-lg border border-slate-200 bg-white flex flex-col items-center text-center gap-2">
                <SimantikLogo size={52} variant="emblem" />
                <span className="text-xs font-bold text-slate-900 mt-1">Emblem SIMANTIK</span>
                <span className="text-[11px] text-slate-500">simantik-emblem.png</span>
              </div>
              <div className="p-4 rounded-lg border border-slate-200 bg-white flex flex-col items-center text-center gap-2">
                <SimantikLogo size={68} variant="full" />
                <span className="text-xs font-bold text-slate-900 mt-1">Logo Lengkap SIMANTIK</span>
                <span className="text-[11px] text-slate-500">simantik-logo.png (Vertikal)</span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <Heading level={3}>2. Tipografi & Skala Teks</Heading>
          <div className="space-y-3 pt-2">
            <div>
              <Heading level={1}>Heading 1 — 36px / 32px Extrabold</Heading>
              <Text variant="muted">Digunakan untuk judul halaman utama portal publik / landing</Text>
            </div>
            <div>
              <Heading level={2}>Heading 2 — 30px / 24px Bold</Heading>
              <Text variant="muted">Digunakan untuk judul modul atau kartu utama</Text>
            </div>
            <div>
              <Heading level={3}>Heading 3 — 24px / 20px Bold</Heading>
              <Text variant="muted">Digunakan untuk sub-seksi formulir dan tabel data</Text>
            </div>
            <div className="pt-2">
              <Text variant="lead">Text Lead: Ringkasan naratif pengantar layanan.</Text>
              <Text variant="body" className="mt-1">
                Text Body: Paragraf konten standar dengan kontras rasio minimal 4.5:1 untuk keterbacaan optimal.
              </Text>
              <Text variant="small" className="mt-1">
                Text Small: Keterangan tambahan atau catatan penunjang.
              </Text>
              <div className="mt-2 flex items-center gap-2">
                <Text variant="muted">Shortcut keyboard:</Text>
                <Kbd>Ctrl</Kbd> + <Kbd>K</Kbd>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <Heading level={3}>3. Tombol & Status Aksi</Heading>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button variant="primary" leftIcon={<CheckIcon size={16} />}>
              Primary (Navy)
            </Button>
            <Button variant="secondary" leftIcon={<ShieldIcon size={16} />}>
              Secondary (ASN Blue)
            </Button>
            <Button variant="outline" leftIcon={<FilterIcon size={16} />}>
              Outline Border
            </Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="danger">Danger Action</Button>
            <Button variant="link" rightIcon={<ArrowRightIcon size={14} />}>
              Tautan Layanan
            </Button>
            <Button variant="primary" isLoading>
              Loading State
            </Button>
            <Button variant="primary" disabled>
              Disabled State
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <Heading level={3}>4. Kontrol Formulir Terstandar</Heading>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <Input
              label="Nama Lengkap Pemohon"
              placeholder="Contoh: Raden Ahmad"
              isRequired
              helperText="Sesuai kartu identitas atau data kepegawaian resmi"
            />

            <Input
              label="Email Kedinasan"
              type="email"
              placeholder="nama@bandungkab.go.id"
              isRequired
              leftAddon={<UserIcon size={16} />}
              helperText="Digunakan untuk menerima notifikasi status pengajuan"
            />

            <Input
              label="Nomor Tiket (Contoh Validasi Error)"
              placeholder="SIM-2026-000001"
              errorMessage="Format nomor tiket tidak valid. Pastikan diawali dengan SIM-"
            />

            <Select
              label="Organisasi Perangkat Daerah (OPD)"
              isRequired
              placeholder="Pilih OPD Pemohon"
              options={[
                { value: 'diskominfo', label: 'Dinas Komunikasi dan Informatika' },
                { value: 'bapenda', label: 'Badan Pendapatan Daerah' },
                { value: 'disdukcapil', label: 'Dinas Kependudukan dan Pencatatan Sipil' },
              ]}
              helperText="Unit kerja yang mengajukan permohonan"
            />

            <div className="md:col-span-2">
              <Textarea
                label="Latar Belakang & Permasalahan"
                isRequired
                placeholder="Jelaskan kebutuhan pembangunan atau perubahan sistem aplikasi..."
                showCount
                maxLength={500}
                defaultValue="Kebutuhan digitalisasi pelaporan layanan antar bidang di internal perangkat daerah."
                helperText="Maksimal 500 karakter"
              />
            </div>

            <div>
              <RadioGroup
                label="Jenis Permohonan Layanan"
                name="service_type"
                value={radioValue}
                onChange={setRadioValue}
                options={[
                  {
                    value: 'pembangunan',
                    label: 'Pembangunan Aplikasi Baru',
                    description: 'Pembuatan aplikasi dari tahap analisis kebutuhan awal.',
                  },
                  {
                    value: 'pengembangan',
                    label: 'Pengembangan / Peningkatan Aplikasi',
                    description: 'Penambahan modul atau perubahan proses bisnis aplikasi yang sudah ada.',
                  },
                ]}
              />
            </div>

            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 block">
                Persetujuan Ketentuan
              </span>
              <Checkbox
                checked={checkboxChecked}
                onChange={(e) => setCheckboxChecked(e.target.checked)}
                label="Saya menyetujui Ketentuan Layanan SIMANTIK"
                description="Data yang diajukan adalah benar dan mewakili perangkat daerah resmi."
              />
              <Checkbox
                label="Opsi Pengingat Email"
                description="Kirim salinan kode pelacakan tiket ke email pemohon."
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <Heading level={3}>5. Status Operasional & Tahapan Lifecycle</Heading>
          <Text variant="small">
            Sesuai prinsip SIMANTIK: Status operasional tiket dan Tahapan Lifecycle adalah dua konsep terpisah.
          </Text>

          <div className="space-y-3 pt-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Status Operasional Tiket:
            </span>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="SUBMITTED" />
              <StatusBadge status="VERIFICATION" />
              <StatusBadge status="REVISION_REQUIRED" />
              <StatusBadge status="APPROVED" />
              <StatusBadge status="IN_PROGRESS" />
              <StatusBadge status="COMPLETED" />
              <StatusBadge status="CLOSED" />
              <StatusBadge status="REJECTED" />
              <StatusBadge status="CANCELLED" />
            </div>

            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block pt-2">
              Tahapan Lifecycle (Permenkomdigi No. 6 Tahun 2025):
            </span>
            <div className="flex flex-wrap gap-2">
              <StageBadge stage="ANALYSIS" />
              <StageBadge stage="PLANNING" />
              <StageBadge stage="DESIGN" />
              <StageBadge stage="IMPLEMENTATION" />
              <StageBadge stage="TESTING" />
              <StageBadge stage="MAINTENANCE" />
              <StageBadge stage="EVALUATION" />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <Heading level={3}>6. Alert & Pemberitahuan</Heading>
          <div className="space-y-3 pt-2">
            <Alert variant="info" title="Informasi Layanan">
              Permohonan pengembangan sistem aplikasi wajib melampirkan surat permohonan resmi kepala OPD.
            </Alert>
            <Alert variant="success" title="Verifikasi Berhasil" isDismissable>
              Dokumen persyaratan permohonan telah lengkap dan memenuhi standar administrasi.
            </Alert>
            <Alert variant="warning" title="Perlu Revisi Dokumen" isDismissable>
              Mohon unggah ulang dokumen proses bisnis yang telah disahkan oleh unit pengampu data.
            </Alert>
            <Alert variant="danger" title="Akses Ditolak" isDismissable>
              Anda tidak memiliki kewenangan teknis untuk mengubah status pengujian ini.
            </Alert>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <Heading level={3}>7. Modal, Drawer, Dropdown & Toast</Heading>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              Buka Modal Dialog
            </Button>

            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              Buka Konfirmasi Aksi
            </Button>

            <Button variant="outline" onClick={() => setDrawerOpen(true)}>
              Buka Drawer Samping
            </Button>

            <Dropdown
              trigger={
                <Button variant="outline" rightIcon={<FilterIcon size={14} />}>
                  Aksi Menu Dropdown
                </Button>
              }
            >
              <DropdownItem icon={<FileTextIcon size={16} />}>
                Lihat Detail Tiket
              </DropdownItem>
              <DropdownItem icon={<UserIcon size={16} />}>
                Ubah Penugasan Tenaga Ahli
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem icon={<LogOutIcon size={16} />} destructive>
                Batalkan Permohonan
              </DropdownItem>
            </Dropdown>

            <Tooltip content="Tooltip bantuan operasional dengan standar kontras WCAG AA">
              <Button variant="ghost">Arahkan Kursor ke Saya (Tooltip)</Button>
            </Tooltip>

            <Button
              variant="secondary"
              onClick={() =>
                toast({
                  type: 'success',
                  title: 'Berhasil Disimpan',
                  message: 'Perubahan data spesifikasi telah tersimpan ke sistem.',
                })
              }
            >
              Trigger Toast Notifikasi
            </Button>
          </div>

          <Dialog
            isOpen={dialogOpen}
            onClose={() => setDialogOpen(false)}
            title="Formulir Penugasan Tenaga Ahli"
            description="Tentukan tenaga ahli utama penanggung jawab pengerjaan permohonan ini."
            footer={
              <>
                <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                  Tutup
                </Button>
                <Button variant="primary" size="sm" onClick={() => setDialogOpen(false)}>
                  Simpan Penugasan
                </Button>
              </>
            }
          >
            <div className="space-y-4 py-2">
              <Select
                label="Pilih Tenaga Ahli"
                placeholder="Pilih nama personel tenaga ahli"
                options={[
                  { value: '1', label: 'Budi Santoso — Pranata Komputer Ahli' },
                  { value: '2', label: 'Siti Rahma — Pengembang Web' },
                ]}
              />
              <Textarea
                label="Catatan Arahan Teknis"
                placeholder="Masukkan catatan ruang lingkup khusus..."
              />
            </div>
          </Dialog>

          <ConfirmationDialog
            isOpen={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={() => {
              setConfirmOpen(false);
              toast({
                type: 'danger',
                title: 'Permohonan Dibatalkan',
                message: 'Status permohonan telah diperbarui menjadi Dibatalkan.',
              });
            }}
            title="Batalkan Permohonan Layanan?"
            description="Tindakan ini akan menghentikan seluruh proses verifikasi dan pengerjaan tiket ini. Riwayat pembatalan akan tercatat dalam audit trail."
            variant="danger"
            confirmLabel="Ya, Batalkan Tiket"
          />

          <Drawer
            isOpen={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            title="Audit Trail Perubahan Tiket"
            description="Catatan kronologis mutasi status dan aktivitas sistem"
          >
            <div className="space-y-4 py-2">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-800">Status Changed</span>
                  <span>10 Menit lalu</span>
                </div>
                <p className="text-xs text-slate-700 mt-1">
                  Status diubah dari SUBMITTED menjadi VERIFICATION oleh Petugas Admin.
                </p>
              </div>
            </div>
          </Drawer>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <Heading level={3}>8. Komponen Tab Navigasi</Heading>

          <Tabs defaultValue="dokumen" variant="underline">
            <TabList>
              <Tab value="dokumen" badge={<Badge size="sm">3</Badge>}>
                Dokumen Persyaratan
              </Tab>
              <Tab value="pengujian">Catatan Pengujian</Tab>
              <Tab value="riwayat">Riwayat Status</Tab>
            </TabList>

            <TabPanel value="dokumen">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm">
                Tab Dokumen: Daftar berkas TOR, KAK, dan surat pengantar dari pemohon.
              </div>
            </TabPanel>

            <TabPanel value="pengujian">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm">
                Tab Pengujian: Catatan uji fungsi, uji integrasi, dan uji keamanan aplikasi.
              </div>
            </TabPanel>

            <TabPanel value="riwayat">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm">
                Tab Riwayat: Log kronologis perubahan alur kerja.
              </div>
            </TabPanel>
          </Tabs>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <Heading level={3}>9. Tabel Primitif & Paginasi</Heading>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Cari permohonan..."
                className="w-48 h-8 text-xs"
                leftAddon={<SearchIcon size={14} />}
              />
            </div>
          </div>

          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor Tiket</TableHead>
                  <TableHead>Judul Permohonan</TableHead>
                  <TableHead>OPD Pengaju</TableHead>
                  <TableHead>Status Operasional</TableHead>
                  <TableHead>Tahap Lifecycle</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                <TableRow>
                  <TableCell className="font-semibold text-slate-900">
                    SIM-2026-000001
                  </TableCell>
                  <TableCell>Aplikasi Manajemen Aset Desa Terpadu</TableCell>
                  <TableCell>Dinas Pemberdayaan Masyarakat Desa</TableCell>
                  <TableCell>
                    <StatusBadge status="IN_PROGRESS" size="sm" />
                  </TableCell>
                  <TableCell>
                    <StageBadge stage="IMPLEMENTATION" size="sm" />
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      Detail
                    </Button>
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="font-semibold text-slate-900">
                    SIM-2026-000002
                  </TableCell>
                  <TableCell>Modul Integrasi Antrean Puskesmas Online</TableCell>
                  <TableCell>Dinas Kesehatan</TableCell>
                  <TableCell>
                    <StatusBadge status="VERIFICATION" size="sm" />
                  </TableCell>
                  <TableCell>
                    <StageBadge stage="ANALYSIS" size="sm" />
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      Detail
                    </Button>
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="font-semibold text-slate-900">
                    SIM-2026-000003
                  </TableCell>
                  <TableCell>Sistem Informasi Pajak Daerah Terintegrasi</TableCell>
                  <TableCell>Badan Pendapatan Daerah</TableCell>
                  <TableCell>
                    <StatusBadge status="COMPLETED" size="sm" />
                  </TableCell>
                  <TableCell>
                    <StageBadge stage="EVALUATION" size="sm" />
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      Detail
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Pagination
            currentPage={currentPage}
            totalPages={8}
            onPageChange={setCurrentPage}
            totalItems={78}
            pageSize={10}
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <Heading level={3}>10. Loading Skeleton, Empty State & Error State</Heading>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Loading Skeleton Pulse:
              </span>
              <SkeletonCard />
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Empty State:
              </span>
              <EmptyState
                title="Belum Ada Permohonan"
                description="Tidak ada permohonan pada filter ini."
                action={
                  <Button variant="primary" size="sm">
                    Buat Permohonan
                  </Button>
                }
              />
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Error State:
              </span>
              <ErrorState
                title="Gagal Menghubungkan Layanan"
                description="Koneksi database atau session timeout."
                onRetry={() => {
                  toast({
                    type: 'info',
                    title: 'Memuat Ulang',
                    message: 'Mencoba menghubungkan kembali ke API backend...',
                  });
                }}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export function DesignSystemShowcasePage() {
  return (
    <ToastProvider>
      <ShowcaseContent />
    </ToastProvider>
  );
}
