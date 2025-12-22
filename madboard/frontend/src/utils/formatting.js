/**
 * Format a number with SI prefix notation (k, M, G, T, etc.)
 * @param {number} value - The value to format
 * @returns {string} Formatted value with SI prefix
 */
export function formatSIPrefix(value) {
  try {
    const roundedValue = Math.round(value);
    const valuePower = Math.floor(Math.log10(roundedValue));
    const valuePower3 = Math.floor(valuePower / 3);
    const digitsAfterDot = valuePower3 === 0 ? 0 : 2 - (valuePower % 3);
    const prefixes = ["", "k", "M", "G", "T"];
    const valueScaled = roundedValue / Math.pow(10, valuePower3 * 3);
    return `${valueScaled.toFixed(digitsAfterDot)}${prefixes[valuePower3]}`;
  } catch {
    return String(value);
  }
}

/**
 * Format a value with its error
 * @param {number} value - The value to format
 * @param {number} error - The error/uncertainty of the value
 * @returns {string} Formatted value with error
 */
export function formatWithError(value, error) {
  try {
    const sigPower = -(Math.floor(Math.log10(error)) - 1);
    const valuePower = Math.floor(Math.log10(value));

    if (sigPower < 0 || sigPower > 5) {
      const expStr = value.toExponential(valuePower + sigPower);
      const [mantissa, exponent] = expStr.split("e");
      return `${mantissa}(${(error * Math.pow(10, sigPower)).toFixed(
        0,
      )})e${exponent}`;
    } else {
      const errPrec = sigPower === 1 ? 1 : 0;
      const errVal = error * Math.pow(10, sigPower - errPrec);
      return `${value.toFixed(sigPower)}(${errVal.toFixed(errPrec)})`;
    }
  } catch {
    return `${value} +- ${error}`;
  }
}

/**
 * Format a relative standard deviation as percentage with 3 decimal places
 * @param {number} relStdDev - The relative standard deviation
 * @returns {string} Formatted RSD percentage
 */
export function formatRSD(relStdDev) {
  return relStdDev.toFixed(3);
}

/**
 * Format unweighting efficiency ratio with 5 decimal places
 * @param {number} numerator - The numerator (count_unweighted)
 * @param {number} denominator - The denominator (count_opt or count_after_cuts_opt)
 * @returns {string} Formatted efficiency
 */
export function formatEfficiency(numerator, denominator) {
  if (denominator === 0) return "N/A";
  return (numerator / denominator).toFixed(5);
}
