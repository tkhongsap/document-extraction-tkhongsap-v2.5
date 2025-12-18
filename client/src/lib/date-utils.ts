import { format, formatDistanceToNow } from 'date-fns';
import { th, enUS } from 'date-fns/locale';
import { useLanguage } from './i18n';

export function useDateFormatter() {
  const { language } = useLanguage();

  const formatDate = (date: Date | string | number, formatStr: string = 'dd MMM yyyy') => {
    const d = new Date(date);
    
    if (language === 'th') {
      // Buddhist Calendar: Add 543 years to Gregorian year
      const buddhistYear = d.getFullYear() + 543;
      
      if (formatStr === 'dd MMM yyyy' || formatStr === 'PPP') {
        return `${d.getDate()} ${format(d, 'MMM', { locale: th })} ${buddhistYear}`;
      }
      if (formatStr === 'dd/MM/yyyy') {
        return `${format(d, 'dd/MM')}/${buddhistYear}`;
      }
      
      // Fallback for other formats
      return format(d, formatStr, { locale: th });
    }

    return format(d, formatStr, { locale: enUS });
  };

  const formatRelativeTime = (date: Date | string | number) => {
    const d = new Date(date);
    // Validate date
    if (isNaN(d.getTime())) {
      return '-';
    }
    const locale = language === 'th' ? th : enUS;
    return formatDistanceToNow(d, { addSuffix: true, locale });
  };

  return { formatDate, formatRelativeTime };
}
