import colors from 'tailwindcss/colors';

export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,vue}'],
    theme: {
        extend: {
            colors: {
                default: {
                    overlay: colors.neutral[100],
                    light: colors.neutral[300],
                    contrast: colors.gray[300],
                    dark: colors.gray[500],
                },
                success: colors.green[500],
                'ease-blue': colors.blue[600],
                primary: colors.white,
                secondary: colors.black,
                danger: colors.red[600],
            },
        },
    },
    plugins: [],
};
