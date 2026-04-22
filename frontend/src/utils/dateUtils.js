export const generateMonthOptions = (count = 12) => {
  const months = [];
  const date = new Date();
  
  // Set to first day of month to avoid month skipping if today is 31st
  date.setDate(1);
  
  for (let i = 0; i < count; i++) {
    const monthName = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    months.push(`${monthName} ${year}`);
    date.setMonth(date.getMonth() - 1);
  }
  
  return months;
};

export const getCurrentMonthYear = () => {
  const date = new Date();
  const monthName = date.toLocaleString('default', { month: 'long' });
  const year = date.getFullYear();
  return `${monthName} ${year}`;
};
