import { Box, Typography, Breadcrumbs, Link } from '@mui/material';
import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface Breadcrumb { label: string; href?: string; }
interface Props { title: string; subtitle?: string; action?: ReactNode; breadcrumbs?: Breadcrumb[]; }

const PageHeader = ({ title, subtitle, action, breadcrumbs }: Props) => {
  const navigate = useNavigate();
  return (
    <Box sx={{ mb: 3 }}>
      {breadcrumbs && (
        <Breadcrumbs sx={{ mb: 1 }}>
          {breadcrumbs.map((b, i) =>
            b.href ? (
              <Link key={i} underline="hover" color="inherit" sx={{ cursor: 'pointer', fontSize: 13 }} onClick={() => navigate(b.href!)}>
                {b.label}
              </Link>
            ) : (
              <Typography key={i} color="text.primary" sx={{ fontSize: 13 }}>{b.label}</Typography>
            )
          )}
        </Breadcrumbs>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>{title}</Typography>
          {subtitle && <Typography variant="body2" color="text.secondary" mt={0.5}>{subtitle}</Typography>}
        </Box>
        {action && <Box>{action}</Box>}
      </Box>
    </Box>
  );
};

export default PageHeader;
