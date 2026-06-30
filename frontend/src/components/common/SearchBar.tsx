import { TextField, InputAdornment } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

interface Props { value: string; onChange: (v: string) => void; placeholder?: string; fullWidth?: boolean; }

const SearchBar = ({ value, onChange, placeholder = 'Search...', fullWidth = false }: Props) => (
  <TextField
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    size="small"
    fullWidth={fullWidth}
    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
    sx={{ bgcolor: 'background.paper' }}
  />
);

export default SearchBar;
