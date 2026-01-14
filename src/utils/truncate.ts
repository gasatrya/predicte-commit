import { DIFF_CAPS, TRUNCATION_MARKER } from '../core/config';

export function truncateWithMarker(input: string, maxChars: number): string {
  if (input.length <= maxChars) {
    return input;
  }
  if (maxChars <= TRUNCATION_MARKER.length) {
    return TRUNCATION_MARKER.slice(0, maxChars);
  }
  const headSize = maxChars - TRUNCATION_MARKER.length;
  return `${input.slice(0, headSize)}${TRUNCATION_MARKER}`;
}

export function capDiffsByFileAndTotal(diffs: Array<{ header: string; diff: string }>): string {
  const parts: string[] = [];
  let remaining = DIFF_CAPS.maxCharsTotal;

  for (const { header, diff } of diffs) {
    if (remaining <= 0) {
      break;
    }

    // Account for the newline separator if this isn't the first file
    if (parts.length > 0) {
      remaining -= 2; // '\n\n'.length
      if (remaining <= 0) {
        break;
      }
    }

    const fileSection = `${header}\n${truncateWithMarker(diff, DIFF_CAPS.maxCharsPerFile)}`;
    if (fileSection.length <= remaining) {
      parts.push(fileSection);
      remaining -= fileSection.length;
      continue;
    }

    parts.push(truncateWithMarker(fileSection, remaining));
    remaining = 0;
    break;
  }

  return parts.join('\n\n');
}
