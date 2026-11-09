import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { useAuth } from '../features/auth/useAuth';
import {
  Alert,
  Button,
  DiskominfoLogo,
  EyeIcon,
  EyeOffIcon,
  FormErrorMessage,
  LockIcon,
  PemkabBandungLogo,
  ShieldCheckIcon,
  SimantikLogo,
  UserIcon,
} from '../components/ui';

const loginSchema = z.object({
  email: z.string().min(1, 'Email wajib diisi.').email('Format email tidak valid.'),
  password: z.string().min(1, 'Password wajib diisi.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, location, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError('');
    setIsLoading(true);

    try {
      await login(values.email, values.password);
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message === 'Invalid login credentials'
            ? 'Email atau kata sandi tidak sesuai. Silakan periksa kembali.'
            : error.message
          : 'Gagal melakukan otentikasi. Silakan periksa koneksi internet Anda.';
      setServerError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-[100dvh] w-full flex flex-col lg:flex-row bg-[#F5F5F5] overflow-x-hidden">
      <section className="relative w-full lg:w-[38%] xl:w-[36%] shrink-0 min-h-[260px] lg:min-h-[100dvh] bg-cover bg-center overflow-hidden flex flex-col justify-between">
        <motion.div
          initial={{ scale: 1.08, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/assets/backgrounds/admin-login-teal.png')",
          }}
          aria-hidden="true"
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 bg-gradient-to-b from-white/35 via-white/10 to-[#0D2820]/30 pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col justify-between h-full p-6 sm:p-8 lg:p-12 xl:p-14 space-y-8 lg:space-y-0">
          <div className="space-y-6 sm:space-y-8">
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-3.5 sm:gap-4"
            >
              <PemkabBandungLogo
                size={40}
                title="Pemerintah Daerah Kabupaten Bandung"
                className="drop-shadow-xs"
              />
              <DiskominfoLogo
                size={40}
                title="Dinas Komunikasi dan Informatika"
                className="drop-shadow-xs"
              />
              <SimantikLogo
                size={42}
                variant="emblem"
                title="SIMANTIK"
                className="drop-shadow-xs"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-2"
            >
              <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-black tracking-tight leading-[1.18] text-[#000408]">
                Diskominfo <br />
                <span className="text-[#1B5040]">Kabupaten Bandung</span>
              </h1>
              <div className="text-xs sm:text-sm leading-relaxed">
                <p className="text-[#1B5040] font-bold">Portal Internal Diskominfo</p>
                <p className="text-slate-700 font-medium">Pemerintah Daerah Kabupaten Bandung</p>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.38, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="pt-4 lg:pt-0"
          >
            <div className="bg-white/85 backdrop-blur-md border border-white/70 rounded-2xl p-4 sm:p-5 shadow-lg shadow-teal-950/5 flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-[#CAF3E4]/70 text-[#1B5040] border border-[#98F7D9] shrink-0">
                <ShieldCheckIcon size={22} className="text-[#1B5040]" />
              </div>
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-slate-900">
                  Akses Terbatas
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Hanya untuk pejabat dan staf teknis yang berwenang di lingkungan Diskominfo Kab. Bandung.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-14 xl:p-16 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md mx-auto"
        >
          <div className="text-center mb-7 sm:mb-8">
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.35 }}
              className="text-xs sm:text-sm font-bold tracking-wider text-[#2E8A6E] uppercase"
            >
              Selamat Datang
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.4 }}
              className="text-2xl sm:text-3xl lg:text-[32px] font-black tracking-tight text-[#000408] mt-1.5"
            >
              Masuk <span className="text-[#1B5040]">Web Admin</span>
            </motion.h2>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.28, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="w-12 h-1 bg-[#1B5040] rounded-full mx-auto mt-3 origin-center"
              aria-hidden="true"
            />
          </div>

          {serverError && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6"
            >
              <Alert variant="danger" title="Otentikasi Gagal">
                {serverError}
              </Alert>
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <label
                htmlFor="email"
                className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2"
              >
                EMAIL KEDINASAN <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center justify-center">
                  <UserIcon size={18} />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nama@bandungkab.go.id"
                  disabled={isLoading}
                  aria-invalid={Boolean(errors.email)}
                  {...register('email')}
                  className={`w-full h-11 sm:h-12 rounded-xl border bg-white pl-10 pr-4 text-sm text-slate-900 transition-colors duration-150 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-1 ${
                    errors.email
                      ? 'border-red-500 focus-visible:outline-red-600'
                      : 'border-slate-300 hover:border-slate-400 focus-visible:outline-[#1B5040]'
                  }`}
                />
              </div>
              {errors.email?.message && (
                <FormErrorMessage>{errors.email.message}</FormErrorMessage>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.4 }}
            >
              <label
                htmlFor="password"
                className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2"
              >
                KATA SANDI <span className="text-red-500">*</span>
              </label>

              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center justify-center">
                  <LockIcon size={18} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi akun"
                  disabled={isLoading}
                  aria-invalid={Boolean(errors.password)}
                  {...register('password')}
                  className={`w-full h-11 sm:h-12 rounded-xl border bg-white pl-10 pr-11 text-sm text-slate-900 transition-colors duration-150 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-1 ${
                    errors.password
                      ? 'border-red-500 focus-visible:outline-red-600'
                      : 'border-slate-300 hover:border-slate-400 focus-visible:outline-[#1B5040]'
                  }`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer p-1"
                >
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>

              {errors.password?.message && (
                <FormErrorMessage>{errors.password.message}</FormErrorMessage>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
            >
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full h-11 sm:h-12 rounded-xl text-sm font-bold bg-[#1B5040] hover:bg-[#2E8A6E] text-white shadow-xs transition-all flex items-center justify-center gap-2 mt-2"
                isLoading={isLoading}
              >
                <LockIcon size={17} className="text-white shrink-0" />
                <span>Masuk ke Sistem</span>
              </Button>
            </motion.div>
          </form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center text-center space-y-2.5"
          >
            <div className="w-6 h-6 rounded-full bg-[#CAF3E4] text-[#1B5040] flex items-center justify-center border border-[#98F7D9]">
              <ShieldCheckIcon size={14} />
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed max-w-sm">
              Akses terbatas hanya untuk pejabat dan staf teknis yang berwenang di lingkungan Diskominfo Kab. Bandung. Setiap aktivitas tercatat dalam sistem audit.
            </p>
          </motion.div>
        </motion.div>
      </section>
    </main>
  );
}