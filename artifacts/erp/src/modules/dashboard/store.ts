import { create } from 'zustand';

export type DateFilter = 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR' | 'CUSTOM';

interface DashboardState {
  dateFilter: DateFilter;
  startDate: Date;
  endDate: Date;
  setDateFilter: (filter: DateFilter, customStart?: Date, customEnd?: Date) => void;
}

function calculateDates(filter: DateFilter, customStart?: Date, customEnd?: Date) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);

  switch (filter) {
    case 'TODAY':
      return { startDate: start, endDate: today };
    case 'YESTERDAY':
      start.setDate(start.getDate() - 1);
      const yesterdayEnd = new Date(start);
      yesterdayEnd.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: yesterdayEnd };
    case 'LAST_7_DAYS':
      start.setDate(start.getDate() - 7);
      return { startDate: start, endDate: today };
    case 'LAST_30_DAYS':
      start.setDate(start.getDate() - 30);
      return { startDate: start, endDate: today };
    case 'THIS_MONTH':
      start.setDate(1);
      return { startDate: start, endDate: today };
    case 'LAST_MONTH':
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
      const lastMonthEnd = new Date(start);
      lastMonthEnd.setMonth(lastMonthEnd.getMonth() + 1);
      lastMonthEnd.setDate(0);
      lastMonthEnd.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: lastMonthEnd };
    case 'THIS_QUARTER':
      const quarter = Math.floor(start.getMonth() / 3);
      start.setMonth(quarter * 3);
      start.setDate(1);
      return { startDate: start, endDate: today };
    case 'THIS_YEAR':
      start.setMonth(0);
      start.setDate(1);
      return { startDate: start, endDate: today };
    case 'CUSTOM':
      return { 
        startDate: customStart || new Date(new Date().setMonth(new Date().getMonth() - 1)), 
        endDate: customEnd || today 
      };
    default:
      start.setDate(start.getDate() - 30);
      return { startDate: start, endDate: today };
  }
}

const initialDates = calculateDates('LAST_30_DAYS');

export const useDashboardStore = create<DashboardState>((set) => ({
  dateFilter: 'LAST_30_DAYS',
  startDate: initialDates.startDate,
  endDate: initialDates.endDate,
  setDateFilter: (filter, customStart, customEnd) => {
    const dates = calculateDates(filter, customStart, customEnd);
    set({ dateFilter: filter, startDate: dates.startDate, endDate: dates.endDate });
  }
}));
