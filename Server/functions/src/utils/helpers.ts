import { format } from 'date-fns';

export const formatDateToDDMMYYYY = (date: Date): string => {
    return format(date, 'dd/MM/yyyy');
}