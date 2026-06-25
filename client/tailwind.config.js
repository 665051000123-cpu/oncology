/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Noto Sans Thai"', 'sans-serif'],
            },
            animation: {
                'pop': 'popIn 0.4s ease-out forwards',
                'row-in': 'rowSlideIn 0.5s ease-out forwards',
            },
            keyframes: {
                popIn: {
                    '0%': { transform: 'scale(0.9)', opacity: '0' },
                    '70%': { transform: 'scale(1.05)' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                rowSlideIn: {
                    '0%': { transform: 'translateY(10px)', opacity: '0', backgroundColor: 'rgba(16, 185, 129, 0.2)' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
            },
        },
    },
    plugins: [],
    darkMode: 'class',
}
