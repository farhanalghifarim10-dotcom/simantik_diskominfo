import { useState } from 'react';
import {
  Badge,
  Button,
  EmptyState,
  Select,
  Skeleton,
  Textarea,
  useToast,
} from '../../components/ui';
import {
  useApplicationMessages,
  useSendMessage,
  type MessageVisibility,
} from './useAdminMessages';

interface TicketDiscussionPanelProps {
  applicationId: string;
}

function formatDateTime(dateString?: string) {
  if (!dateString) return '-';
  try {
    return (
      new Date(dateString).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB'
    );
  } catch {
    return dateString;
  }
}

export function TicketDiscussionPanel({ applicationId }: TicketDiscussionPanelProps) {
  const { toast } = useToast();
  const [filterVisibility, setFilterVisibility] = useState<'ALL' | MessageVisibility>('ALL');
  const [targetVisibility, setTargetVisibility] = useState<MessageVisibility>('PUBLIC');
  const [messageInput, setMessageInput] = useState('');

  const {
    data: messages,
    isLoading,
    isFetching,
    refetch,
  } = useApplicationMessages(applicationId);

  const sendMutation = useSendMessage(applicationId);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    try {
      await sendMutation.mutateAsync({
        message: messageInput.trim(),
        visibility: targetVisibility,
      });

      setMessageInput('');
      toast({
        title: 'Pesan Terkirim',
        message:
          targetVisibility === 'PUBLIC'
            ? 'Balasan publik berhasil dikirimkan dan pemohon akan menerima pemberitahuan.'
            : 'Catatan internal berhasil disimpan khusus untuk tim teknis.',
        type: 'success',
      });
      refetch();
    } catch (err: any) {
      toast({
        title: 'Gagal Mengirim',
        message: err?.message || 'Terjadi kesalahan saat mengirimkan pesan.',
        type: 'danger',
      });
    }
  };

  const filteredMessages = (messages || []).filter((m) => {
    if (filterVisibility === 'ALL') return true;
    return m.visibility === filterVisibility;
  });

  const internalCount = (messages || []).filter((m) => m.visibility === 'INTERNAL').length;
  const publicCount = (messages || []).filter((m) => m.visibility === 'PUBLIC').length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Komunikasi & Konsultasi Tiket (Chat & Catatan Internal)
          </h3>
          <p className="text-xs text-slate-500">
            Saluran diskusi permohonan. Balasan publik dapat dibaca pemohon, sedangkan catatan internal terlindungi secara aman.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Polling (5s) {isFetching ? '• Memperbarui...' : ''}</span>
          </div>

          <Select
            className="w-44 py-1 text-xs"
            value={filterVisibility}
            onChange={(e) => setFilterVisibility(e.target.value as any)}
            options={[
              { value: 'ALL', label: `Semua Pesan (${messages?.length || 0})` },
              { value: 'PUBLIC', label: `Publik (${publicCount})` },
              { value: 'INTERNAL', label: `Internal (${internalCount})` },
            ]}
          />
        </div>
      </div>

      <div className="bg-slate-50/70 rounded-xl border border-slate-200 p-4 sm:p-6 max-h-[480px] min-h-[220px] overflow-y-auto space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-3/4 rounded-xl" />
            <Skeleton className="h-16 w-3/4 rounded-xl ml-auto" />
            <Skeleton className="h-16 w-3/4 rounded-xl" />
          </div>
        ) : filteredMessages.length === 0 ? (
          <EmptyState
            title="Belum Ada Pesan"
            description="Mulai percakapan dengan mengirimkan balasan publik ke pemohon atau simpan catatan internal tim."
          />
        ) : (
          filteredMessages.map((msg) => {
            const isInternal = msg.visibility === 'INTERNAL';
            const isApplicant = msg.sender_type === 'PUBLIC_APPLICANT';

            return (
              <div
                key={msg.id}
                className={`p-4 rounded-xl border transition-all ${
                  isInternal
                    ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                    : isApplicant
                    ? 'bg-[#CAF3E4]/40 border-[#98F7D9] text-slate-900 ml-4 sm:ml-8'
                    : 'bg-white border-slate-200 text-slate-900 mr-4 sm:mr-8 shadow-sm'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-black/5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs">
                      {msg.sender_name || 'Petugas'}
                    </span>
                    <Badge
                      variant={
                        isInternal
                          ? 'warning'
                          : isApplicant
                          ? 'primary'
                          : 'neutral'
                      }
                      className="text-[10px]"
                    >
                      {isInternal
                        ? '🔒 Catatan Internal'
                        : isApplicant
                        ? 'Pemohon OPD'
                        : 'Balasan Publik'}
                    </Badge>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">
                    {formatDateTime(msg.created_at)}
                  </span>
                </div>

                <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.message}
                </p>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSend} className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold text-xs text-slate-700">Tipe Pesan yang Dikirim:</span>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="msgVisibility"
                checked={targetVisibility === 'PUBLIC'}
                onChange={() => setTargetVisibility('PUBLIC')}
                className="text-[#1B5040] focus:ring-[#1B5040]"
              />
              <span className="text-[#1B5040] font-bold">
                Balasan Publik (Dikirim ke Pemohon + Notifikasi)
              </span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="msgVisibility"
                checked={targetVisibility === 'INTERNAL'}
                onChange={() => setTargetVisibility('INTERNAL')}
                className="text-amber-600 focus:ring-amber-500"
              />
              <span className="text-amber-700 font-bold">
                🔒 Catatan Internal (Khusus Tim Teknis Diskominfo)
              </span>
            </label>
          </div>
        </div>

        <Textarea
          rows={3}
          placeholder={
            targetVisibility === 'PUBLIC'
              ? 'Ketik tanggapan resmi atau pertanyaan klarifikasi untuk pemohon OPD...'
              : 'Ketik catatan teknis internal (database, credential, temuan arsitektur yang tidak boleh dilihat publik)...'
          }
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          disabled={sendMutation.isPending}
          className="text-xs sm:text-sm bg-white"
        />

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-slate-400">
            {targetVisibility === 'PUBLIC'
              ? 'Pesan publik akan langsung tampil di portal tracking pemohon.'
              : 'Catatan internal terisolasi dan tidak dapat diakses oleh publik.'}
          </span>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            className={targetVisibility === 'INTERNAL' ? '!bg-amber-600 hover:!bg-amber-700 !border-amber-600 text-white' : ''}
            disabled={sendMutation.isPending || !messageInput.trim()}
          >
            {sendMutation.isPending
              ? 'Mengirim...'
              : targetVisibility === 'PUBLIC'
              ? 'Kirim Balasan Publik'
              : 'Simpan Catatan Internal'}
          </Button>
        </div>
      </form>
    </div>
  );
}
