// @ts-ignore
import colors from 'tailwindcss/colors';

export default {
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx,vue}',
        './node_modules/openbim-components/**/*.{js,ts,jsx,tsx}',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                default: {
                    darkest: '#0a0f1a',
                    dark: 'rgb(20 33 61 / <alpha-value>)',
                    medium: colors.slate[200],
                    light: colors.slate[50],
                    contrast: '#FCA311',
                },
                accent: {
                    DEFAULT: 'rgb(252 163 17 / <alpha-value>)',
                    foreground: '#14213D',
                },
                primary: {
                    DEFAULT: 'rgb(20 33 61 / <alpha-value>)',
                    foreground: '#F8FAFC',
                },
                surface: {
                    DEFAULT: '#FFFFFF',
                    elevated: '#F8FAFC',
                    muted: '#F1F5F9',
                },
                success: colors.emerald[600],
                'ease-blue': colors.blue[600],
                danger: colors.red[600],
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            borderRadius: {
                DEFAULT: '0.5rem',
                lg: '0.625rem',
                xl: '0.875rem',
            },
            boxShadow: {
                panel: '0 4px 24px -4px rgb(0 0 0 / 0.12), 0 2px 8px -2px rgb(0 0 0 / 0.08)',
                soft: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
            },
        },
    },
    plugins: [],
};
