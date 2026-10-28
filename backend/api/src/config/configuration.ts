export default () => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.trim().length < 32) {
        throw new Error(
            'Konfigurasi JWT_SECRET tidak valid: JWT_SECRET wajib diatur via environment variable dengan panjang minimal 32 karakter.',
        );
    }

    return {
        port: Number.parseInt(process.env.PORT ?? '3000', 10),

        corsOrigins: (process.env.CORS_ORIGINS ?? '')
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean),

        supabase: {
            url: process.env.SUPABASE_URL,
            secretKey: process.env.SUPABASE_SECRET_KEY,
        },

        jwt: {
            secret: jwtSecret.trim(),
        },

        email: {
            resendApiKey: process.env.RESEND_API_KEY,
            fromEmail:
                process.env.RESEND_FROM_EMAIL ??
                'SIMANTIK Diskominfo <noreply@simantik.bandungkab.go.id>',
        },

        trustProxy:
            process.env.TRUST_PROXY === 'true' ||
            process.env.TRUST_PROXY === '1',
    };
};