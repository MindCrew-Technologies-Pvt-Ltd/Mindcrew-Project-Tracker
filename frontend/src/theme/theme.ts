import { createTheme, alpha } from '@mui/material/styles';

// ── Modern palette ────────────────────────────────────────────────────────────
const INDIGO = '#4F46E5';        // primary
const INDIGO_LIGHT = '#6366F1';
const INDIGO_DARK = '#4338CA';
const INK = '#0F1729';           // dark sidebar / strong surfaces
const PAGE_BG = '#F5F6FB';       // app background (cool off-white)
const CARD_BG = '#FFFFFF';
const TEXT = '#1E293B';          // slate-800
const TEXT_SEC = '#64748B';      // slate-500
const BORDER = '#E9EBF2';
const SURFACE_TINT = '#EEF0FF';  // indigo-50 (chips, subtle fills)

const theme = createTheme({
  palette: {
    primary: { main: INDIGO, light: INDIGO_LIGHT, dark: INDIGO_DARK, contrastText: '#FFFFFF' },
    secondary: { main: '#7C3AED', light: '#A78BFA', dark: '#6D28D9', contrastText: '#FFFFFF' },
    error: { main: '#DC2626' },
    warning: { main: '#D97706' },
    success: { main: '#16A34A' },
    info: { main: '#2563EB' },
    background: { default: PAGE_BG, paper: CARD_BG },
    text: { primary: TEXT, secondary: TEXT_SEC, disabled: '#94A3B8' },
    divider: BORDER,
  },

  typography: {
    fontFamily: '"Inter", "Plus Jakarta Sans", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, color: TEXT, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, color: TEXT, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, color: TEXT, letterSpacing: '-0.02em' },
    h4: { fontWeight: 700, color: TEXT, letterSpacing: '-0.015em' },
    h5: { fontWeight: 700, color: TEXT, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600, color: TEXT },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 600 },
    body1: { fontSize: '0.9375rem' },
    body2: { fontSize: '0.875rem' },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
    caption: { fontSize: '0.75rem', color: TEXT_SEC },
  },

  shape: { borderRadius: 12 },

  shadows: [
    'none',
    '0 1px 2px rgba(15,23,41,0.06)',
    '0 2px 8px rgba(15,23,41,0.06), 0 1px 2px rgba(15,23,41,0.04)',
    '0 6px 16px rgba(15,23,41,0.08), 0 2px 6px rgba(15,23,41,0.04)',
    '0 10px 24px rgba(15,23,41,0.10)',
    '0 14px 32px rgba(15,23,41,0.12)',
    '0 18px 40px rgba(15,23,41,0.14)',
    '0 22px 48px rgba(15,23,41,0.16)',
    '0 26px 56px rgba(15,23,41,0.18)',
    '0 30px 64px rgba(15,23,41,0.20)',
    '0 34px 72px rgba(15,23,41,0.22)',
    '0 38px 80px rgba(15,23,41,0.24)',
    '0 42px 88px rgba(15,23,41,0.26)',
    '0 46px 96px rgba(15,23,41,0.28)',
    '0 50px 104px rgba(15,23,41,0.30)',
    '0 54px 112px rgba(15,23,41,0.32)',
    '0 58px 120px rgba(15,23,41,0.34)',
    '0 62px 128px rgba(15,23,41,0.36)',
    '0 66px 136px rgba(15,23,41,0.38)',
    '0 70px 144px rgba(15,23,41,0.40)',
    '0 74px 152px rgba(15,23,41,0.42)',
    '0 78px 160px rgba(15,23,41,0.44)',
    '0 82px 168px rgba(15,23,41,0.46)',
    '0 86px 176px rgba(15,23,41,0.48)',
    '0 90px 184px rgba(15,23,41,0.50)',
  ] as any,

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*': { boxSizing: 'border-box' },
        body: { backgroundColor: PAGE_BG, color: TEXT },
        '::-webkit-scrollbar': { width: 8, height: 8 },
        '::-webkit-scrollbar-track': { background: 'transparent' },
        '::-webkit-scrollbar-thumb': { background: '#CBD2E0', borderRadius: 8 },
        '::-webkit-scrollbar-thumb:hover': { background: '#AEB7C9' },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 1px 2px rgba(15,23,41,0.04), 0 4px 16px rgba(15,23,41,0.05)',
          border: `1px solid ${BORDER}`,
          transition: 'box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease',
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 16, backgroundImage: 'none' },
        outlined: { borderColor: BORDER },
      },
    },

    MuiDrawer: { styleOverrides: { paper: { borderRadius: 0, border: 'none' } } },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 600,
          padding: '8px 18px',
          transition: 'all 0.18s ease',
          '&:active': { transform: 'scale(0.98)' },
        },
        // Disabled contained buttons: flat grey with white text (the gradients
        // below would otherwise persist and make disabled look enabled).
        contained: {
          '&.Mui-disabled': { background: '#9CA3AF', color: '#FFFFFF', boxShadow: 'none' },
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${INDIGO} 0%, ${INDIGO_LIGHT} 100%)`,
          color: '#FFFFFF',
          boxShadow: '0 4px 14px rgba(79,70,229,0.35)',
          '&:hover': { boxShadow: '0 6px 20px rgba(79,70,229,0.45)', transform: 'translateY(-1px)' },
          '&.Mui-disabled': { background: '#9CA3AF', color: '#FFFFFF', boxShadow: 'none' },
        },
        containedSecondary: {
          background: `linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)`,
          '&:hover': { boxShadow: '0 6px 20px rgba(124,58,237,0.4)' },
          '&.Mui-disabled': { background: '#9CA3AF', color: '#FFFFFF', boxShadow: 'none' },
        },
        outlinedPrimary: {
          borderColor: alpha(INDIGO, 0.4),
          color: INDIGO,
          '&:hover': { background: alpha(INDIGO, 0.05), borderColor: INDIGO },
        },
        textPrimary: { color: INDIGO, '&:hover': { background: alpha(INDIGO, 0.06) } },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition: 'all 0.18s ease',
          '&:hover': { background: alpha(INDIGO, 0.08) },
          '&:active': { transform: 'scale(0.94)' },
        },
      },
    },

    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            background: '#FBFCFE',
            transition: 'box-shadow 0.2s ease, background 0.2s ease',
            '& fieldset': { borderColor: '#DDE1EC' },
            '&:hover fieldset': { borderColor: '#B7BFD2' },
            '&:hover': { background: '#FFFFFF' },
            '&.Mui-focused': { background: '#FFFFFF', boxShadow: `0 0 0 4px ${alpha(INDIGO, 0.12)}` },
            '&.Mui-focused fieldset': { borderColor: INDIGO, borderWidth: 1.5 },
          },
          '& .MuiInputLabel-root.Mui-focused': { color: INDIGO },
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#DDE1EC' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#B7BFD2' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: INDIGO },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          fontSize: '0.75rem',
          '&.MuiChip-filledDefault': { background: SURFACE_TINT, color: INDIGO_DARK },
        },
        outlined: { borderColor: BORDER },
      },
    },

    MuiTableContainer: {
      styleOverrides: {
        root: { borderRadius: 14, border: `1px solid ${BORDER}` },
      },
    },

    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            background: '#F8F9FE',
            color: TEXT_SEC,
            fontWeight: 700,
            fontSize: '0.72rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            borderBottom: `1px solid ${BORDER}`,
          },
        },
      },
    },

    MuiTableCell: { styleOverrides: { root: { borderBottom: `1px solid ${BORDER}` } } },

    MuiTableRow: {
      styleOverrides: {
        root: { transition: 'background 0.15s ease', '&:hover': { background: '#F8F9FE !important' } },
      },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: { borderRadius: 10, transition: 'all 0.18s ease', '&:active': { transform: 'scale(0.99)' } },
      },
    },

    MuiTabs: {
      styleOverrides: { indicator: { height: 3, borderRadius: 3, background: INDIGO } },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          transition: 'color 0.2s ease',
          '&.Mui-selected': { fontWeight: 700, color: INDIGO },
        },
      },
    },

    MuiAppBar: {
      styleOverrides: {
        root: {
          background: alpha('#FFFFFF', 0.8),
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${BORDER}`,
          boxShadow: 'none',
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: { background: INK, color: '#FFFFFF', fontSize: '0.75rem', borderRadius: 8, padding: '6px 12px' },
        arrow: { color: INK },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 12, fontWeight: 500 },
        standardSuccess: { background: '#E9F9EF' },
        standardError: { background: '#FDECEC' },
        standardInfo: { background: '#E8F0FE' },
        standardWarning: { background: '#FEF3E2' },
      },
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 6, height: 8, background: SURFACE_TINT },
        bar: { borderRadius: 6 },
      },
    },

    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 20, boxShadow: '0 30px 80px rgba(15,23,41,0.25)' } },
    },

    MuiBadge: { styleOverrides: { badge: { fontWeight: 700, fontSize: '0.65rem' } } },

    MuiMenu: {
      styleOverrides: {
        paper: { borderRadius: 14, boxShadow: '0 12px 40px rgba(15,23,41,0.16)', border: `1px solid ${BORDER}`, marginTop: 6 },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 6px',
          transition: 'all 0.15s ease',
          '&:hover': { background: alpha(INDIGO, 0.06) },
          '&.Mui-selected': { background: alpha(INDIGO, 0.1) },
        },
      },
    },

    MuiDivider: { styleOverrides: { root: { borderColor: BORDER } } },

    MuiAvatar: {
      styleOverrides: {
        root: { fontWeight: 600 },
        colorDefault: { background: `linear-gradient(135deg, ${INDIGO} 0%, ${INDIGO_LIGHT} 100%)`, color: '#FFFFFF' },
      },
    },
  },
});

// Shared palette tokens for components that style outside MUI (sidebar, charts…).
export const PALETTE = {
  indigo: INDIGO,
  indigoLight: INDIGO_LIGHT,
  indigoDark: INDIGO_DARK,
  ink: INK,
  pageBg: PAGE_BG,
  card: CARD_BG,
  text: TEXT,
  textSec: TEXT_SEC,
  border: BORDER,
  surfaceTint: SURFACE_TINT,
  chartColors: ['#4F46E5', '#7C3AED', '#0EA5E9', '#16A34A', '#F59E0B', '#EC4899', '#14B8A6'],
};

// Back-compat named exports (older code imported these).
export const NAVY = INK;
export const SAND = INDIGO;
export const TERRACOTTA = '#7C3AED';
export const SAGE = BORDER;
export const GREEN = '#16A34A';

export default theme;
