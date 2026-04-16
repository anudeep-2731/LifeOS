/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary
        'primary':                   '#005da7',
        'on-primary':                '#ffffff',
        'primary-container':         '#2976c7',
        'on-primary-container':      '#fdfcff',
        'primary-fixed':             '#d4e3ff',
        'primary-fixed-dim':         '#a4c9ff',
        'on-primary-fixed':          '#001c39',
        'on-primary-fixed-variant':  '#004883',
        'inverse-primary':           '#a4c9ff',
        // Secondary
        'secondary':                 '#006d36',
        'on-secondary':              '#ffffff',
        'secondary-container':       '#83fba5',
        'on-secondary-container':    '#00743a',
        'secondary-fixed':           '#83fba5',
        'secondary-fixed-dim':       '#66dd8b',
        'on-secondary-fixed':        '#00210c',
        'on-secondary-fixed-variant':'#005227',
        // Tertiary
        'tertiary':                  '#765700',
        'on-tertiary':               '#ffffff',
        'tertiary-container':        '#956e00',
        'on-tertiary-container':     '#fffbff',
        'tertiary-fixed':            '#ffdfa0',
        'tertiary-fixed-dim':        '#fbbc00',
        'on-tertiary-fixed':         '#261a00',
        'on-tertiary-fixed-variant': '#5c4300',
        // Error
        'error':                     '#ba1a1a',
        'on-error':                  '#ffffff',
        'error-container':           '#ffdad6',
        'on-error-container':        '#93000a',
        // Surface
        'surface':                   '#f8f9ff',
        'on-surface':                '#191c21',
        'on-surface-variant':        '#414751',
        'surface-dim':               '#d8dae1',
        'surface-bright':            '#f8f9ff',
        'surface-tint':              '#0060ac',
        'surface-variant':           '#e1e2e9',
        'surface-container-lowest':  '#ffffff',
        'surface-container-low':     '#f2f3fb',
        'surface-container':         '#ecedf5',
        'surface-container-high':    '#e6e8ef',
        'surface-container-highest': '#e1e2e9',
        // Outline
        'outline':                   '#717783',
        'outline-variant':           '#c1c7d3',
        // Inverse
        'inverse-surface':           '#2e3036',
        'inverse-on-surface':        '#eff0f8',
        // Background
        'background':                '#f8f9ff',
        'on-background':             '#191c21',
      },
      borderRadius: {
        DEFAULT: '1rem',
        lg:      '2rem',
        xl:      '3rem',
        full:    '9999px',
      },
      fontFamily: {
        headline: ['"Plus Jakarta Sans"', 'sans-serif'],
        body:     ['Inter', 'system-ui', 'sans-serif'],
        label:    ['Inter', 'system-ui', 'sans-serif'],
        // Keep old aliases for backwards compat with any remaining uses
        display:  ['"Plus Jakarta Sans"', 'sans-serif'],
        sans:     ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glass':    '0 12px 32px rgba(0, 93, 167, 0.08)',
        'card':     '0 12px 32px rgba(0, 93, 167, 0.06)',
        'nav':      '0 -12px 32px rgba(0, 93, 167, 0.08)',
        'gradient': '0 4px 16px rgba(0, 93, 167, 0.20)',
      },
    },
  },
  plugins: [],
}
