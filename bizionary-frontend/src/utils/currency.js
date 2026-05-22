export const formatPKR = (amount) => {
    if (amount === undefined || amount === null) return 'Rs 0';
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount).replace('PKR', 'Rs');
};
