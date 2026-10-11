import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AppRole } from '../../auth/auth.types.js';
import type {
  ApplicationStage,
  ApplicationStatus,
  TransitionOption,
  TransitionRule,
} from './workflow.types.js';

export const TRANSITION_RULES: TransitionRule[] = [
  // Dari SUBMITTED
  {
    from: 'SUBMITTED',
    to: 'VERIFICATION',
    allowedRoles: ['SUPER_ADMIN'],
    requireNote: false,
    label: 'Mulai Verifikasi',
    description: 'Buka dan mulai telaah administrasi & berkas permohonan.',
    variant: 'primary',
  },
  {
    from: 'SUBMITTED',
    to: 'REJECTED',
    allowedRoles: ['SUPER_ADMIN'],
    requireNote: true,
    label: 'Tolak Permohonan',
    description: 'Tolak usulan langsung (misal: di luar wewenang atau duplikasi).',
    variant: 'danger',
  },
  {
    from: 'SUBMITTED',
    to: 'CANCELLED',
    allowedRoles: ['SUPER_ADMIN'],
    requireNote: true,
    label: 'Batalkan Permohonan',
    description: 'Batalkan permohonan atas permintaan OPD atau kendala khusus.',
    variant: 'neutral',
  },

  // Dari VERIFICATION
  {
    from: 'VERIFICATION',
    to: 'APPROVED',
    allowedRoles: ['SUPER_ADMIN'],
    requireNote: false,
    targetStage: 'ANALYSIS',
    label: 'Setujui Permohonan',
    description: 'Berkas dan kriteria layak, setujui untuk masuk siklus pengembangan.',
    variant: 'success',
  },
  {
    from: 'VERIFICATION',
    to: 'REVISION_REQUIRED',
    allowedRoles: ['SUPER_ADMIN'],
    requireNote: true,
    label: 'Minta Revisi',
    description: 'Kembalikan ke OPD untuk perbaikan data atau berkas dokumen yang kurang.',
    variant: 'warning',
  },
  {
    from: 'VERIFICATION',
    to: 'REJECTED',
    allowedRoles: ['SUPER_ADMIN'],
    requireNote: true,
    label: 'Tolak Permohonan',
    description: 'Tolak permohonan setelah telaah teknis dan kelayakan SPBE.',
    variant: 'danger',
  },
  {
    from: 'VERIFICATION',
    to: 'CANCELLED',
    allowedRoles: ['SUPER_ADMIN'],
    requireNote: true,
    label: 'Batalkan Permohonan',
    description: 'Batalkan permohonan.',
    variant: 'neutral',
  },

  // Dari REVISION_REQUIRED
  {
    from: 'REVISION_REQUIRED',
    to: 'VERIFICATION',
    allowedRoles: ['SUPER_ADMIN'],
    requireNote: false,
    label: 'Lanjutkan Verifikasi',
    description: 'Revisi telah diterima, lanjutkan kembali proses verifikasi.',
    variant: 'primary',
  },
  {
    from: 'REVISION_REQUIRED',
    to: 'REJECTED',
    allowedRoles: ['SUPER_ADMIN'],
    requireNote: true,
    label: 'Tolak Permohonan',
    description: 'Tolak permohonan karena revisi tidak dipenuhi atau tidak sesuai.',
    variant: 'danger',
  },
  {
    from: 'REVISION_REQUIRED',
    to: 'CANCELLED',
    allowedRoles: ['SUPER_ADMIN'],
    requireNote: true,
    label: 'Batalkan Permohonan',
    description: 'Batalkan permohonan.',
    variant: 'neutral',
  },

  // Dari APPROVED
  {
    from: 'APPROVED',
    to: 'IN_PROGRESS',
    allowedRoles: ['SUPER_ADMIN', 'TECHNICIAN'],
    requireNote: false,
    targetStage: 'ANALYSIS',
    label: 'Mulai Pengerjaan',
    description: 'Mulai pengerjaan teknis aplikasi oleh tim teknis.',
    variant: 'primary',
  },
  {
    from: 'APPROVED',
    to: 'CANCELLED',
    allowedRoles: ['SUPER_ADMIN'],
    requireNote: true,
    label: 'Batalkan Permohonan',
    description: 'Batalkan permohonan yang telah disetujui.',
    variant: 'neutral',
  },

  // Dari IN_PROGRESS
  {
    from: 'IN_PROGRESS',
    to: 'COMPLETED',
    allowedRoles: ['SUPER_ADMIN', 'TECHNICIAN'],
    requireNote: true,
    targetStage: 'EVALUATION',
    label: 'Selesaikan Pekerjaan',
    description: 'Pengerjaan sistem telah selesai dan lolos pengujian kelaikan.',
    variant: 'success',
  },
  {
    from: 'IN_PROGRESS',
    to: 'REVISION_REQUIRED',
    allowedRoles: ['SUPER_ADMIN'],
    requireNote: true,
    label: 'Kembalikan ke Revisi',
    description: 'Kembalikan ke pemohon jika terjadi hambatan proses bisnis substansial.',
    variant: 'warning',
  },
  {
    from: 'IN_PROGRESS',
    to: 'CANCELLED',
    allowedRoles: ['SUPER_ADMIN'],
    requireNote: true,
    label: 'Batalkan Pekerjaan',
    description: 'Batalkan pelaksanaan pekerjaan.',
    variant: 'neutral',
  },

  // Dari COMPLETED
  {
    from: 'COMPLETED',
    to: 'CLOSED',
    allowedRoles: ['SUPER_ADMIN'],
    requireNote: false,
    label: 'Tutup Tiket Layanan',
    description: 'Tutup tiket setelah BAST ditandatangani dan layanan aktif.',
    variant: 'neutral',
  },
];

export const ORDERED_STAGES: ApplicationStage[] = [
  'ANALYSIS',
  'PLANNING',
  'DESIGN',
  'IMPLEMENTATION',
  'TESTING',
  'MAINTENANCE',
  'EVALUATION',
];

@Injectable()
export class WorkflowEngine {
  /**
   * Menghitung daftar transisi status yang diizinkan untuk current status dan role pengguna.
   */
  getAllowedTransitions(
    currentStatus: ApplicationStatus,
    userRole: AppRole,
  ): TransitionOption[] {
    return TRANSITION_RULES.filter(
      (rule) => rule.from === currentStatus && rule.allowedRoles.includes(userRole),
    ).map((rule) => ({
      to_status: rule.to,
      label: rule.label,
      description: rule.description,
      require_note: rule.requireNote,
      target_stage: rule.targetStage,
      variant: rule.variant,
    }));
  }

  /**
   * Memvalidasi transisi status secara terpusat:
   * - memeriksa keberadaan aturan dari current -> target
   * - memeriksa otorisasi peran (RBAC)
   * - memeriksa kewajiban catatan/alasan
   */
  validateTransition(
    currentStatus: ApplicationStatus,
    targetStatus: ApplicationStatus,
    userRole: AppRole,
    note?: string,
  ): TransitionRule {
    const rule = TRANSITION_RULES.find(
      (r) => r.from === currentStatus && r.to === targetStatus,
    );

    if (!rule) {
      throw new BadRequestException(
        `Transisi status tidak valid: tidak dapat berpindah dari [${currentStatus}] ke [${targetStatus}].`,
      );
    }

    if (!rule.allowedRoles.includes(userRole)) {
      throw new ForbiddenException(
        `Peran [${userRole}] tidak diizinkan melakukan transisi status dari [${currentStatus}] ke [${targetStatus}].`,
      );
    }

    if (rule.requireNote && (!note || note.trim().length < 5)) {
      throw new BadRequestException(
        `Catatan atau alasan wajib diisi minimal 5 karakter untuk transisi ke [${targetStatus}].`,
      );
    }

    return rule;
  }

  /**
   * Memvalidasi transisi lifecycle stage secara terpusat:
   * - stage hanya boleh diperbarui jika status permohonan sedang APPROVED, IN_PROGRESS, atau COMPLETED
   * - role yang diizinkan: SUPER_ADMIN atau TECHNICIAN
   */
  validateStageTransition(
    currentStage: ApplicationStage | null,
    targetStage: ApplicationStage,
    currentStatus: ApplicationStatus,
    userRole: AppRole,
  ): void {
    const validStatuses: ApplicationStatus[] = [
      'APPROVED',
      'IN_PROGRESS',
      'COMPLETED',
    ];

    if (!validStatuses.includes(currentStatus)) {
      throw new BadRequestException(
        `Perubahan lifecycle stage tidak diizinkan saat status permohonan adalah [${currentStatus}]. Permohonan harus sudah disetujui (APPROVED/IN_PROGRESS).`,
      );
    }

    if (userRole !== 'SUPER_ADMIN' && userRole !== 'TECHNICIAN') {
      throw new ForbiddenException(
        `Peran [${userRole}] tidak memiliki wewenang untuk mengubah lifecycle stage.`,
      );
    }

    if (!ORDERED_STAGES.includes(targetStage)) {
      throw new BadRequestException(
        `Lifecycle stage target [${targetStage}] tidak valid sesuai standar SPBE Permenkomdigi 6/2025.`,
      );
    }
  }
}
