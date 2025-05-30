export const timeToNumber = (time) => {
    const [hours, minutes] = time.split(":").map(Number);
    console.log(`Converting time ${time} to number: ${hours} hours and ${minutes} minutes`);
    
    return hours * 60 + minutes;
}