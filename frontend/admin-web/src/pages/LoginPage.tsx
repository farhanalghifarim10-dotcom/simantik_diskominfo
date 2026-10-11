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
  EyeIcon,
  EyeOffIcon,
  FormErrorMessage,
  FormLabel,
  LogoHierarchy,
  Text,
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

  // If already authenticated, redirect to destination or home
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
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-7 sm:p-9 shadow-sm space-y-6">
          {/* Header Identitas Kelembagaan */}
          <div className="space-y-4">
            <LogoHierarchy layout="compact" />
            <div className="pt-2 border-t border-slate-100">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                Masuk Web Admin
              </h1>
              <Text variant="muted" className="mt-1">
                Portal Internal Diskominfo Pemerintah Daerah Kabupaten Bandung
              </Text>
            </div>
          </div>

          {serverError && (
            <Alert variant="danger" title="Otentikasi Gagal">
              {serverError}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4.5" noValidate>
            <div>
              <FormLabel htmlFor="email" required>
                Email Kedinasan
              </FormLabel>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="nama@bandungkab.go.id"
                disabled={isLoading}
                aria-invalid={Boolean(errors.email)}
                {...register('email')}
                className={`w-full h-10 rounded-md border bg-white px-3.5 text-sm text-slate-900 transition-colors duration-150 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  errors.email
                    ? 'border-red-500 focus-visible:outline-red-600'
                    : 'border-slate-300 hover:border-slate-400 focus-visible:outline-slate-900'
                }`}
              />
              {errors.email?.message && (
                <FormErrorMessage>{errors.email.message}</FormErrorMessage>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <FormLabel htmlFor="password" required className="mb-0">
                  Kata Sandi
                </FormLabel>
              </div>

              <div className="relative flex items-center">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi akun"
                  disabled={isLoading}
                  aria-invalid={Boolean(errors.password)}
                  {...register('password')}
                  className={`w-full h-10 rounded-md border bg-white px-3.5 pr-10 text-sm text-slate-900 transition-colors duration-150 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    errors.password
                      ? 'border-red-500 focus-visible:outline-red-600'
                      : 'border-slate-300 hover:border-slate-400 focus-visible:outline-slate-900'
                  }`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                  className="absolute right-3 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer p-0.5"
                >
                  {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                </button>
              </div>

              {errors.password?.message && (
                <FormErrorMessage>{errors.password.message}</FormErrorMessage>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              Masuk ke Sistem
            </Button>
          </form>

          {/* Security Notice */}
          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 leading-normal">
              Akses terbatas hanya untuk pejabat dan staf teknis yang berwenang di lingkungan Diskominfo Kab. Bandung. Setiap aktivitas tercatat dalam sistem audit.
            </p>
          </div>
        </div>
      </motion.div>
    </main>
  );
}