export function parseAmountInput(text: string): number {
  const cleaned = text.replace(/,/g, "").trim();
  if (!cleaned) {
    return 0;
  }

  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.round(value * 100) / 100;
}

export function formatAmountWithCommas(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    return "";
  }

  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

const DIGITS = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"] as const;
const INTEGER_UNITS = ["", "拾", "佰", "仟"] as const;
const SECTION_UNITS = ["", "万", "亿", "兆"] as const;

function convertSection(section: number): string {
  if (section === 0) {
    return "";
  }

  let result = "";
  let zeroPending = false;
  let temp = section;

  for (let unitIndex = 0; unitIndex < 4; unitIndex += 1) {
    const digit = temp % 10;
    temp = Math.floor(temp / 10);

    if (digit === 0) {
      if (result) {
        zeroPending = true;
      }
      continue;
    }

    if (zeroPending) {
      result = `零${result}`;
      zeroPending = false;
    }

    result = `${DIGITS[digit]}${INTEGER_UNITS[unitIndex]}${result}`;
  }

  return result;
}

function convertIntegerPart(value: number): string {
  if (value === 0) {
    return DIGITS[0];
  }

  let result = "";
  let sectionIndex = 0;
  let temp = value;
  let needZero = false;

  while (temp > 0) {
    const section = temp % 10000;
    if (section > 0) {
      const sectionText = convertSection(section);
      if (needZero && result) {
        result = `零${result}`;
      }
      result = `${sectionText}${SECTION_UNITS[sectionIndex]}${result}`;
      needZero = section < 1000;
    } else if (result) {
      needZero = true;
    }

    temp = Math.floor(temp / 10000);
    sectionIndex += 1;
  }

  return result.replace(/零+/g, "零").replace(/零$/, "");
}

export function amountToChineseUppercase(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    return "";
  }

  const rounded = Math.round(amount * 100) / 100;
  const yuan = Math.floor(rounded);
  const decimalPart = Math.round((rounded - yuan) * 100);
  const jiao = Math.floor(decimalPart / 10);
  const fen = decimalPart % 10;

  let result = "";

  if (yuan > 0) {
    result += `${convertIntegerPart(yuan)}元`;
  }

  if (jiao === 0 && fen === 0) {
    return `${result}整`;
  }

  if (yuan > 0 && jiao === 0) {
    result += "零";
  }

  if (jiao > 0) {
    result += `${DIGITS[jiao]}角`;
  }

  if (fen > 0) {
    result += `${DIGITS[fen]}分`;
  }

  return result;
}
