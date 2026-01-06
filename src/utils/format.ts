export const formatPrice = (value: number) => {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  return `${sign}₩${abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};
