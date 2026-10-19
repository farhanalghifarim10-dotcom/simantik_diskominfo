import { useState, useEffect } from 'react';
import {
  Dialog,
  Button,
  Textarea,
  Checkbox,
  Alert,
  Badge,
  KeyIcon,
  CopyIcon,
  CheckIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  SpinnerIcon,
} from '../../components/ui';
import { useToast } from '../../components/ui/use-toast';
import { useAuth } from '../auth/useAuth';
import {
  useReissueTrackingCode,
  type ReissueTrackingCodeResult,
} from './useAdminApplications';

export interface TargetApplicationInfo {
  id: string;
  ticket_number: string;
  title: string;
  applicant?: {
    full_name: string;
    opd_name: string;
    phone?: string | null;
    email?: string;
  };
}

interface ReissueTrackingCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: TargetApplicationInfo | null;
}

export function ReissueTrackingCodeModal({
  isOpen,
  onClose,
  application,
}: ReissueTrackingCodeModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const reissueMutation = useReissueTrackingCode();

  // Modal Step: 'form' | 'success'
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [reason, setReason] = useState('');
  const [hasVerifiedIdentity, setHasVerifiedIdentity] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [reissuedResult, setReissuedResult] = useState<ReissueTrackingCodeResult | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  // Reset modal state on open or change of application
  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setReason('');
      setHasVerifiedIdentity(false);
      setValidationError('');
      setReissuedResult(null);
      setHasCopied(false);
    }
  }, [isOpen, application?.id]);

  // Restrict access strictly to SUPER_ADMIN
  if (!isSuperAdmin || !application) {
    return null;
  }

  const handleConfirmSubmit = async () => {
    const trimmed = reason.trim();
    if (!trimmed || trimmed.length < 5) {
      setValidationError('Alasan penerbitan ulang wajib diisi minimal 5 karakter.');
      return;
    }
    if (!hasVerifiedIdentity) {
      setValidationError('Anda wajib mengonfirmasi bahwa identitas pemohon telah diverifikasi.');
      return;
    }

    setValidationError('');

    try {
      const result = await reissueMutation.mutateAsync({
        id: application.id,
        reason: trimmed,
      });

      setReissuedResult(result);
      setStep('success');
      toast({
        type: 'success',
        title: 'Kode Baru Berhasil Diterbitkan',
        message: `Kode pelacakan baru untuk tiket ${application.ticket_number} telah dibuat.`,
      });
    } catch (err) {
      const msg = (err as Error).message || 'Gagal menerbitkan ulang kode pelacakan.';
      setValidationError(msg);
      toast({
        type: 'danger',
        title: 'Gagal Menerbitkan Ulang',
        message: msg,
      });
    }
  };

  const handleCopyCode = async () => {
    if (!reissuedResult?.tracking_code) return;
    try {
      await navigator.clipboard.writeText(reissuedResult.tracking_code);
      setHasCopied(true);
      toast({
        type: 'info',
        title: 'Kode Disalin',
        message: 'Kode pelacakan baru telah disalin ke clipboard.',
      });
      setTimeout(() => setHasCopied(false), 3000);
    } catch {
      toast({
        type: 'danger',
        title: 'Gagal Menyalin',
        message: 'Silakan salin kode secara manual.',
      });
    }
  };

  const handleClose = () => {
    if (reissueMutation.isPending) return;
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      title={
        <div className="flex items-center gap-2 text-slate-900">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <KeyIcon size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base">
                {step === 'form' ? 'Penerbitan Ulang Kode Pelacakan' : 'Kode Pelacakan Baru'}
              </span>
              <Badge variant="warning" className="text-[10px] uppercase font-bold tracking-wider">
                Super Admin Khusus
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-normal">
              Tiket: <span className="font-mono font-semibold text-slate-700">{application.ticket_number}</span>
            </p>
          </div>
        </div>
      }
      footer={
        step === 'form' ? (
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={reissueMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleConfirmSubmit}
              disabled={
                reissueMutation.isPending ||
                reason.trim().length < 5 ||
                !hasVerifiedIdentity
              }
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              {reissueMutation.isPending ? (
                <>
                  <SpinnerIcon size={14} className="mr-1.5" />
                  Memproses Penerbitan...
                </>
              ) : (
                'Konfirmasi & Terbitkan Kode Baru'
              )}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleClose}
              className="bg-[#1B5040] hover:bg-[#153e32] text-white font-bold"
            >
              Selesai & Tutup Jendela
            </Button>
          </div>
        )
      }
    >
      {step === 'form' ? (
        <div className="space-y-4 text-xs sm:text-sm">
          {/* Security Alert */}
          <Alert variant="warning" title="Perhatian Keamanan & Prosedur Resmi">
            Penerbitan ulang kode pelacakan akan <strong>membatalkan kode lama seketika</strong> secara permanen. Pastikan Anda telah melakukan verifikasi identitas pejabat atau narahubung resmi Perangkat Daerah (OPD) pemohon melalui saluran resmi sebelum melanjutkan.
          </Alert>

          {/* Application & Applicant Details Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Rincian Permohonan Terkait
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500 block">Nomor Tiket:</span>
                <span className="font-mono font-bold text-[#1B5040]">{application.ticket_number}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Perangkat Daerah (OPD):</span>
                <span className="font-semibold text-slate-800">
                  {application.applicant?.opd_name || '-'}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500 block">Nama Pemohon:</span>
                <span className="font-medium text-slate-800">
                  {application.applicant?.full_name || '-'}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500 block">Judul Usulan:</span>
                <span className="text-slate-700 italic">{application.title}</span>
              </div>
            </div>
          </div>

          {/* Justification Reason Input */}
          <div className="space-y-1.5">
            <label htmlFor="reissue-reason" className="font-bold text-slate-800 flex items-center justify-between">
              <span>Alasan Penerbitan Ulang *</span>
              <span className="text-[11px] font-normal text-slate-400">Minimal 5 karakter</span>
            </label>
            <Textarea
              id="reissue-reason"
              placeholder="Contoh: Permohonan resmi dari Kepala Bidang Bapenda via Surat Dinas No. 005/123/2026 sehubungan dengan hilangnya kode pelacakan lama."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (validationError) setValidationError('');
              }}
              rows={3}
              className="text-xs sm:text-sm"
              required
            />
            <p className="text-[11px] text-slate-500">
              Alasan ini akan disimpan secara permanen di jejak audit (audit log) bersama identitas Anda.
            </p>
          </div>

          {/* Verification Checkbox */}
          <div className="pt-2">
            <Checkbox
              id="verify-identity-confirm"
              checked={hasVerifiedIdentity}
              onChange={(e) => {
                setHasVerifiedIdentity(e.target.checked);
                if (validationError) setValidationError('');
              }}
              label={
                <span className="text-xs text-slate-700 font-medium">
                  Saya menyatakan bahwa identitas pemohon OPD telah diverifikasi secara sah melalui kanal resmi, dan saya memahami kode lama akan langsung tidak berlaku.
                </span>
              }
            />
          </div>

          {/* Validation Error Banner */}
          {validationError && (
            <Alert variant="danger" title="Validasi Gagal">
              {validationError}
            </Alert>
          )}
        </div>
      ) : (
        /* STEP 2: SINGLE-VIEW SUCCESS SCREEN */
        <div className="space-y-5 text-xs sm:text-sm py-1">
          <Alert variant="success" title="Kode Pelacakan Berhasil Diterbitkan">
            Kode lama untuk tiket <strong>{application.ticket_number}</strong> telah dibatalkan secara permanen. Pengguna atau pihak lain tidak dapat lagi mengakses permohonan menggunakan kode sebelumnya.
          </Alert>

          {/* One-time Display Card */}
          <div className="bg-gradient-to-br from-[#CAF3E4]/40 via-white to-slate-50 border-2 border-[#98F7D9] rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#1B5040] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheckIcon size={16} />
                Kode Pelacakan Baru (Rahasia)
              </span>
              <Badge variant="danger" className="text-[10px]">
                Tampil 1x Saja
              </Badge>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
              <span className="font-mono text-base sm:text-lg md:text-xl font-black text-[#1B5040] break-all select-all flex-1 text-center sm:text-left">
                {reissuedResult?.tracking_code}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyCode}
                className="shrink-0 font-bold border-[#1B5040] text-[#1B5040] hover:bg-[#CAF3E4] flex items-center gap-1.5"
              >
                {hasCopied ? (
                  <>
                    <CheckIcon size={14} className="text-emerald-700" />
                    <span className="text-emerald-700">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <CopyIcon size={14} />
                    <span>Salin Kode</span>
                  </>
                )}
              </Button>
            </div>

            <p className="text-[11px] text-slate-500">
              Diterbitkan pada: <span className="font-mono text-slate-700">{reissuedResult?.reissued_at ? new Date(reissuedResult.reissued_at).toLocaleString('id-ID') : '-'}</span>
            </p>
          </div>

          {/* High-priority Security Warning Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900">
            <AlertTriangleIcon size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-xs uppercase tracking-wide">
                Penting: Tidak Dapat Dilihat Kembali
              </p>
              <p className="text-xs text-amber-800 leading-relaxed">
                Demi kepatuhan standar keamanan data SPBE, sistem hanya menyimpan hash SHA-256 dan <strong>tidak menyimpan kode plaintext</strong>. Begitu jendela ini ditutup, kode tidak dapat ditampilkan kembali. Harap segera salin dan sampaikan kepada perwakilan resmi OPD melalui saluran terverifikasi.
              </p>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
