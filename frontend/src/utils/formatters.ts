import dayjs from 'dayjs';

export const formatDate = (date?: string | null) => {
  if (!date) return '';
  const d = dayjs(date);
  return d.isValid() ? d.format('MMM DD, YYYY') : '';
};
export const formatDateTime = (date?: string | null) => {
  if (!date) return '';
  const d = dayjs(date);
  return d.isValid() ? d.format('MMM DD, YYYY HH:mm') : '';
};
export const formatRelative = (date: string) => {
  const diff = dayjs().diff(dayjs(date), 'day');
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  return formatDate(date);
};

export const truncate = (str?: string | null, len = 80) => {
  const s = str ?? '';
  return s.length > len ? s.slice(0, len) + '...' : s;
};

export const formatPercentage = (val: number) => `${val}%`;
