const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_INDEX_BY_NAME = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

export const parseIsoDateParts = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return { year, month, day };
};

export const parseDayMonthLabelParts = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const match = value.trim().match(/^(\d{1,2})[-\s]([A-Za-z]{3})$/);
  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const monthName = match[2].toLowerCase();
  const month = MONTH_INDEX_BY_NAME[monthName] || 0;

  if (!Number.isFinite(day) || day < 1 || day > 31 || month < 1 || month > 12) {
    return null;
  }

  return { month, day };
};

export const formatDayLabel = (value) => {
  const isoParts = parseIsoDateParts(value);
  const dayMonthParts = isoParts || parseDayMonthLabelParts(value);
  if (!dayMonthParts) {
    return value;
  }

  const dayLabel = String(dayMonthParts.day).padStart(2, '0');
  const monthLabel = MONTHS_SHORT[dayMonthParts.month - 1] || '';
  return `${dayLabel} ${monthLabel}`.trim();
};
