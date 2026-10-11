export default () => ({
    port: Number.parseInt(process.env.PORT ?? '3000', 10),

    corsOrigins: (process.env.CORS_ORIGINS ?? '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),

    supabase: {
        url: process.env.SUPABASE_URL,
        secretKey: process.env.SUPABASE_SECRET_KEY,
    },

    email: {
        resendApiKey: process.env.RESEND_API_KEY,
        fromEmail:
            process.env.RESEND_FROM_EMAIL ??
            'SIMANTIK Diskominfo <noreply@simantik.bandungkab.go.id>',
    },
});