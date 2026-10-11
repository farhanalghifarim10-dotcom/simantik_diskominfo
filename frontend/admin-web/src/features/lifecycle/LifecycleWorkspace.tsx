import { useState } from 'react';
import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  FileTextIcon,
  Input,
  Select,
  Skeleton,
  Textarea,
  useToast,
} from '../../components/ui';
import { LayersIcon } from '../../components/layout/NavIcons';
import {
  fetchEvaluationAttachmentUrl,
  fetchMaintenanceAttachmentUrl,
  fetchTechnicalDocDownloadUrl,
  fetchTestAttachmentUrl,
  useCreateEvaluation,
  useCreateMaintenance,
  useCreateTest,
  useDeleteEvaluation,
  useDeleteMaintenance,
  useDeleteTechnicalDoc,
  useDeleteTest,
  useLifecycleAnalysis,
  useLifecycleDesign,
  useLifecycleEvaluations,
  useLifecycleImplementation,
  useLifecycleMaintenance,
  useLifecycleOverview,
  useLifecyclePlanning,
  useLifecycleTechnicalDocs,
  useLifecycleTests,
  useUpdateEvaluation,
  useUpdateMaintenance,
  useUpdateTest,
  useUploadTechnicalDoc,
  useUpsertAnalysis,
  useUpsertDesign,
  useUpsertImplementation,
  useUpsertPlanning,
  type EvaluationRecordItem,
  type MaintenanceRecordItem,
  type MaintenanceType,
  type TechnicalDocumentType,
  type TestRecordItem,
  type TestResult,
  type TestType,
} from './useLifecycle';
import { formatDate, formatDateTime, getStageBadge } from '../applications/workflowHelpers';

interface LifecycleWorkspaceProps {
  applicationId: string;
  isSuperAdmin: boolean;
  onOpenStageModal?: () => void;
}

type ActiveSection =
  | 'ANALYSIS'
  | 'PLANNING'
  | 'DESIGN'
  | 'IMPLEMENTATION'
  | 'TESTING'
  | 'MAINTENANCE'
  | 'EVALUATION'
  | 'DOCUMENTS';

export function LifecycleWorkspace({
  applicationId,
  isSuperAdmin,
  onOpenStageModal,
}: LifecycleWorkspaceProps) {
  const [activeSection, setActiveSection] = useState<ActiveSection>('ANALYSIS');

  // Overview query
  const {
    data: overview,
    isLoading: overviewLoading,
    isError: overviewError,
  } = useLifecycleOverview(applicationId);

  // Editable flag: super admin or assigned technician
  const canEdit = isSuperAdmin || overview?.user_can_edit === true;

  return (
    <div className="space-y-6">
      {/* 1. REGULATORY & LIFECYCLE CONCEPT BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/60 border border-indigo-700/50 px-2 py-0.5 rounded">
                Permenkomdigi No. 6 Tahun 2025
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-300">
                Dokumentasi & Siklus Hidup Pembangunan Aplikasi SPBE
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <LayersIcon size={20} className="text-indigo-400" />
              Siklus Hidup (Lifecycle) & Dokumentasi Teknis
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              <strong>Prinsip SIMANTIK:</strong> <em>Status</em> adalah kondisi operasional permohonan, sedangkan <em>Stage</em> adalah posisi pekerjaan teknis dalam siklus hidup. Dokumentasi dapat dilengkapi sesuai kebutuhan riil tanpa memaksakan birokrasi berlebih.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-2 bg-white/5 p-4 rounded-xl border border-white/10 shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Posisi Tahapan Terkini
            </span>
            <div>
              {overview?.current_stage ? (
                getStageBadge(overview.current_stage)
              ) : (
                <Badge variant="neutral">Belum Masuk Siklus</Badge>
              )}
            </div>
            {onOpenStageModal && canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenStageModal}
                className="mt-1 bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs"
              >
                Ubah Tahapan
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. STAGE NAVIGATION BAR */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-1.5 flex overflow-x-auto gap-1">
        {[
          { key: 'ANALYSIS', label: '1. Analisis', badge: overview?.stages_status?.ANALYSIS?.has_record },
          { key: 'PLANNING', label: '2. Perencanaan', badge: overview?.stages_status?.PLANNING?.has_record },
          { key: 'DESIGN', label: '3. Perancangan', badge: overview?.stages_status?.DESIGN?.has_record },
          { key: 'IMPLEMENTATION', label: '4. Implementasi', badge: overview?.stages_status?.IMPLEMENTATION?.has_record },
          { key: 'TESTING', label: '5. Pengujian', count: overview?.stages_status?.TESTING?.count },
          { key: 'MAINTENANCE', label: '6. Pemeliharaan', count: overview?.stages_status?.MAINTENANCE?.count },
          { key: 'EVALUATION', label: '7. Evaluasi', count: overview?.stages_status?.EVALUATION?.count },
          { key: 'DOCUMENTS', label: 'Dokumen Teknis', count: overview?.technical_documents_count },
        ].map((tab) => {
          const isActive = activeSection === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveSection(tab.key as ActiveSection)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-emerald-500'}`} />
              )}
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {overviewLoading && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 space-y-4">
          <Skeleton className="h-6 w-1/4 rounded" />
          <Skeleton className="h-20 w-full rounded" />
          <Skeleton className="h-20 w-full rounded" />
        </div>
      )}

      {overviewError && (
        <ErrorState
          title="Gagal Memuat Data Lifecycle"
          description="Terjadi kendala saat memuat informasi artefak siklus hidup aplikasi."
        />
      )}

      {!overviewLoading && !overviewError && (
        <>
          {activeSection === 'ANALYSIS' && (
            <AnalysisSection applicationId={applicationId} canEdit={canEdit} />
          )}
          {activeSection === 'PLANNING' && (
            <PlanningSection applicationId={applicationId} canEdit={canEdit} />
          )}
          {activeSection === 'DESIGN' && (
            <DesignSection applicationId={applicationId} canEdit={canEdit} />
          )}
          {activeSection === 'IMPLEMENTATION' && (
            <ImplementationSection applicationId={applicationId} canEdit={canEdit} />
          )}
          {activeSection === 'TESTING' && (
            <TestingSection applicationId={applicationId} canEdit={canEdit} />
          )}
          {activeSection === 'MAINTENANCE' && (
            <MaintenanceSection applicationId={applicationId} canEdit={canEdit} />
          )}
          {activeSection === 'EVALUATION' && (
            <EvaluationSection applicationId={applicationId} canEdit={canEdit} />
          )}
          {activeSection === 'DOCUMENTS' && (
            <TechnicalDocumentsSection applicationId={applicationId} canEdit={canEdit} />
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// 1. ANALYSIS SECTION
// ============================================================
function AnalysisSection({
  applicationId,
  canEdit,
}: {
  applicationId: string;
  canEdit: boolean;
}) {
  const { toast } = useToast();
  const { data, isLoading } = useLifecycleAnalysis(applicationId);
  const upsertMutation = useUpsertAnalysis(applicationId);

  const [form, setForm] = useState({
    problems: '',
    needs: '',
    stakeholders: '',
    objectives: '',
    scope: '',
    risks: '',
    target_users: '',
    target_timeline: '',
    target_location: '',
    supporting_analysis: '',
  });

  const [initialized, setInitialized] = useState(false);
  if (data && !initialized) {
    setForm({
      problems: data.problems || '',
      needs: data.needs || '',
      stakeholders: data.stakeholders || '',
      objectives: data.objectives || '',
      scope: data.scope || '',
      risks: data.risks || '',
      target_users: data.target_users || '',
      target_timeline: data.target_timeline || '',
      target_location: data.target_location || '',
      supporting_analysis: data.supporting_analysis || '',
    });
    setInitialized(true);
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upsertMutation.mutateAsync(form);
      toast({
        title: 'Berhasil Disimpan',
        message: 'Dokumentasi tahap Analisis berhasil diperbarui.',
        type: 'success',
      });
    } catch (err: any) {
      toast({
        title: 'Gagal Menyimpan',
        message: err?.message || 'Terjadi gangguan saat menyimpan data analisis.',
        type: 'danger',
      });
    }
  };

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <form onSubmit={handleSave} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Tahap 1: Analisis Kebutuhan (Analysis)
          </h3>
          <p className="text-xs text-slate-500">
            Dokumentasi identifikasi masalah, kebutuhan operasional OPD, pemangku kepentingan, risiko, dan sasaran implementasi.
          </p>
        </div>
        {data?.updated_at && (
          <span className="text-[11px] text-slate-400">
            Terakhir diubah: {formatDateTime(data.updated_at)} {data.created_by_name ? `oleh ${data.created_by_name}` : ''}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs sm:text-sm">
        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Uraian Permasalahan yang Dihadapi (Problems)
          </label>
          <Textarea
            rows={3}
            placeholder="Kendala proses bisnis manual atau sistem lama..."
            value={form.problems}
            onChange={(e) => setForm({ ...form, problems: e.target.value })}
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Kebutuhan Solusi & Fungsional (Needs)
          </label>
          <Textarea
            rows={3}
            placeholder="Fitur atau kapabilitas sistem yang dibutuhkan..."
            value={form.needs}
            onChange={(e) => setForm({ ...form, needs: e.target.value })}
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Tujuan Pembangunan/Pengembangan (Objectives)
          </label>
          <Textarea
            rows={3}
            placeholder="Tujuan strategis SPBE yang ingin dicapai..."
            value={form.objectives}
            onChange={(e) => setForm({ ...form, objectives: e.target.value })}
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Pihak / Pemangku Kepentingan Terkait (Stakeholders)
          </label>
          <Textarea
            rows={3}
            placeholder="Diskominfo, OPD pengusul, Bagian Organisasi, BPKAD, dsb..."
            value={form.stakeholders}
            onChange={(e) => setForm({ ...form, stakeholders: e.target.value })}
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Ruang Lingkup Sistem (Scope)
          </label>
          <Textarea
            rows={3}
            placeholder="Batasan modul yang dibangun..."
            value={form.scope}
            onChange={(e) => setForm({ ...form, scope: e.target.value })}
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Identifikasi Risiko & Mitigasi (Risks)
          </label>
          <Textarea
            rows={3}
            placeholder="Risiko teknis, sumber daya, atau proses bisnis..."
            value={form.risks}
            onChange={(e) => setForm({ ...form, risks: e.target.value })}
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Sasaran Pengguna Sistem (Target Users)
          </label>
          <Input
            placeholder="Contoh: Admin OPD, Pegawai ASN, Publik..."
            value={form.target_users}
            onChange={(e) => setForm({ ...form, target_users: e.target.value })}
            disabled={!canEdit}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Target Waktu (Timeline)
            </label>
            <Input
              placeholder="Contoh: 3 Bulan / Q4 2026..."
              value={form.target_timeline}
              onChange={(e) => setForm({ ...form, target_timeline: e.target.value })}
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Lokasi Implementasi
            </label>
            <Input
              placeholder="Contoh: Datacenter Pemkab Soreang..."
              value={form.target_location}
              onChange={(e) => setForm({ ...form, target_location: e.target.value })}
              disabled={!canEdit}
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="font-bold text-slate-700 block mb-1">
            Analisis Pendukung Lainnya (Supporting Analysis)
          </label>
          <Textarea
            rows={2}
            placeholder="Kesesuaian dengan peta jalan Arsitektur SPBE Pemda atau integrasi SPLP..."
            value={form.supporting_analysis}
            onChange={(e) => setForm({ ...form, supporting_analysis: e.target.value })}
            disabled={!canEdit}
          />
        </div>
      </div>

      {canEdit && (
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <Button type="submit" variant="primary" size="md" disabled={upsertMutation.isPending}>
            {upsertMutation.isPending ? 'Menyimpan...' : 'Simpan Dokumentasi Analisis'}
          </Button>
        </div>
      )}
    </form>
  );
}

// ============================================================
// 2. PLANNING SECTION (Project Plan)
// ============================================================
function PlanningSection({
  applicationId,
  canEdit,
}: {
  applicationId: string;
  canEdit: boolean;
}) {
  const { toast } = useToast();
  const { data, isLoading } = useLifecyclePlanning(applicationId);
  const upsertMutation = useUpsertPlanning(applicationId);

  const [form, setForm] = useState({
    scope: '',
    business_process: '',
    technical_approach: '',
    executor: '',
    roles_and_responsibilities: '',
    planned_start_date: '',
    planned_end_date: '',
    security_plan: '',
    resource_plan: '',
    success_indicators: '',
    knowledge_transfer_plan: '',
    monitoring_plan: '',
    reporting_plan: '',
  });

  const [initialized, setInitialized] = useState(false);
  if (data && !initialized) {
    setForm({
      scope: data.scope || '',
      business_process: data.business_process || '',
      technical_approach: data.technical_approach || '',
      executor: data.executor || '',
      roles_and_responsibilities: data.roles_and_responsibilities || '',
      planned_start_date: data.planned_start_date || '',
      planned_end_date: data.planned_end_date || '',
      security_plan: data.security_plan || '',
      resource_plan: data.resource_plan || '',
      success_indicators: data.success_indicators || '',
      knowledge_transfer_plan: data.knowledge_transfer_plan || '',
      monitoring_plan: data.monitoring_plan || '',
      reporting_plan: data.reporting_plan || '',
    });
    setInitialized(true);
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upsertMutation.mutateAsync(form);
      toast({
        title: 'Berhasil Disimpan',
        message: 'Rencana kerja teknis (Project Plan) berhasil disimpan.',
        type: 'success',
      });
    } catch (err: any) {
      toast({
        title: 'Gagal Menyimpan',
        message: err?.message || 'Terjadi gangguan saat menyimpan data perencanaan.',
        type: 'danger',
      });
    }
  };

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <form onSubmit={handleSave} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Tahap 2: Perencanaan Teknis & Proyek (Planning)
          </h3>
          <p className="text-xs text-slate-500">
            Detail perencanaan jadwal, pelaksana, peran, alokasi sumber daya, rencana keamanan, alih pengetahuan, dan pemantauan.
          </p>
        </div>
        {data?.updated_at && (
          <span className="text-[11px] text-slate-400">
            Terakhir diubah: {formatDateTime(data.updated_at)} {data.created_by_name ? `oleh ${data.created_by_name}` : ''}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs sm:text-sm">
        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Ruang Lingkup Pekerjaan (Scope)
          </label>
          <Textarea
            rows={3}
            placeholder="Rincian deliverables dan ruang lingkup modul..."
            value={form.scope}
            onChange={(e) => setForm({ ...form, scope: e.target.value })}
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Alur Proses Bisnis Layanan (Business Process)
          </label>
          <Textarea
            rows={3}
            placeholder="Tahapan proses bisnis dari hulu ke hilir..."
            value={form.business_process}
            onChange={(e) => setForm({ ...form, business_process: e.target.value })}
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Pendekatan Teknis & Arsitektur (Technical Approach)
          </label>
          <Textarea
            rows={3}
            placeholder="Stack teknologi, pattern, atau framework yang dipilih..."
            value={form.technical_approach}
            onChange={(e) => setForm({ ...form, technical_approach: e.target.value })}
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Peran & Tanggung Jawab Tim (Roles & Responsibilities)
          </label>
          <Textarea
            rows={3}
            placeholder="Product Owner, Tech Lead, Frontend, Backend, QA..."
            value={form.roles_and_responsibilities}
            onChange={(e) => setForm({ ...form, roles_and_responsibilities: e.target.value })}
            disabled={!canEdit}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Rencana Tanggal Mulai
            </label>
            <Input
              type="date"
              value={form.planned_start_date}
              onChange={(e) => setForm({ ...form, planned_start_date: e.target.value })}
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Rencana Tanggal Selesai
            </label>
            <Input
              type="date"
              value={form.planned_end_date}
              onChange={(e) => setForm({ ...form, planned_end_date: e.target.value })}
              disabled={!canEdit}
            />
          </div>
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Pelaksana Pekerjaan (Executor)
          </label>
          <Input
            placeholder="Contoh: Internal Tim Pengembang Diskominfo..."
            value={form.executor}
            onChange={(e) => setForm({ ...form, executor: e.target.value })}
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Rencana Keamanan Sistem (Security Plan)
          </label>
          <Textarea
            rows={2}
            placeholder="Enkripsi, autentikasi RBAC, rate-limiting, audit logs..."
            value={form.security_plan}
            onChange={(e) => setForm({ ...form, security_plan: e.target.value })}
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Rencana Sumber Daya (Resource Plan)
          </label>
          <Textarea
            rows={2}
            placeholder="Alokasi CPU, RAM, Storage, Domain/Subdomain Pemda..."
            value={form.resource_plan}
            onChange={(e) => setForm({ ...form, resource_plan: e.target.value })}
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Indikator Keberhasilan (Success Indicators)
          </label>
          <Input
            placeholder="Contoh: Lulus UAT, Response time < 500ms, Uji kerentanan bersih..."
            value={form.success_indicators}
            onChange={(e) => setForm({ ...form, success_indicators: e.target.value })}
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Rencana Alih Pengetahuan (Knowledge Transfer)
          </label>
          <Input
            placeholder="Bimtek admin, penyusunan manual book, serah terima kode..."
            value={form.knowledge_transfer_plan}
            onChange={(e) => setForm({ ...form, knowledge_transfer_plan: e.target.value })}
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Rencana Pemantauan (Monitoring Plan)
          </label>
          <Input
            placeholder="Sprint review mingguan, standup progres..."
            value={form.monitoring_plan}
            onChange={(e) => setForm({ ...form, monitoring_plan: e.target.value })}
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Rencana Pelaporan (Reporting Plan)
          </label>
          <Input
            placeholder="Laporan bulanan berkala ke Pimpinan Diskominfo..."
            value={form.reporting_plan}
            onChange={(e) => setForm({ ...form, reporting_plan: e.target.value })}
            disabled={!canEdit}
          />
        </div>
      </div>

      {canEdit && (
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <Button type="submit" variant="primary" size="md" disabled={upsertMutation.isPending}>
            {upsertMutation.isPending ? 'Menyimpan...' : 'Simpan Rencana Kerja Teknis'}
          </Button>
        </div>
      )}
    </form>
  );
}

// ============================================================
// 3. DESIGN SECTION
// ============================================================
function DesignSection({
  applicationId,
  canEdit,
}: {
  applicationId: string;
  canEdit: boolean;
}) {
  const { toast } = useToast();
  const { data, isLoading } = useLifecycleDesign(applicationId);
  const upsertMutation = useUpsertDesign(applicationId);

  const [form, setForm] = useState({
    architecture_model: '',
    process_flow: '',
    function_mapping: '',
    database_mapping: '',
    role_access_mapping: '',
    ui_navigation: '',
    internal_control: '',
    integration_design: '',
  });

  const [initialized, setInitialized] = useState(false);
  if (data && !initialized) {
    setForm({
      architecture_model: data.architecture_model || '',
      process_flow: data.process_flow || '',
      function_mapping: data.function_mapping || '',
      database_mapping: data.database_mapping || '',
      role_access_mapping: data.role_access_mapping || '',
      ui_navigation: data.ui_navigation || '',
      internal_control: data.internal_control || '',
      integration_design: data.integration_design || '',
    });
    setInitialized(true);
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upsertMutation.mutateAsync(form);
      toast({
        title: 'Berhasil Disimpan',
        message: 'Dokumentasi perancangan sistem (Design) berhasil disimpan.',
        type: 'success',
      });
    } catch (err: any) {
      toast({
        title: 'Gagal Menyimpan',
        message: err?.message || 'Terjadi gangguan saat menyimpan data perancangan.',
        type: 'danger',
      });
    }
  };

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <form onSubmit={handleSave} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Tahap 3: Perancangan Arsitektur & Sistem (Design)
          </h3>
          <p className="text-xs text-slate-500">
            Rancang bangun arsitektur, diagram proses, skema basis data, hak akses, desain antarmuka, dan integrasi API.
          </p>
        </div>
        {data?.updated_at && (
          <span className="text-[11px] text-slate-400">
            Terakhir diubah: {formatDateTime(data.updated_at)} {data.created_by_name ? `oleh ${data.created_by_name}` : ''}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs sm:text-sm">
        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Model Arsitektur Sistem (Architecture Model)
          </label>
          <Textarea
            rows={3}
            placeholder="Modular monolith / microservices, lapisan client-API-database..."
            value={form.architecture_model}
            onChange={(e) => setForm({ ...form, architecture_model: e.target.value })}
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Alur Proses Aplikasi (Process Flow)
          </label>
          <Textarea
            rows={3}
            placeholder="Diagram alir/BPMN logika sistem dari input hingga selesai..."
            value={form.process_flow}
            onChange={(e) => setForm({ ...form, process_flow: e.target.value })}
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Pemetaan Fungsi & Fitur (Function Mapping)
          </label>
          <Textarea
            rows={3}
            placeholder="Daftar fitur per modul dan interaksinya..."
            value={form.function_mapping}
            onChange={(e) => setForm({ ...form, function_mapping: e.target.value })}
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Pemetaan Basis Data (Database Mapping / ERD)
          </label>
          <Textarea
            rows={3}
            placeholder="Entitas utama tabel, relasi foreign key, indeks data..."
            value={form.database_mapping}
            onChange={(e) => setForm({ ...form, database_mapping: e.target.value })}
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Pemetaan Hak Akses & Peran (Role & Access Mapping)
          </label>
          <Textarea
            rows={3}
            placeholder="Matriks otorisasi peran (RBAC) pengguna..."
            value={form.role_access_mapping}
            onChange={(e) => setForm({ ...form, role_access_mapping: e.target.value })}
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Desain Antarmuka & Navigasi UI/UX
          </label>
          <Textarea
            rows={3}
            placeholder="Tautan wireframe/Figma, tata letak menu, navigasi responsif..."
            value={form.ui_navigation}
            onChange={(e) => setForm({ ...form, ui_navigation: e.target.value })}
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Kendali Internal & Jejak Audit (Internal Control)
          </label>
          <Textarea
            rows={2}
            placeholder="Mekanisme validasi input, jejak log mutasi, penanganan error..."
            value={form.internal_control}
            onChange={(e) => setForm({ ...form, internal_control: e.target.value })}
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Desain Integrasi & Interoperabilitas (Integration Design)
          </label>
          <Textarea
            rows={2}
            placeholder="Integrasi SPLP nasional, webhooks, REST API JSON endpoints..."
            value={form.integration_design}
            onChange={(e) => setForm({ ...form, integration_design: e.target.value })}
            disabled={!canEdit}
          />
        </div>
      </div>

      {canEdit && (
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <Button type="submit" variant="primary" size="md" disabled={upsertMutation.isPending}>
            {upsertMutation.isPending ? 'Menyimpan...' : 'Simpan Dokumentasi Perancangan'}
          </Button>
        </div>
      )}
    </form>
  );
}

// ============================================================
// 4. IMPLEMENTATION SECTION
// ============================================================
function ImplementationSection({
  applicationId,
  canEdit,
}: {
  applicationId: string;
  canEdit: boolean;
}) {
  const { toast } = useToast();
  const { data, isLoading } = useLifecycleImplementation(applicationId);
  const upsertMutation = useUpsertImplementation(applicationId);

  const [form, setForm] = useState({
    software_dev_records: '',
    database_implementation: '',
    quality_control: '',
    installation_config: '',
    api_interoperability: '',
    documentation_notes: '',
    knowledge_transfer: '',
    handover_notes: '',
  });

  const [initialized, setInitialized] = useState(false);
  if (data && !initialized) {
    setForm({
      software_dev_records: data.software_dev_records || '',
      database_implementation: data.database_implementation || '',
      quality_control: data.quality_control || '',
      installation_config: data.installation_config || '',
      api_interoperability: data.api_interoperability || '',
      documentation_notes: data.documentation_notes || '',
      knowledge_transfer: data.knowledge_transfer || '',
      handover_notes: data.handover_notes || '',
    });
    setInitialized(true);
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upsertMutation.mutateAsync(form);
      toast({
        title: 'Berhasil Disimpan',
        message: 'Catatan implementasi perangkat lunak berhasil disimpan.',
        type: 'success',
      });
    } catch (err: any) {
      toast({
        title: 'Gagal Menyimpan',
        message: err?.message || 'Terjadi gangguan saat menyimpan data implementasi.',
        type: 'danger',
      });
    }
  };

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <form onSubmit={handleSave} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Tahap 4: Implementasi & Pembangunan (Implementation)
          </h3>
          <p className="text-xs text-slate-500">
            Pencatatan repositori kode, migrasi database, kendali mutu, konfigurasi server, spesifikasi API, dan serah terima teknis.
          </p>
        </div>
        {data?.updated_at && (
          <span className="text-[11px] text-slate-400">
            Terakhir diubah: {formatDateTime(data.updated_at)} {data.created_by_name ? `oleh ${data.created_by_name}` : ''}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs sm:text-sm">
        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Catatan Pengembangan Software (Software Dev Records)
          </label>
          <Textarea
            rows={3}
            placeholder="Tautan repositori Git, commit hash/tag rilis, changelog..."
            value={form.software_dev_records}
            onChange={(e) => setForm({ ...form, software_dev_records: e.target.value })}
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Implementasi Basis Data (Database Implementation)
          </label>
          <Textarea
            rows={3}
            placeholder="File migrasi SQL, seeder data master, indeks performa..."
            value={form.database_implementation}
            onChange={(e) => setForm({ ...form, database_implementation: e.target.value })}
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Kendali Mutu Kode (Quality Control)
          </label>
          <Textarea
            rows={3}
            placeholder="Hasil linter, code review, static analysis, unit test coverage..."
            value={form.quality_control}
            onChange={(e) => setForm({ ...form, quality_control: e.target.value })}
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Konfigurasi Instalasi & Server (Installation & Config)
          </label>
          <Textarea
            rows={3}
            placeholder="Docker compose, environment variables, Nginx reverse proxy..."
            value={form.installation_config}
            onChange={(e) => setForm({ ...form, installation_config: e.target.value })}
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            API & Interoperabilitas (API Specification)
          </label>
          <Textarea
            rows={2}
            placeholder="Spesifikasi OpenAPI/Swagger, endpoint katalog layanan..."
            value={form.api_interoperability}
            onChange={(e) => setForm({ ...form, api_interoperability: e.target.value })}
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Catatan Dokumentasi (Documentation Notes)
          </label>
          <Textarea
            rows={2}
            placeholder="Ketersediaan buku petunjuk teknis dan manual book pengguna..."
            value={form.documentation_notes}
            onChange={(e) => setForm({ ...form, documentation_notes: e.target.value })}
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Pelaksanaan Alih Pengetahuan (Knowledge Transfer)
          </label>
          <Textarea
            rows={2}
            placeholder="Pelatihan operator OPD, pendampingan teknis..."
            value={form.knowledge_transfer}
            onChange={(e) => setForm({ ...form, knowledge_transfer: e.target.value })}
            disabled={!canEdit}
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">
            Catatan Serah Terima / BAST (Handover Notes)
          </label>
          <Textarea
            rows={2}
            placeholder="Nomor Berita Acara Serah Terima bila relevan..."
            value={form.handover_notes}
            onChange={(e) => setForm({ ...form, handover_notes: e.target.value })}
            disabled={!canEdit}
          />
        </div>
      </div>

      {canEdit && (
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <Button type="submit" variant="primary" size="md" disabled={upsertMutation.isPending}>
            {upsertMutation.isPending ? 'Menyimpan...' : 'Simpan Dokumentasi Implementasi'}
          </Button>
        </div>
      )}
    </form>
  );
}

// ============================================================
// 5. TESTING SECTION
// ============================================================
function TestingSection({
  applicationId,
  canEdit,
}: {
  applicationId: string;
  canEdit: boolean;
}) {
  const { toast } = useToast();
  const [filterType, setFilterType] = useState<'ALL' | TestType>('ALL');
  const [filterResult, setFilterResult] = useState<'ALL' | TestResult>('ALL');

  const { data: tests, isLoading, refetch } = useLifecycleTests(applicationId, {
    type: filterType === 'ALL' ? undefined : filterType,
    result: filterResult === 'ALL' ? undefined : filterResult,
  });

  const createMutation = useCreateTest(applicationId);
  const updateMutation = useUpdateTest(applicationId);
  const deleteMutation = useDeleteTest(applicationId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [detailModalTest, setDetailModalTest] = useState<TestRecordItem | null>(null);
  const [downloadingAttachment, setDownloadingAttachment] = useState(false);

  const [form, setForm] = useState(() => ({
    test_type: 'FUNCTION' as TestType,
    test_name: '',
    test_scope: '',
    test_criteria: '',
    test_scenario: '',
    expected_result: '',
    actual_result: '',
    result: 'PASS' as TestResult,
    findings: '',
    corrective_action: '',
    tester: '',
    testing_time: new Date().toISOString().split('T')[0],
    file: null as File | null,
  }));

  const openCreateModal = () => {
    setEditingTestId(null);
    setForm({
      test_type: 'FUNCTION',
      test_name: '',
      test_scope: '',
      test_criteria: '',
      test_scenario: '',
      expected_result: '',
      actual_result: '',
      result: 'PASS',
      findings: '',
      corrective_action: '',
      tester: '',
      testing_time: new Date().toISOString().split('T')[0],
      file: null,
    });
    setModalOpen(true);
  };

  const openEditModal = (t: TestRecordItem) => {
    setEditingTestId(t.id);
    setForm({
      test_type: t.test_type,
      test_name: t.test_name,
      test_scope: t.test_scope || '',
      test_criteria: t.test_criteria || '',
      test_scenario: t.test_scenario || '',
      expected_result: t.expected_result || '',
      actual_result: t.actual_result || '',
      result: t.result || 'PASS',
      findings: t.findings || '',
      corrective_action: t.corrective_action || '',
      tester: t.tester || t.tested_by_name || '',
      testing_time: (t.testing_time || t.tested_at || '').split('T')[0] || '',
      file: null,
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.test_name.trim()) {
      toast({ title: 'Validasi Gagal', message: 'Nama/skenario pengujian wajib diisi.', type: 'warning' });
      return;
    }

    const submitData = async (base64Attachment?: string, attachmentName?: string) => {
      if (editingTestId) {
        await updateMutation.mutateAsync({
          testId: editingTestId,
          dto: {
            test_type: form.test_type,
            test_name: form.test_name.trim(),
            test_scope: form.test_scope || undefined,
            test_criteria: form.test_criteria || undefined,
            test_scenario: form.test_scenario || undefined,
            expected_result: form.expected_result || undefined,
            actual_result: form.actual_result || undefined,
            result: form.result,
            findings: form.findings || undefined,
            corrective_action: form.corrective_action || undefined,
            tester: form.tester || undefined,
            testing_time: form.testing_time || undefined,
            attachment_base64: base64Attachment,
            attachment_filename: attachmentName,
          },
        });
        toast({ title: 'Tersimpan', message: 'Perubahan catatan pengujian berhasil disimpan.', type: 'success' });
      } else {
        await createMutation.mutateAsync({
          test_type: form.test_type,
          test_name: form.test_name.trim(),
          test_scope: form.test_scope || undefined,
          test_criteria: form.test_criteria || undefined,
          test_scenario: form.test_scenario || undefined,
          expected_result: form.expected_result || undefined,
          actual_result: form.actual_result || undefined,
          result: form.result,
          findings: form.findings || undefined,
          corrective_action: form.corrective_action || undefined,
          tester: form.tester || undefined,
          testing_time: form.testing_time || undefined,
          attachment_base64: base64Attachment,
          attachment_filename: attachmentName,
        });
        toast({ title: 'Berhasil Ditambahkan', message: 'Catatan pengujian kelaikan berhasil dicatat.', type: 'success' });
      }
      setModalOpen(false);
      refetch();
    };

    try {
      if (form.file) {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          await submitData(base64Data, form.file?.name);
        };
        reader.readAsDataURL(form.file);
      } else {
        await submitData();
      }
    } catch (err: any) {
      toast({ title: 'Gagal Menyimpan', message: err?.message || 'Gagal menyimpan uji kelaikan.', type: 'danger' });
    }
  };

  const handleDelete = async (testId: string) => {
    if (!confirm('Hapus catatan pengujian ini?')) return;
    try {
      await deleteMutation.mutateAsync(testId);
      toast({ title: 'Terhapus', message: 'Catatan pengujian berhasil dihapus.', type: 'info' });
      if (detailModalTest?.id === testId) {
        setDetailModalTest(null);
      }
      refetch();
    } catch (err: any) {
      toast({ title: 'Gagal Menghapus', message: err?.message, type: 'danger' });
    }
  };

  const handleDownloadAttachment = async (testId: string) => {
    try {
      setDownloadingAttachment(true);
      const res = await fetchTestAttachmentUrl(applicationId, testId);
      window.open(res.signed_url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      toast({ title: 'Gagal Mengunduh', message: err?.message || 'Gagal membuka berkas bukti.', type: 'danger' });
    } finally {
      setDownloadingAttachment(false);
    }
  };

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      {/* DISCLAIMER NOTICE */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-xs flex gap-3 items-start">
        <span className="text-amber-600 font-bold text-sm shrink-0">ℹ️</span>
        <div className="space-y-1">
          <p className="font-bold uppercase tracking-wider text-[11px] text-amber-800">
            Pemberitahuan Tata Kelola & Batasan Regulasi
          </p>
          <p className="text-amber-800 leading-relaxed">
            Ketersediaan formulir dan catatan dokumentasi ini merupakan kapabilitas teknis sistem pencatatan. Kepatuhan hukum dan regulasi SPBE tetap bergantung pada pelaksanaan proses riil, pengujian faktual (fungsional, penetrasi keamanan, beban riil), dan kebijakan resmi organisasi di lingkungan Pemerintah Daerah.
          </p>
        </div>
      </div>

      {/* HEADER & FILTERS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Tahap 5: Uji Kelaikan Aplikasi (Testing)
          </h3>
          <p className="text-xs text-slate-500">
            Pencatatan hasil uji kelaikan sistem SPBE meliputi 4 dimensi: Fungsional (FUNCTION), Integrasi (INTEGRATION), Beban (LOAD), dan Keamanan (SECURITY).
          </p>
        </div>
        {canEdit && (
          <Button variant="primary" size="sm" onClick={openCreateModal}>
            + Tambah Catatan Pengujian
          </Button>
        )}
      </div>

      {/* FILTER CONTROLS */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
        <span className="font-bold text-slate-600">Filter Dimensi:</span>
        <Select
          className="w-40 py-1 text-xs"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          options={[
            { value: 'ALL', label: 'Semua Dimensi' },
            { value: 'FUNCTION', label: 'FUNCTION (Fungsional)' },
            { value: 'INTEGRATION', label: 'INTEGRATION (Integrasi)' },
            { value: 'LOAD', label: 'LOAD (Beban)' },
            { value: 'SECURITY', label: 'SECURITY (Keamanan)' },
          ]}
        />

        <span className="font-bold text-slate-600 ml-2">Hasil:</span>
        <Select
          className="w-36 py-1 text-xs"
          value={filterResult}
          onChange={(e) => setFilterResult(e.target.value as any)}
          options={[
            { value: 'ALL', label: 'Semua Hasil' },
            { value: 'PASS', label: 'PASS (Lulus)' },
            { value: 'PASS_WITH_NOTES', label: 'PASS_WITH_NOTES' },
            { value: 'FAIL', label: 'FAIL (Gagal)' },
          ]}
        />

        {(filterType !== 'ALL' || filterResult !== 'ALL') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterType('ALL');
              setFilterResult('ALL');
            }}
            className="text-slate-500 hover:text-slate-800 text-xs"
          >
            Reset Filter
          </Button>
        )}
      </div>

      {(!tests || tests.length === 0) ? (
        <EmptyState
          title="Belum Ada Hasil Uji Kelaikan"
          description="Catat pengujian fungsional, keamanan, beban, atau integrasi aplikasi untuk melengkapi jejak uji kelaikan."
          action={
            canEdit ? (
              <Button variant="outline" size="sm" onClick={openCreateModal}>
                + Catat Pengujian Pertama
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <th className="p-3">Dimensi Uji</th>
                <th className="p-3">Skenario / Nama Pengujian</th>
                <th className="p-3">Kriteria & Harapan</th>
                <th className="p-3">Hasil Uji</th>
                <th className="p-3">Temuan & Koreksi</th>
                <th className="p-3">Penguji & Tanggal</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tests.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-mono">
                    <Badge variant="neutral" className="text-[10px]">
                      {t.test_type}
                    </Badge>
                  </td>
                  <td className="p-3 font-semibold text-slate-900">
                    <button
                      type="button"
                      onClick={() => setDetailModalTest(t)}
                      className="text-left hover:text-blue-600 transition-colors"
                    >
                      {t.test_name}
                    </button>
                    {t.test_scope && (
                      <span className="block text-[11px] font-normal text-slate-500">
                        Scope: {t.test_scope}
                      </span>
                    )}
                    {t.attachment_filename && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-indigo-600 font-mono mt-0.5">
                        📎 {t.attachment_filename}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-slate-600 max-w-xs">
                    <div>{t.expected_result || '-'}</div>
                    {t.actual_result && (
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Aktual: {t.actual_result}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    {t.result === 'PASS' && <Badge variant="success">PASS</Badge>}
                    {t.result === 'PASS_WITH_NOTES' && (
                      <Badge variant="warning">PASS (Catatan)</Badge>
                    )}
                    {t.result === 'FAIL' && <Badge variant="danger">FAIL</Badge>}
                    {!t.result && <span className="text-slate-400">-</span>}
                  </td>
                  <td className="p-3 text-slate-600 max-w-xs">
                    <div>{t.findings || '-'}</div>
                    {t.corrective_action && (
                      <div className="text-indigo-600 font-medium text-[11px] mt-0.5">
                        Tindakan: {t.corrective_action}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-slate-500 whitespace-nowrap">
                    <div>{t.tester || t.tested_by_name || 'Teknisi'}</div>
                    <div className="text-[11px] text-slate-400">
                      {formatDate(t.testing_time || t.tested_at || t.created_at)}
                    </div>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDetailModalTest(t)}
                    >
                      Detail
                    </Button>
                    {canEdit && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-600 hover:text-slate-900"
                          onClick={() => openEditModal(t)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(t.id)}
                        >
                          Hapus
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DETAIL MODAL PENGUJIAN */}
      <Dialog
        isOpen={Boolean(detailModalTest)}
        onClose={() => setDetailModalTest(null)}
        title="Rincian Catatan Pengujian Kelaikan"
      >
        {detailModalTest && (
          <div className="space-y-4 text-xs sm:text-sm">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider block">
                  Dimensi Pengujian
                </span>
                <Badge variant="neutral" className="mt-1 font-mono">
                  {detailModalTest.test_type}
                </Badge>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider block">
                  Hasil Akhir
                </span>
                <div className="mt-1">
                  {detailModalTest.result === 'PASS' && <Badge variant="success">PASS (Lulus)</Badge>}
                  {detailModalTest.result === 'PASS_WITH_NOTES' && <Badge variant="warning">PASS (Catatan)</Badge>}
                  {detailModalTest.result === 'FAIL' && <Badge variant="danger">FAIL (Gagal)</Badge>}
                  {!detailModalTest.result && <span className="text-slate-400">-</span>}
                </div>
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-700 block mb-0.5">Skenario / Nama Pengujian:</span>
              <p className="text-slate-900 font-semibold">{detailModalTest.test_name}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="font-bold text-slate-700 block mb-0.5">Ruang Lingkup (Scope):</span>
                <p className="text-slate-700">{detailModalTest.test_scope || '-'}</p>
              </div>
              <div>
                <span className="font-bold text-slate-700 block mb-0.5">Kriteria Uji:</span>
                <p className="text-slate-700">{detailModalTest.test_criteria || '-'}</p>
              </div>
            </div>

            {detailModalTest.test_scenario && (
              <div>
                <span className="font-bold text-slate-700 block mb-0.5">Rincian Langkah / Skenario:</span>
                <p className="text-slate-700 whitespace-pre-line bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {detailModalTest.test_scenario}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-700 block mb-0.5">Hasil yang Diharapkan:</span>
                <p className="text-slate-600">{detailModalTest.expected_result || '-'}</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-700 block mb-0.5">Hasil Aktual Diperoleh:</span>
                <p className="text-slate-700 font-medium">{detailModalTest.actual_result || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="font-bold text-slate-700 block mb-0.5">Temuan Masalah (Findings):</span>
                <p className="text-slate-600">{detailModalTest.findings || 'Tidak ada temuan'}</p>
              </div>
              <div>
                <span className="font-bold text-slate-700 block mb-0.5">Tindakan Korektif:</span>
                <p className="text-indigo-700 font-medium">{detailModalTest.corrective_action || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <span className="text-slate-500 block">Petugas Penguji:</span>
                <span className="font-bold text-slate-800">
                  {detailModalTest.tester || detailModalTest.tested_by_name || 'Teknisi'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Waktu Pengujian:</span>
                <span className="text-slate-700">
                  {formatDateTime(detailModalTest.testing_time || detailModalTest.tested_at || detailModalTest.created_at)}
                </span>
              </div>
            </div>

            {detailModalTest.attachment_path && (
              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-indigo-600 text-lg">📄</span>
                  <div>
                    <span className="font-bold text-indigo-950 block text-xs">
                      {detailModalTest.attachment_filename || 'Lampiran Bukti Pengujian'}
                    </span>
                    <span className="text-[10px] text-indigo-600 font-mono">
                      Private storage aman (15 menit token terenkripsi)
                    </span>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={downloadingAttachment}
                  onClick={() => handleDownloadAttachment(detailModalTest.id)}
                >
                  {downloadingAttachment ? 'Membuka...' : 'Unduh Bukti'}
                </Button>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setDetailModalTest(null)}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* MODAL TAMBAH / EDIT PENGUJIAN */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTestId ? 'Edit Catatan Pengujian Kelaikan' : 'Catat Pengujian Kelaikan Sistem'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Dimensi Pengujian (Test Type) *
              </label>
              <Select
                value={form.test_type}
                onChange={(e) => setForm({ ...form, test_type: e.target.value as TestType })}
                options={[
                  { value: 'FUNCTION', label: 'FUNCTION (Fungsional & Fitur)' },
                  { value: 'INTEGRATION', label: 'INTEGRATION (Integrasi & Interoperabilitas)' },
                  { value: 'LOAD', label: 'LOAD (Uji Beban & Performa)' },
                  { value: 'SECURITY', label: 'SECURITY (Uji Keamanan & Pentest)' },
                ]}
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Hasil Pengujian (Result) *
              </label>
              <Select
                value={form.result}
                onChange={(e) => setForm({ ...form, result: e.target.value as TestResult })}
                options={[
                  { value: 'PASS', label: 'PASS (Lulus Sempurna)' },
                  { value: 'PASS_WITH_NOTES', label: 'PASS_WITH_NOTES (Lulus dengan Catatan)' },
                  { value: 'FAIL', label: 'FAIL (Tidak Lulus / Gagal)' },
                ]}
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Nama / Skenario Pengujian *
            </label>
            <Input
              placeholder="Contoh: Uji Penetrasi SQLi OWASP Top 10..."
              value={form.test_name}
              onChange={(e) => setForm({ ...form, test_name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Ruang Lingkup (Scope)
              </label>
              <Input
                placeholder="Modul pemohon, form berkas, gateway..."
                value={form.test_scope}
                onChange={(e) => setForm({ ...form, test_scope: e.target.value })}
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Kriteria Pengujian
              </label>
              <Input
                placeholder="Standar lolos atau ambang batas..."
                value={form.test_criteria}
                onChange={(e) => setForm({ ...form, test_criteria: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Langkah / Skenario Detail
            </label>
            <Textarea
              rows={2}
              placeholder="Langkah pengujian yang dilakukan oleh tester..."
              value={form.test_scenario}
              onChange={(e) => setForm({ ...form, test_scenario: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Hasil yang Diharapkan
              </label>
              <Input
                placeholder="Expected result..."
                value={form.expected_result}
                onChange={(e) => setForm({ ...form, expected_result: e.target.value })}
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Hasil Aktual Diperoleh
              </label>
              <Input
                placeholder="Actual result..."
                value={form.actual_result}
                onChange={(e) => setForm({ ...form, actual_result: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Temuan / Bug (Findings)
              </label>
              <Textarea
                rows={2}
                placeholder="Catatan kelemahan atau anomali jika ada..."
                value={form.findings}
                onChange={(e) => setForm({ ...form, findings: e.target.value })}
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Tindakan Korektif (Corrective Action)
              </label>
              <Textarea
                rows={2}
                placeholder="Solusi atau penyesuaian yang telah dilakukan..."
                value={form.corrective_action}
                onChange={(e) => setForm({ ...form, corrective_action: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Petugas Penguji (Tester)
              </label>
              <Input
                placeholder="Nama personel penguji..."
                value={form.tester}
                onChange={(e) => setForm({ ...form, tester: e.target.value })}
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Waktu / Tanggal Pengujian
              </label>
              <Input
                type="date"
                value={form.testing_time}
                onChange={(e) => setForm({ ...form, testing_time: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Lampirkan Berkas Bukti (Laporan Pentest, UAT Sheet, Log PDF)
            </label>
            <input
              type="file"
              className="text-xs text-slate-600 block w-full file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setForm({ ...form, file: e.target.files[0] });
                }
              }}
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Disimpan di private storage terenkripsi, diakses melalui signed URL audit trail.
            </span>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : 'Simpan Hasil Uji'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

// ============================================================
// 6. MAINTENANCE SECTION
// ============================================================
function MaintenanceSection({
  applicationId,
  canEdit,
}: {
  applicationId: string;
  canEdit: boolean;
}) {
  const { toast } = useToast();
  const [filterType, setFilterType] = useState<'ALL' | MaintenanceType>('ALL');

  const { data: records, isLoading, refetch } = useLifecycleMaintenance(applicationId, {
    type: filterType === 'ALL' ? undefined : filterType,
  });

  const createMutation = useCreateMaintenance(applicationId);
  const updateMutation = useUpdateMaintenance(applicationId);
  const deleteMutation = useDeleteMaintenance(applicationId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [detailRecord, setDetailRecord] = useState<MaintenanceRecordItem | null>(null);
  const [downloadingAttachment, setDownloadingAttachment] = useState(false);

  const [form, setForm] = useState(() => ({
    maintenance_type: 'CORRECTIVE' as MaintenanceType,
    title: '',
    reason: '',
    description: '',
    action_taken: '',
    result: '',
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
    executor: '',
    file: null as File | null,
  }));

  const openCreateModal = () => {
    setEditingRecordId(null);
    setForm({
      maintenance_type: 'CORRECTIVE',
      title: '',
      reason: '',
      description: '',
      action_taken: '',
      result: '',
      start: new Date().toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
      executor: '',
      file: null,
    });
    setModalOpen(true);
  };

  const openEditModal = (m: MaintenanceRecordItem) => {
    setEditingRecordId(m.id);
    setForm({
      maintenance_type: m.maintenance_type,
      title: m.title,
      reason: m.reason || '',
      description: m.description || '',
      action_taken: m.action_taken || m.action || '',
      result: m.result || '',
      start: (m.start || m.started_at || '').split('T')[0] || '',
      end: (m.end || m.completed_at || '').split('T')[0] || '',
      executor: m.executor || m.performed_by_name || '',
      file: null,
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() && !form.reason.trim()) {
      toast({ title: 'Validasi Gagal', message: 'Judul atau alasan pemeliharaan wajib diisi.', type: 'warning' });
      return;
    }

    const submitData = async (base64Attachment?: string, attachmentName?: string) => {
      if (editingRecordId) {
        await updateMutation.mutateAsync({
          recordId: editingRecordId,
          dto: {
            maintenance_type: form.maintenance_type,
            title: form.title.trim(),
            reason: form.reason || undefined,
            description: form.description || undefined,
            action_taken: form.action_taken || undefined,
            result: form.result || undefined,
            start: form.start || undefined,
            end: form.end || undefined,
            executor: form.executor || undefined,
            attachment_base64: base64Attachment,
            attachment_filename: attachmentName,
          },
        });
        toast({ title: 'Tersimpan', message: 'Perubahan riwayat pemeliharaan berhasil disimpan.', type: 'success' });
      } else {
        await createMutation.mutateAsync({
          maintenance_type: form.maintenance_type,
          title: form.title.trim(),
          reason: form.reason || undefined,
          description: form.description || undefined,
          action_taken: form.action_taken || undefined,
          result: form.result || undefined,
          start: form.start || undefined,
          end: form.end || undefined,
          executor: form.executor || undefined,
          attachment_base64: base64Attachment,
          attachment_filename: attachmentName,
        });
        toast({ title: 'Tersimpan', message: 'Riwayat pemeliharaan baru berhasil dicatat.', type: 'success' });
      }
      setModalOpen(false);
      refetch();
    };

    try {
      if (form.file) {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          await submitData(base64Data, form.file?.name);
        };
        reader.readAsDataURL(form.file);
      } else {
        await submitData();
      }
    } catch (err: any) {
      toast({ title: 'Gagal Menyimpan', message: err?.message, type: 'danger' });
    }
  };

  const handleDelete = async (recordId: string) => {
    if (!confirm('Hapus riwayat pemeliharaan ini?')) return;
    try {
      await deleteMutation.mutateAsync(recordId);
      toast({ title: 'Terhapus', message: 'Catatan pemeliharaan telah dihapus.', type: 'info' });
      if (detailRecord?.id === recordId) {
        setDetailRecord(null);
      }
      refetch();
    } catch (err: any) {
      toast({ title: 'Gagal Menghapus', message: err?.message, type: 'danger' });
    }
  };

  const handleDownloadAttachment = async (recordId: string) => {
    try {
      setDownloadingAttachment(true);
      const res = await fetchMaintenanceAttachmentUrl(applicationId, recordId);
      window.open(res.signed_url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      toast({ title: 'Gagal Mengunduh', message: err?.message || 'Gagal membuka berkas bukti.', type: 'danger' });
    } finally {
      setDownloadingAttachment(false);
    }
  };

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      {/* DISCLAIMER NOTICE */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-xs flex gap-3 items-start">
        <span className="text-amber-600 font-bold text-sm shrink-0">ℹ️</span>
        <div className="space-y-1">
          <p className="font-bold uppercase tracking-wider text-[11px] text-amber-800">
            Pemberitahuan Tata Kelola & Batasan Regulasi
          </p>
          <p className="text-amber-800 leading-relaxed">
            Dokumentasi pemeliharaan ini menyediakan sarana perekaman jejak audit sistem. Pemenuhan SLA layanan dan kepatuhan prosedur operasional tetap mengikuti kebijakan tata kelola pemeliharaan TIK dan SOP kedinasan di lingkungan Pemkab Bandung.
          </p>
        </div>
      </div>

      {/* HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Tahap 6: Pemeliharaan Sistem (Maintenance)
          </h3>
          <p className="text-xs text-slate-500">
            Pencatatan tindakan pemeliharaan sistem: Korektif (CORRECTIVE), Adaptif (ADAPTIVE), Perfektif (PERFECTIVE), atau Preventif (PREVENTIVE).
          </p>
        </div>
        {canEdit && (
          <Button variant="primary" size="sm" onClick={openCreateModal}>
            + Tambah Riwayat Pemeliharaan
          </Button>
        )}
      </div>

      {/* FILTER CONTROLS */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
        <span className="font-bold text-slate-600">Filter Tipe Pemeliharaan:</span>
        <Select
          className="w-56 py-1 text-xs"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          options={[
            { value: 'ALL', label: 'Semua Tipe Pemeliharaan' },
            { value: 'CORRECTIVE', label: 'CORRECTIVE (Perbaikan Error)' },
            { value: 'ADAPTIVE', label: 'ADAPTIVE (Penyesuaian Sistem/OS)' },
            { value: 'PERFECTIVE', label: 'PERFECTIVE (Peningkatan Kinerja)' },
            { value: 'PREVENTIVE', label: 'PREVENTIVE (Pencegahan Masalah)' },
          ]}
        />
        {filterType !== 'ALL' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilterType('ALL')}
            className="text-slate-500 hover:text-slate-800 text-xs"
          >
            Reset Filter
          </Button>
        )}
      </div>

      {(!records || records.length === 0) ? (
        <EmptyState
          title="Belum Ada Riwayat Pemeliharaan"
          description="Pencatatan pemeliharaan rutin, perbaikan bug darurat, atau penyesuaian regulasi dilakukan di tahap ini."
          action={
            canEdit ? (
              <Button variant="outline" size="sm" onClick={openCreateModal}>
                + Catat Pemeliharaan
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <th className="p-3">Tipe</th>
                <th className="p-3">Aktivitas Pemeliharaan</th>
                <th className="p-3">Alasan (Reason)</th>
                <th className="p-3">Tindakan (Action) & Hasil</th>
                <th className="p-3">Pelaksana & Periode</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-mono">
                    <Badge variant="neutral" className="text-[10px]">
                      {m.maintenance_type}
                    </Badge>
                  </td>
                  <td className="p-3 font-semibold text-slate-900">
                    <button
                      type="button"
                      onClick={() => setDetailRecord(m)}
                      className="text-left hover:text-blue-600 transition-colors"
                    >
                      {m.title}
                    </button>
                    {m.description && (
                      <p className="text-[11px] font-normal text-slate-500 mt-0.5 line-clamp-2">
                        {m.description}
                      </p>
                    )}
                    {m.attachment_filename && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-indigo-600 font-mono mt-0.5">
                        📎 {m.attachment_filename}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-slate-600 max-w-xs">{m.reason || '-'}</td>
                  <td className="p-3 text-slate-600 max-w-xs">
                    <div>{m.action_taken || m.action || '-'}</div>
                    {m.result && (
                      <div className="text-emerald-700 font-medium text-[11px] mt-0.5">
                        Hasil: {m.result}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-slate-500 whitespace-nowrap">
                    <div>{m.executor || m.performed_by_name || 'Teknisi'}</div>
                    <div className="text-[11px] text-slate-400">
                      {formatDate(m.start || m.started_at || m.created_at)} - {formatDate(m.end || m.completed_at || m.created_at)}
                    </div>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDetailRecord(m)}
                    >
                      Detail
                    </Button>
                    {canEdit && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-600 hover:text-slate-900"
                          onClick={() => openEditModal(m)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(m.id)}
                        >
                          Hapus
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DETAIL MODAL PEMELIHARAAN */}
      <Dialog
        isOpen={Boolean(detailRecord)}
        onClose={() => setDetailRecord(null)}
        title="Rincian Riwayat Pemeliharaan Aplikasi"
      >
        {detailRecord && (
          <div className="space-y-4 text-xs sm:text-sm">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
              <div>
                <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider block">
                  Tipe Pemeliharaan
                </span>
                <Badge variant="neutral" className="mt-1 font-mono">
                  {detailRecord.maintenance_type}
                </Badge>
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider block">
                  Pelaksana (Executor)
                </span>
                <span className="font-bold text-slate-800">
                  {detailRecord.executor || detailRecord.performed_by_name || 'Tim Teknis'}
                </span>
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-700 block mb-0.5">Judul Pemeliharaan:</span>
              <p className="text-slate-900 font-semibold">{detailRecord.title}</p>
            </div>

            {detailRecord.reason && (
              <div>
                <span className="font-bold text-slate-700 block mb-0.5">Alasan / Latar Belakang (Reason):</span>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {detailRecord.reason}
                </p>
              </div>
            )}

            {detailRecord.description && (
              <div>
                <span className="font-bold text-slate-700 block mb-0.5">Deskripsi Masalah / Rincian:</span>
                <p className="text-slate-700 whitespace-pre-line">{detailRecord.description}</p>
              </div>
            )}

            <div>
              <span className="font-bold text-slate-700 block mb-0.5">Tindakan yang Dilakukan (Action):</span>
              <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                {detailRecord.action_taken || detailRecord.action || '-'}
              </p>
            </div>

            <div>
              <span className="font-bold text-slate-700 block mb-0.5">Hasil Pemeliharaan (Result):</span>
              <p className="text-emerald-800 font-medium bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200">
                {detailRecord.result || '-'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <span className="text-slate-500 block">Waktu Mulai:</span>
                <span className="text-slate-700">
                  {formatDateTime(detailRecord.start || detailRecord.started_at || detailRecord.created_at)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Waktu Selesai:</span>
                <span className="text-slate-700">
                  {formatDateTime(detailRecord.end || detailRecord.completed_at || detailRecord.created_at)}
                </span>
              </div>
            </div>

            {detailRecord.attachment_path && (
              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-indigo-600 text-lg">📄</span>
                  <div>
                    <span className="font-bold text-indigo-950 block text-xs">
                      {detailRecord.attachment_filename || 'Lampiran Bukti Pemeliharaan'}
                    </span>
                    <span className="text-[10px] text-indigo-600 font-mono">
                      Private storage aman (15 menit token terenkripsi)
                    </span>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={downloadingAttachment}
                  onClick={() => handleDownloadAttachment(detailRecord.id)}
                >
                  {downloadingAttachment ? 'Membuka...' : 'Unduh Bukti'}
                </Button>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setDetailRecord(null)}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* MODAL TAMBAH / EDIT PEMELIHARAAN */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingRecordId ? 'Edit Catatan Pemeliharaan' : 'Catat Riwayat Pemeliharaan Aplikasi'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Tipe Pemeliharaan *
            </label>
            <Select
              value={form.maintenance_type}
              onChange={(e) =>
                setForm({ ...form, maintenance_type: e.target.value as MaintenanceType })
              }
              options={[
                { value: 'CORRECTIVE', label: 'CORRECTIVE (Perbaikan Bug / Error Kritis)' },
                { value: 'ADAPTIVE', label: 'ADAPTIVE (Penyesuaian Lingkungan OS / Server / Regulasi)' },
                { value: 'PERFECTIVE', label: 'PERFECTIVE (Peningkatan Performa & Kemudahan Pakai)' },
                { value: 'PREVENTIVE', label: 'PREVENTIVE (Pencegahan Masalah & Backup Rutin)' },
              ]}
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Judul / Aktivitas Pemeliharaan *
            </label>
            <Input
              placeholder="Contoh: Pembaruan SSL Certificate & Patch Security..."
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Alasan Pemeliharaan (Reason)
            </label>
            <Input
              placeholder="Laporan kendala, vulnerability scan, atau jadwal berkala..."
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Deskripsi Masalah / Rincian (Description)
            </label>
            <Textarea
              rows={2}
              placeholder="Rincian kendala teknis atau kebutuhan penyesuaian..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Tindakan yang Dilakukan (Action)
            </label>
            <Textarea
              rows={2}
              placeholder="Langkah teknis perbaikan, konfigurasi ulang, migrasi..."
              value={form.action_taken}
              onChange={(e) => setForm({ ...form, action_taken: e.target.value })}
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Hasil Pemeliharaan (Result)
            </label>
            <Input
              placeholder="Layanan stabil, bug teratasi, backup 100%..."
              value={form.result}
              onChange={(e) => setForm({ ...form, result: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Waktu Mulai (Start)
              </label>
              <Input
                type="date"
                value={form.start}
                onChange={(e) => setForm({ ...form, start: e.target.value })}
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Waktu Selesai (End)
              </label>
              <Input
                type="date"
                value={form.end}
                onChange={(e) => setForm({ ...form, end: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Pelaksana (Executor)
            </label>
            <Input
              placeholder="Nama personel teknisi atau tim pelaksana..."
              value={form.executor}
              onChange={(e) => setForm({ ...form, executor: e.target.value })}
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Lampiran Bukti (Patch Notes, Log Backup, Laporan Server)
            </label>
            <input
              type="file"
              className="text-xs text-slate-600 block w-full file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setForm({ ...form, file: e.target.files[0] });
                }
              }}
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : 'Simpan Riwayat'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

// ============================================================
// 7. EVALUATION SECTION
// ============================================================
function EvaluationSection({
  applicationId,
  canEdit,
}: {
  applicationId: string;
  canEdit: boolean;
}) {
  const { toast } = useToast();
  const { data: evaluations, isLoading, refetch } = useLifecycleEvaluations(applicationId);
  const createMutation = useCreateEvaluation(applicationId);
  const updateMutation = useUpdateEvaluation(applicationId);
  const deleteMutation = useDeleteEvaluation(applicationId);

  const [modalOpen, setModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<EvaluationRecordItem | null>(null);
  const [editItem, setEditItem] = useState<EvaluationRecordItem | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState(() => ({
    evaluation_date: new Date().toISOString().split('T')[0],
    evaluator: '',
    success_indicators: '',
    achievement: '',
    findings: '',
    recommendations: '',
    follow_up: '',
    file: null as File | null,
  }));

  const [editForm, setEditForm] = useState({
    evaluation_date: '',
    evaluator: '',
    success_indicators: '',
    achievement: '',
    findings: '',
    recommendations: '',
    follow_up: '',
    file: null as File | null,
  });

  const handleDownload = async (evaluationId: string) => {
    try {
      setDownloadingId(evaluationId);
      const { signed_url } = await fetchEvaluationAttachmentUrl(applicationId, evaluationId);
      if (!signed_url) throw new Error('Signed URL tidak dapat dibuat');
      window.open(signed_url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      toast({
        title: 'Gagal Mengunduh Berkas',
        message: err?.message || 'Dokumen privat evaluasi tidak dapat diakses.',
        type: 'danger',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.evaluation_date) {
      toast({ title: 'Validasi Gagal', message: 'Tanggal evaluasi wajib diisi.', type: 'warning' });
      return;
    }

    const submitData = async (base64Attachment?: string, attachmentName?: string) => {
      await createMutation.mutateAsync({
        evaluation_date: createForm.evaluation_date,
        evaluator: createForm.evaluator.trim() || undefined,
        success_indicators: createForm.success_indicators.trim() || undefined,
        achievement: createForm.achievement.trim() || undefined,
        findings: createForm.findings.trim() || undefined,
        recommendations: createForm.recommendations.trim() || undefined,
        follow_up: createForm.follow_up.trim() || undefined,
        attachment_base64: base64Attachment,
        attachment_filename: attachmentName,
      });
      toast({
        title: 'Evaluasi Tersimpan',
        message: 'Catatan evaluasi pasca-implementasi berhasil didokumentasikan.',
        type: 'success',
      });
      setModalOpen(false);
      setCreateForm({
        evaluation_date: new Date().toISOString().split('T')[0],
        evaluator: '',
        success_indicators: '',
        achievement: '',
        findings: '',
        recommendations: '',
        follow_up: '',
        file: null,
      });
      refetch();
    };

    try {
      if (createForm.file) {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          await submitData(base64Data, createForm.file?.name);
        };
        reader.readAsDataURL(createForm.file);
      } else {
        await submitData();
      }
    } catch (err: any) {
      toast({ title: 'Gagal Menyimpan', message: err?.message || 'Terjadi kesalahan.', type: 'danger' });
    }
  };

  const openEditModal = (item: EvaluationRecordItem) => {
    setEditItem(item);
    setEditForm({
      evaluation_date: item.evaluation_date ? item.evaluation_date.split('T')[0] : '',
      evaluator: item.evaluator || item.evaluated_by_name || '',
      success_indicators: item.success_indicators || item.success_indicator || '',
      achievement: item.achievement || '',
      findings: item.findings || '',
      recommendations: item.recommendations || '',
      follow_up: item.follow_up || item.follow_up_plan || '',
      file: null,
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    if (!editForm.evaluation_date) {
      toast({ title: 'Validasi Gagal', message: 'Tanggal evaluasi wajib diisi.', type: 'warning' });
      return;
    }

    const submitUpdate = async (base64Attachment?: string, attachmentName?: string) => {
      await updateMutation.mutateAsync({
        evalId: editItem.id,
        dto: {
          evaluation_date: editForm.evaluation_date,
          evaluator: editForm.evaluator.trim() || undefined,
          success_indicators: editForm.success_indicators.trim() || undefined,
          achievement: editForm.achievement.trim() || undefined,
          findings: editForm.findings.trim() || undefined,
          recommendations: editForm.recommendations.trim() || undefined,
          follow_up: editForm.follow_up.trim() || undefined,
          attachment_base64: base64Attachment,
          attachment_filename: attachmentName,
        },
      });
      toast({
        title: 'Evaluasi Diperbarui',
        message: 'Perubahan catatan evaluasi pasca-implementasi berhasil disimpan.',
        type: 'success',
      });
      setEditItem(null);
      refetch();
    };

    try {
      if (editForm.file) {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          await submitUpdate(base64Data, editForm.file?.name);
        };
        reader.readAsDataURL(editForm.file);
      } else {
        await submitUpdate();
      }
    } catch (err: any) {
      toast({ title: 'Gagal Memperbarui', message: err?.message || 'Terjadi kesalahan.', type: 'danger' });
    }
  };

  const handleDelete = async (evalId: string) => {
    if (!confirm('Hapus catatan evaluasi ini?')) return;
    try {
      await deleteMutation.mutateAsync(evalId);
      toast({ title: 'Terhapus', message: 'Catatan evaluasi telah dihapus.', type: 'info' });
      refetch();
    } catch (err: any) {
      toast({ title: 'Gagal Menghapus', message: err?.message, type: 'danger' });
    }
  };

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      {/* DISCLAIMER REGULASI */}
      <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 text-xs text-amber-900 flex items-start gap-2.5">
        <span className="text-amber-600 font-bold shrink-0 mt-0.5">ℹ</span>
        <div>
          <strong>Pemberitahuan Dokumentasi SPBE:</strong> Modul ini menyediakan kapabilitas dokumentasi teknis evaluasi pasca-implementasi aplikasi. Kepatuhan regulasi dan hukum organisasi tetap bergantung pada pelaksanaan proses, verifikasi lapangan, audit formal, dan kebijakan instansi.
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Tahap 7: Evaluasi Pasca Implementasi (Evaluation)
          </h3>
          <p className="text-xs text-slate-500">
            Evaluasi berkala terhadap indikator keberhasilan, capaian riil (achievement), temuan (findings), rekomendasi, dan tindak lanjut (follow-up).
          </p>
        </div>
        {canEdit && (
          <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
            + Tambah Evaluasi
          </Button>
        )}
      </div>

      {(!evaluations || evaluations.length === 0) ? (
        <EmptyState
          title="Belum Ada Catatan Evaluasi"
          description="Evaluasi dilakukan setelah sistem dioperasikan untuk mengukur efektivitas, manfaat riil, dan kepatuhan arsitektur SPBE."
          action={
            canEdit ? (
              <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
                + Catat Evaluasi Pertama
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {evaluations.map((ev) => (
            <div
              key={ev.id}
              className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="primary">
                    Tanggal: {formatDate(ev.evaluation_date)}
                  </Badge>
                  {(ev.evaluator || ev.evaluated_by_name) && (
                    <span className="text-xs text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                      Evaluator: <strong>{ev.evaluator || ev.evaluated_by_name}</strong>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:bg-primary/10"
                    onClick={() => setDetailItem(ev)}
                  >
                    Detail
                  </Button>
                  {canEdit && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-600 hover:bg-slate-200/60"
                        onClick={() => openEditModal(ev)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(ev.id)}
                      >
                        Hapus
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div>
                  <span className="font-bold text-slate-700 block">Indikator Keberhasilan:</span>
                  <p className="text-slate-600 whitespace-pre-wrap">{ev.success_indicators || ev.success_indicator || '-'}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-700 block">Capaian Riil (Achievement):</span>
                  <p className="text-slate-600 font-medium text-emerald-800 whitespace-pre-wrap">{ev.achievement || '-'}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-700 block">Temuan (Findings):</span>
                  <p className="text-slate-600 whitespace-pre-wrap">{ev.findings || '-'}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-700 block">Rekomendasi:</span>
                  <p className="text-slate-600 whitespace-pre-wrap">{ev.recommendations || '-'}</p>
                </div>
                {(ev.follow_up || ev.follow_up_plan) && (
                  <div className="md:col-span-2 bg-white p-3 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-800 block text-xs uppercase tracking-wider mb-1">
                      Rencana Tindak Lanjut (Follow-Up):
                    </span>
                    <p className="text-slate-700 whitespace-pre-wrap">{ev.follow_up || ev.follow_up_plan}</p>
                  </div>
                )}
              </div>

              {ev.attachment_filename && (
                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                    <FileTextIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Lampiran: {ev.attachment_filename}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={downloadingId === ev.id}
                    onClick={() => handleDownload(ev.id)}
                  >
                    {downloadingId === ev.id ? 'Mengunduh...' : 'Unduh Berkas'}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* DETAIL MODAL */}
      <Dialog
        isOpen={Boolean(detailItem)}
        onClose={() => setDetailItem(null)}
        title="Detail Catatan Evaluasi Pasca-Implementasi"
      >
        {detailItem && (
          <div className="space-y-4 text-xs sm:text-sm">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-xs text-slate-500 block">Tanggal Evaluasi:</span>
                <span className="font-bold text-slate-900">{formatDate(detailItem.evaluation_date)}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Evaluator:</span>
                <span className="font-bold text-slate-900">{detailItem.evaluator || detailItem.evaluated_by_name || '-'}</span>
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-700 block mb-0.5">Indikator Keberhasilan:</span>
              <p className="p-2.5 rounded bg-slate-50 text-slate-800 border border-slate-200 whitespace-pre-wrap">
                {detailItem.success_indicators || detailItem.success_indicator || '-'}
              </p>
            </div>

            <div>
              <span className="font-bold text-slate-700 block mb-0.5">Capaian Riil (Achievement):</span>
              <p className="p-2.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200 whitespace-pre-wrap font-medium">
                {detailItem.achievement || '-'}
              </p>
            </div>

            <div>
              <span className="font-bold text-slate-700 block mb-0.5">Temuan Evaluasi (Findings):</span>
              <p className="p-2.5 rounded bg-slate-50 text-slate-800 border border-slate-200 whitespace-pre-wrap">
                {detailItem.findings || '-'}
              </p>
            </div>

            <div>
              <span className="font-bold text-slate-700 block mb-0.5">Rekomendasi Perbaikan:</span>
              <p className="p-2.5 rounded bg-slate-50 text-slate-800 border border-slate-200 whitespace-pre-wrap">
                {detailItem.recommendations || '-'}
              </p>
            </div>

            <div>
              <span className="font-bold text-slate-700 block mb-0.5">Rencana Tindak Lanjut (Follow-Up):</span>
              <p className="p-2.5 rounded bg-slate-50 text-slate-800 border border-slate-200 whitespace-pre-wrap">
                {detailItem.follow_up || detailItem.follow_up_plan || '-'}
              </p>
            </div>

            {detailItem.attachment_filename && (
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 block">Berkas Bukti / Laporan Evaluasi:</span>
                  <span className="font-medium text-slate-800">{detailItem.attachment_filename}</span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={downloadingId === detailItem.id}
                  onClick={() => handleDownload(detailItem.id)}
                >
                  {downloadingId === detailItem.id ? 'Mengunduh...' : 'Unduh Berkas'}
                </Button>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setDetailItem(null)}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* MODAL TAMBAH EVALUASI */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Catat Evaluasi Pasca-Implementasi"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Tanggal Pelaksanaan Evaluasi *
              </label>
              <Input
                type="date"
                value={createForm.evaluation_date}
                onChange={(e) => setCreateForm({ ...createForm, evaluation_date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Evaluator / Tim Evaluasi
              </label>
              <Input
                placeholder="Nama evaluator / instansi penilai"
                value={createForm.evaluator}
                onChange={(e) => setCreateForm({ ...createForm, evaluator: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Indikator Keberhasilan (Success Indicators)
            </label>
            <Textarea
              rows={2}
              placeholder="Contoh: Efisiensi waktu layanan pengurusan OPD terpangkas 50%..."
              value={createForm.success_indicators}
              onChange={(e) => setCreateForm({ ...createForm, success_indicators: e.target.value })}
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Capaian Riil (Achievement)
            </label>
            <Textarea
              rows={2}
              placeholder="Contoh: Waktu layanan terpangkas dari 5 hari menjadi 1 hari..."
              value={createForm.achievement}
              onChange={(e) => setCreateForm({ ...createForm, achievement: e.target.value })}
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Temuan Evaluasi (Findings)
            </label>
            <Textarea
              rows={2}
              placeholder="Kendala literasi pengguna atau kendala konektivitas pada OPD..."
              value={createForm.findings}
              onChange={(e) => setCreateForm({ ...createForm, findings: e.target.value })}
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Rekomendasi Perbaikan
            </label>
            <Textarea
              rows={2}
              placeholder="Rekomendasi teknis atau operasional untuk fase berikutnya..."
              value={createForm.recommendations}
              onChange={(e) => setCreateForm({ ...createForm, recommendations: e.target.value })}
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Rencana Tindak Lanjut (Follow-Up)
            </label>
            <Textarea
              rows={2}
              placeholder="Penjadwalan update sistem pada triwulan berikutnya..."
              value={createForm.follow_up}
              onChange={(e) => setCreateForm({ ...createForm, follow_up: e.target.value })}
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Lampiran Dokumen Evaluasi (Opsional)
            </label>
            <Input
              type="file"
              onChange={(e) => setCreateForm({ ...createForm, file: e.target.files?.[0] || null })}
            />
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Format didukung: PDF, DOCX, XLSX, ZIP (Maks. 20MB) tersimpan pada storage privat.
            </span>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Menyimpan...' : 'Simpan Evaluasi'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL EDIT EVALUASI */}
      <Dialog
        isOpen={Boolean(editItem)}
        onClose={() => setEditItem(null)}
        title="Edit Catatan Evaluasi Pasca-Implementasi"
      >
        <form onSubmit={handleUpdate} className="space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Tanggal Pelaksanaan Evaluasi *
              </label>
              <Input
                type="date"
                value={editForm.evaluation_date}
                onChange={(e) => setEditForm({ ...editForm, evaluation_date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Evaluator / Tim Evaluasi
              </label>
              <Input
                placeholder="Nama evaluator / instansi penilai"
                value={editForm.evaluator}
                onChange={(e) => setEditForm({ ...editForm, evaluator: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Indikator Keberhasilan (Success Indicators)
            </label>
            <Textarea
              rows={2}
              value={editForm.success_indicators}
              onChange={(e) => setEditForm({ ...editForm, success_indicators: e.target.value })}
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Capaian Riil (Achievement)
            </label>
            <Textarea
              rows={2}
              value={editForm.achievement}
              onChange={(e) => setEditForm({ ...editForm, achievement: e.target.value })}
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Temuan Evaluasi (Findings)
            </label>
            <Textarea
              rows={2}
              value={editForm.findings}
              onChange={(e) => setEditForm({ ...editForm, findings: e.target.value })}
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Rekomendasi Perbaikan
            </label>
            <Textarea
              rows={2}
              value={editForm.recommendations}
              onChange={(e) => setEditForm({ ...editForm, recommendations: e.target.value })}
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Rencana Tindak Lanjut (Follow-Up)
            </label>
            <Textarea
              rows={2}
              value={editForm.follow_up}
              onChange={(e) => setEditForm({ ...editForm, follow_up: e.target.value })}
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Ganti Lampiran Dokumen (Opsional)
            </label>
            {editItem?.attachment_filename && (
              <span className="text-xs text-slate-500 block mb-1">
                Lampiran saat ini: <strong>{editItem.attachment_filename}</strong>
              </span>
            )}
            <Input
              type="file"
              onChange={(e) => setEditForm({ ...editForm, file: e.target.files?.[0] || null })}
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setEditItem(null)}>
              Batal
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

// ============================================================
// 8. TECHNICAL DOCUMENTS SECTION (Private Storage)
// ============================================================
function TechnicalDocumentsSection({
  applicationId,
  canEdit,
}: {
  applicationId: string;
  canEdit: boolean;
}) {
  const { toast } = useToast();
  const { data: docs, isLoading, refetch } = useLifecycleTechnicalDocs(applicationId);
  const uploadMutation = useUploadTechnicalDoc(applicationId);
  const deleteMutation = useDeleteTechnicalDoc(applicationId);

  const [modalOpen, setModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    document_type: 'REQUIREMENTS' as TechnicalDocumentType,
    title: '',
    description: '',
    file: null as File | null,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setForm({ ...form, file: e.target.files[0] });
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.file) {
      toast({
        title: 'Validasi Gagal',
        message: 'Judul dokumen dan berkas fisik wajib dipilih.',
        type: 'warning',
      });
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        await uploadMutation.mutateAsync({
          document_type: form.document_type,
          title: form.title.trim(),
          description: form.description || undefined,
          original_filename: form.file?.name || 'dokumen.pdf',
          mime_type: form.file?.type || 'application/pdf',
          size_bytes: form.file?.size || 0,
          base64_data: base64Data,
        });

        toast({
          title: 'Berhasil Diunggah',
          message: 'Dokumen teknis tersimpan aman di private storage.',
          type: 'success',
        });
        setModalOpen(false);
        setForm({
          document_type: 'REQUIREMENTS',
          title: '',
          description: '',
          file: null,
        });
        refetch();
      };
      reader.readAsDataURL(form.file);
    } catch (err: any) {
      toast({
        title: 'Gagal Mengunggah',
        message: err?.message || 'Gagal menyimpan berkas teknis.',
        type: 'danger',
      });
    }
  };

  const handleDownload = async (docId: string) => {
    setDownloadingId(docId);
    try {
      const res = await fetchTechnicalDocDownloadUrl(applicationId, docId);
      window.open(res.signed_url, '_blank');
    } catch (err: any) {
      toast({
        title: 'Gagal Mengunduh',
        message: err?.message || 'Tautan aman tidak dapat dibuat.',
        type: 'danger',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Hapus dokumen teknis ini?')) return;
    try {
      await deleteMutation.mutateAsync(docId);
      toast({ title: 'Terhapus', message: 'Dokumen teknis telah dihapus.', type: 'info' });
      refetch();
    } catch (err: any) {
      toast({ title: 'Gagal Menghapus', message: err?.message, type: 'danger' });
    }
  };

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Berkas & Dokumen Teknis Lifecycle (Private Storage)
          </h3>
          <p className="text-xs text-slate-500">
            Penyimpanan aman (private bucket) untuk dokumen perancangan, arsitektur, API, skema DB, manual pengguna, dan laporan uji.
          </p>
        </div>
        {canEdit && (
          <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
            + Unggah Dokumen Teknis
          </Button>
        )}
      </div>

      {(!docs || docs.length === 0) ? (
        <EmptyState
          title="Belum Ada Dokumen Teknis"
          description="Seluruh dokumen teknis disimpan di secure private storage dan terlindungi otorisasi permohonan."
          action={
            canEdit ? (
              <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
                + Unggah Dokumen Pertama
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {docs.map((d) => (
            <div
              key={d.id}
              className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors bg-slate-50/50 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="primary" className="text-[10px] font-mono">
                    {d.document_type}
                  </Badge>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {(d.size_bytes / 1024).toFixed(1)} KB
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm mt-2">{d.title}</h4>
                {d.description && (
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {d.description}
                  </p>
                )}
                <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
                  <FileTextIcon size={12} />
                  <span className="truncate">{d.original_filename}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  {formatDate(d.uploaded_at)}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(d.id)}
                    disabled={downloadingId === d.id}
                  >
                    {downloadingId === d.id ? 'Mengunduh...' : 'Buka / Unduh'}
                  </Button>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(d.id)}
                    >
                      Hapus
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL UNGGAH DOKUMEN */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Unggah Dokumen Teknis Lifecycle"
      >
        <form onSubmit={handleUpload} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Klasifikasi Dokumen Teknis *
            </label>
            <Select
              value={form.document_type}
              onChange={(e) =>
                setForm({ ...form, document_type: e.target.value as TechnicalDocumentType })
              }
              options={[
                { value: 'REQUIREMENTS', label: 'REQUIREMENTS (Dokumen Kebutuhan SPBE)' },
                { value: 'ARCHITECTURE', label: 'ARCHITECTURE (Arsitektur Sistem & Infrastruktur)' },
                { value: 'DESIGN', label: 'DESIGN (Perancangan UI/UX & Proses Bisnis)' },
                { value: 'API', label: 'API (Spesifikasi & Kontrak Layanan API)' },
                { value: 'DATABASE', label: 'DATABASE (Skema Data & Kamus Data)' },
                { value: 'INSTALLATION', label: 'INSTALLATION (Panduan Instalasi & Deployment)' },
                { value: 'USER_MANUAL', label: 'USER_MANUAL (Buku Petunjuk Pengguna)' },
                { value: 'TROUBLESHOOTING', label: 'TROUBLESHOOTING (Penanganan Kendala Teknis)' },
                { value: 'OTHER', label: 'OTHER (Dokumen Pendukung Lainnya)' },
              ]}
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Judul Dokumen *
            </label>
            <Input
              placeholder="Contoh: Arsitektur Keamanan SIMANTIK v1.0..."
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Deskripsi Singkat
            </label>
            <Textarea
              rows={2}
              placeholder="Penjelasan isi ringkas dokumen..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Pilih Berkas Dokumen (PDF, DOC, XLS, PNG, JPG maks 10MB) *
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              required
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? 'Mengunggah...' : 'Unggah ke Private Storage'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
