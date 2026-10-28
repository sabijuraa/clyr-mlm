export const getCommissionStatementRequest = (commission) => {
  const date = commission.order_date || commission.created_at;
  // Keep the order's recorded calendar month; converting to UTC can move a
  // midnight order into the previous month.
  const period = typeof date === 'string' ? date.slice(0, 7) : '';
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
    throw new Error('Invalid commission date');
  }
  return {
    partnerId: commission.user_id,
    period,
    preview: ['held', 'pending'].includes(commission.status),
  };
};
