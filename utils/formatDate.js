export const formatDateToDDMMYYY = (date) => {
    const day = String(date.getDate()).padStart(2, '0'); // Get the day and pad it to 2 digits
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Get the month (0-indexed) and pad it to 2 digits
    const year = date.getFullYear(); // Get the full year

    return `${day}-${month}-${year}`; 
}