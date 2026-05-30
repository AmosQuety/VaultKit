export function formatDate(date: string | Date | number, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return 'Invalid Date';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };

  return new Intl.DateTimeFormat('en-US', defaultOptions).format(d);
}
