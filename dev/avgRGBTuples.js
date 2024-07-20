function averageTuplesWithSquareRoot(array1, array2) {
    if (array1.length !== array2.length) {
        console.error("Error: Arrays must have the same number of elements.");
        return;
    }

    const processedValues = array1.map((value, index) => {
        const squareSum = Math.pow(value, 2) + Math.pow(array2[index], 2); // Square each value and sum
        return Math.round(Math.sqrt(squareSum / 2)); // Average the square root of the sum
    });

    console.log("Processed Values:", processedValues);
}

// Input
const colors1 = [221, 167, 214];
const colors2 = [209, 181, 238];
averageTuplesWithSquareRoot(colors1, colors2);
