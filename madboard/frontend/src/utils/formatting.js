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

// Unicode superscript characters for exponents
const SUPERSCRIPT_MAP = {
  0: "⁰",
  1: "¹",
  2: "²",
  3: "³",
  4: "⁴",
  5: "⁵",
  6: "⁶",
  7: "⁷",
  8: "⁸",
  9: "⁹",
  "-": "⁻",
};

/**
 * Format a chart tick value as mantissa · 10^exponent using unicode superscript
 * @param {number} value - The value to format
 * @returns {string} Formatted tick label
 */
export function formatScientificTick(value) {
  if (value === 0) return "0";

  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const mantissa = value / Math.pow(10, exponent);

  // Round mantissa to 2 decimal places
  const roundedMantissa = Math.round(mantissa * 100) / 100;

  // Format exponent with superscript
  const exponentStr = exponent.toString();
  const exponentSuperscript = exponentStr
    .split("")
    .map((char) => SUPERSCRIPT_MAP[char])
    .join("");

  // If mantissa is essentially 1, just show the exponent
  if (Math.abs(roundedMantissa - 1) < 0.001) {
    return "10" + exponentSuperscript;
  }

  // Otherwise show mantissa · 10^exponent
  return `${roundedMantissa}⋅10${exponentSuperscript}`;
}

// Shared color palette for distinguishing runs/subprocesses across charts
export const RUN_COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7c7c",
  "#8dd1e1",
  "#d084d0",
  "#a4de6c",
  "#ffc658",
];

/**
 * Format a number for tables and tooltips: plain digits in the range where
 * they are readable, scientific notation outside of it
 * @param {number} value - The value to format
 * @returns {string} Formatted value
 */
export function formatNumber(value) {
  if (value === null || value === undefined) return "—";
  if (typeof value !== "number") return String(value);
  if (!Number.isFinite(value)) return String(value);
  if (value === 0) return "0";
  const magnitude = Math.abs(value);
  if (magnitude < 1e-3 || magnitude >= 1e5) return value.toExponential(4);
  return String(Number(value.toPrecision(6)));
}
