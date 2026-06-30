import { createTheme, alpha } from '@mui/material/styles';

const NAVY = '#0A2947';
const SAND = '#F3E4C9';
const TERRACOTTA = '#8B5E3C';
const SAGE = '#D3D4C0';
const GREEN = '#4D7C5A';
const PAGE_BG = '#FAFAF8';
const CARD_BG = '#FFFFFF';

const theme = createTheme({
  palette: {
    primary: {
      main: NAVY,
      light: '#355F86',
      dark: '#061A2D',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: SAND,
      light: '#FCFBF2',
      dark: '#EAD6B0',
      contrastText: NAVY,
    },
    error: { main: '#B54747' },
    warning: { main: '#C4934D' },
    success: { main: GREEN },
    info: { main: '#355F86' },
    background: {
      default: PAGE_BG,
      paper: CARD_BG,
    },
    text: {
      primary: NAVY,
      secondary: '#5F6570',
      disabled: '#B0B4BA',
    },
    divider: '#E7E8DD',
  },

  typography: {
    fontFamily: '"Inter", "Plus Jakarta Sans", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, color: NAVY },
    h2: { fontWeight: 700, color: NAVY },
    h3: { fontWeight: 700, color: NAVY },
    h4: { fontWeight: 700, color: NAVY },
    h5: { fontWeight: 600, color: NAVY },
    h6: { fontWeight: 600, color: NAVY },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 600 },
    body1: { fontSize: '0.9375rem' },
    body2: { fontSize: '0.875rem' },
    button: { textTransform: 'none', fontWeight: 500, letterSpacing: 0.2 },
    caption: { fontSize: '0.75rem', color: '#5F6570' },
  },

  shape: { borderRadius: 10 },

  shadows: [
    'none',
    '0 1px 3px rgba(10,41,71,0.06), 0 1px 2px rgba(10,41,71,0.04)',
    '0 2px 8px rgba(10,41,71,0.08), 0 1px 3px rgba(10,41,71,0.04)',
    '0 4px 16px rgba(10,41,71,0.1), 0 2px 6px rgba(10,41,71,0.06)',
    '0 8px 24px rgba(10,41,71,0.12)',
    '0 12px 32px rgba(10,41,71,0.14)',
    '0 16px 40px rgba(10,41,71,0.16)',
    '0 20px 48px rgba(10,41,71,0.18)',
    '0 24px 56px rgba(10,41,71,0.2)',
    '0 28px 64px rgba(10,41,71,0.22)',
    '0 32px 72px rgba(10,41,71,0.24)',
    '0 36px 80px rgba(10,41,71,0.26)',
    '0 40px 88px rgba(10,41,71,0.28)',
    '0 44px 96px rgba(10,41,71,0.30)',
    '0 48px 104px rgba(10,41,71,0.32)',
    '0 52px 112px rgba(10,41,71,0.34)',
    '0 56px 120px rgba(10,41,71,0.36)',
    '0 60px 128px rgba(10,41,71,0.38)',
    '0 64px 136px rgba(10,41,71,0.40)',
    '0 68px 144px rgba(10,41,71,0.42)',
    '0 72px 152px rgba(10,41,71,0.44)',
    '0 76px 160px rgba(10,41,71,0.46)',
    '0 80px 168px rgba(10,41,71,0.48)',
    '0 84px 176px rgba(10,41,71,0.50)',
    '0 88px 184px rgba(10,41,71,0.52)',
  ] as any,

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*': { boxSizing: 'border-box' },
        body: { backgroundColor: PAGE_BG, color: NAVY },
        '::-webkit-scrollbar': { width: 6, height: 6 },
        '::-webkit-scrollbar-track': { background: '#F3F4EF' },
        '::-webkit-scrollbar-thumb': { background: SAGE, borderRadius: 4 },
        '::-webkit-scrollbar-thumb:hover': { background: '#96977C' },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 8px rgba(10,41,71,0.08)',
          border: '1px solid #E7E8DD',
          transition: 'box-shadow 0.25s ease, transform 0.25s ease',
          '&:hover': {
            boxShadow: '0 8px 24px rgba(10,41,71,0.12)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundImage: 'none',
        },
      },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 500,
          padding: '8px 20px',
          transition: 'all 0.2s ease',
          '&:active': { transform: 'scale(0.97)' },
        },
        containedPrimary: {
          background: NAVY,
          color: '#FFFFFF',
          boxShadow: '0 2px 8px rgba(10,41,71,0.25)',
          '&:hover': {
            background: '#08213A',
            boxShadow: '0 4px 16px rgba(10,41,71,0.35)',
            transform: 'translateY(-1px)',
          },
        },
        containedSecondary: {
          background: SAND,
          color: NAVY,
          '&:hover': { background: '#EAD6B0' },
        },
        outlinedPrimary: {
          borderColor: NAVY,
          color: NAVY,
          '&:hover': { background: alpha(NAVY, 0.05), borderColor: '#08213A' },
        },
        textPrimary: {
          color: NAVY,
          '&:hover': { background: alpha(NAVY, 0.06) },
        },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s ease',
          '&:hover': { background: alpha(NAVY, 0.08), transform: 'scale(1.08)' },
          '&:active': { transform: 'scale(0.95)' },
        },
      },
    },

    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            background: CARD_BG,
            transition: 'box-shadow 0.2s ease',
            '& fieldset': { borderColor: '#D3D4C0' },
            '&:hover fieldset': { borderColor: '#96977C' },
            '&.Mui-focused fieldset': { borderColor: NAVY, borderWidth: 2 },
            '&.Mui-focused': { boxShadow: `0 0 0 3px ${alpha(NAVY, 0.1)}` },
          },
          '& .MuiInputLabel-root.Mui-focused': { color: NAVY },
        },
      },
    },

    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#D3D4C0' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#96977C' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: NAVY },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
          fontSize: '0.75rem',
          transition: 'all 0.2s ease',
        },
      },
    },

    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            background: '#F3F4EF',
            color: NAVY,
            fontWeight: 600,
            fontSize: '0.8rem',
            letterSpacing: '0.03em',
            borderBottom: `2px solid ${SAGE}`,
          },
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background 0.15s ease',
          '&:hover': { background: '#FAFAF8 !important' },
        },
      },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition: 'all 0.2s ease',
          '&:active': { transform: 'scale(0.98)' },
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        indicator: { height: 3, borderRadius: 2, background: NAVY },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          transition: 'color 0.2s ease',
          '&.Mui-selected': { fontWeight: 600, color: NAVY },
        },
      },
    },

    MuiAppBar: {
      styleOverrides: {
        root: {
          background: CARD_BG,
          borderBottom: `1px solid #E7E8DD`,
          boxShadow: '0 1px 4px rgba(10,41,71,0.06)',
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          background: NAVY,
          color: '#FFFFFF',
          fontSize: '0.75rem',
          borderRadius: 6,
          padding: '6px 12px',
        },
        arrow: { color: NAVY },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4, height: 6 },
        bar: { borderRadius: 4 },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 20, boxShadow: '0 24px 64px rgba(10,41,71,0.18)' },
      },
    },

    MuiBadge: {
      styleOverrides: {
        badge: { fontWeight: 600, fontSize: '0.65rem' },
      },
    },

    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(10,41,71,0.15)',
          border: '1px solid #E7E8DD',
        },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 6px',
          transition: 'all 0.15s ease',
          '&:hover': { background: alpha(NAVY, 0.06) },
        },
      },
    },

    MuiDivider: {
      styleOverrides: {
        root: { borderColor: '#E7E8DD' },
      },
    },

    MuiAvatar: {
      styleOverrides: {
        root: { fontWeight: 600 },
        colorDefault: { background: NAVY, color: '#FFFFFF' },
      },
    },
  },
});

export { NAVY, SAND, TERRACOTTA, SAGE, GREEN };
export default theme;
