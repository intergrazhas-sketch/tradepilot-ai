type TFunc = (key: string) => string;

const STATUS_NAMESPACES = {
  order: "orderStatus",
  discovery: "discoveryStatus",
  supplier: "supplierStatus",
  channel: "channelStatus",
} as const;

export type StatusNamespace = keyof typeof STATUS_NAMESPACES;

export function statusLabel(t: TFunc, status: string, namespace: StatusNamespace): string {
  const key = `${STATUS_NAMESPACES[namespace]}.${status}`;
  const translated = t(key);
  return translated !== key ? translated : status;
}

const LEGACY_DECISION_REASON: Record<string, string> = {
  "Цена продажи не задана": "decision.reason.no_selling_price",
  "Закупочная цена не задана": "decision.reason.no_cost_price",
  "Отрицательная прибыль": "decision.reason.negative_profit",
  "Выгодный товар — можно тестировать": "decision.reason.profitable_for_test",
  "Требует проверки перед запуском": "decision.reason.needs_review",
  "Нет остатка на складе": "decision.reason.no_stock",
};

const LEGACY_FIT_TAG: Record<string, string> = {
  "открытый прайс": "supplierFit.tag.open_price",
  "оптовые условия": "supplierFit.tag.wholesale_terms",
  "несколько контактов": "supplierFit.tag.multiple_contacts",
  "есть контакт": "supplierFit.tag.has_contact",
  "есть доставка": "supplierFit.tag.has_delivery",
  "категория для быстрого теста": "supplierFit.tag.quick_test_category",
  "нет прайса": "supplierFit.tag.no_price_list",
  "нет признаков опта": "supplierFit.tag.no_wholesale_signs",
  "нет контактов": "supplierFit.tag.no_contacts",
};

const FIT_TAG_CODES = new Set([
  "open_price",
  "wholesale_terms",
  "multiple_contacts",
  "has_contact",
  "has_delivery",
  "quick_test_category",
  "no_price_list",
  "no_wholesale_signs",
  "no_contacts",
  "low_moq",
  "moderate_moq",
  "high_moq",
]);

function translateKey(t: TFunc, key: string, fallback: string): string {
  const translated = t(key);
  return translated !== key ? translated : fallback;
}

function translateDecisionPart(t: TFunc, part: string): string {
  const legacyKey = LEGACY_DECISION_REASON[part];
  if (legacyKey) return translateKey(t, legacyKey, part);

  const directKey = `decision.reason.${part}`;
  const direct = t(directKey);
  if (direct !== directKey) return direct;

  const marginBelow = part.match(/^margin_below_10:([\d.]+)$/);
  if (marginBelow) {
    return translateKey(t, "decision.reason.margin_below_10", part).replace("{margin}", marginBelow[1]);
  }

  const marginRisk = part.match(/^margin_risk_zone:([\d.]+)$/);
  if (marginRisk) {
    return translateKey(t, "decision.reason.margin_risk_zone", part).replace("{margin}", marginRisk[1]);
  }

  const lowMarkup = part.match(/^low_markup:([\d.]+)$/);
  if (lowMarkup) {
    return translateKey(t, "decision.reason.low_markup", part).replace("{markup}", lowMarkup[1]);
  }

  const legacyMarginBelow = part.match(/^Маржа ниже 10% \(([\d.]+)%\)$/);
  if (legacyMarginBelow) {
    return translateKey(t, "decision.reason.margin_below_10", part).replace("{margin}", legacyMarginBelow[1]);
  }

  const legacyMarginRisk = part.match(/^Маржа ([\d.]+)% — зона риска \(10–20%\)$/);
  if (legacyMarginRisk) {
    return translateKey(t, "decision.reason.margin_risk_zone", part).replace("{margin}", legacyMarginRisk[1]);
  }

  const legacyLowMarkup = part.match(/^Низкая наценка \(([\d.]+)%\)$/);
  if (legacyLowMarkup) {
    return translateKey(t, "decision.reason.low_markup", part).replace("{markup}", legacyLowMarkup[1]);
  }

  return part;
}

export function translateDecisionReason(t: TFunc, reason?: string | null): string {
  if (!reason?.trim()) return t("common.emDash");

  const separator = reason.includes("|") ? "|" : reason.includes("; ") ? "; " : null;
  if (separator) {
    return reason
      .split(separator)
      .map((part) => translateDecisionPart(t, part.trim()))
      .filter(Boolean)
      .join("; ");
  }

  return translateDecisionPart(t, reason.trim());
}

function translateFitTag(t: TFunc, tag: string): string {
  const trimmed = tag.trim();
  const legacyKey = LEGACY_FIT_TAG[trimmed];
  if (legacyKey) return translateKey(t, legacyKey, trimmed);

  const lowMoq = trimmed.match(/^низкий MOQ \((\d+)\)$/i);
  if (lowMoq) return translateKey(t, "supplierFit.tag.low_moq", trimmed).replace("{moq}", lowMoq[1]);

  const moderateMoq = trimmed.match(/^умеренный MOQ \((\d+)\)$/i);
  if (moderateMoq) return translateKey(t, "supplierFit.tag.moderate_moq", trimmed).replace("{moq}", moderateMoq[1]);

  const highMoq = trimmed.match(/^высокий MOQ \((\d+)\)$/i);
  if (highMoq) return translateKey(t, "supplierFit.tag.high_moq", trimmed).replace("{moq}", highMoq[1]);

  const codeKey = FIT_TAG_CODES.has(trimmed.split(":")[0]) ? `supplierFit.tag.${trimmed.split(":")[0]}` : null;
  const moqCode = trimmed.match(/^(low_moq|moderate_moq|high_moq):(\d+)$/);
  if (moqCode) {
    return translateKey(t, `supplierFit.tag.${moqCode[1]}`, trimmed).replace("{moq}", moqCode[2]);
  }
  if (codeKey) return translateKey(t, codeKey, trimmed);

  return trimmed;
}

function translateFitTagList(t: TFunc, tags: string): string {
  return tags
    .split(",")
    .map((tag) => translateFitTag(t, tag.trim()))
    .filter(Boolean)
    .join(", ");
}

export function translateSupplierFitReason(t: TFunc, reason?: string | null): string {
  if (!reason?.trim()) return "";

  if (reason.startsWith("fit|")) {
    const [, pros = "", cons = ""] = reason.split("|");
    const proLabels = pros ? translateFitTagList(t, pros.replace(/\+/g, ",")) : "";
    const conLabels = cons ? translateFitTagList(t, cons.replace(/\+/g, ",")) : "";
    if (proLabels && !conLabels) return `${t("supplierFit.verdict.suitable")}: ${proLabels}`;
    if (conLabels && !proLabels) return `${t("supplierFit.verdict.risk")}: ${conLabels}`;
    const parts: string[] = [];
    if (proLabels) parts.push(`${t("supplierFit.pros")}: ${proLabels}`);
    if (conLabels) parts.push(`${t("supplierFit.cons")}: ${conLabels}`);
    return parts.join("; ");
  }

  if (reason.startsWith("Подходит: ")) {
    return `${t("supplierFit.verdict.suitable")}: ${translateFitTagList(t, reason.slice("Подходит: ".length))}`;
  }
  if (reason.startsWith("Риск: ")) {
    return `${t("supplierFit.verdict.risk")}: ${translateFitTagList(t, reason.slice("Риск: ".length))}`;
  }
  if (reason.startsWith("Плюсы: ")) {
    const [pros, consPart] = reason.split("; минусы: ");
    const proLabels = translateFitTagList(t, pros.slice("Плюсы: ".length));
    if (consPart) {
      return `${t("supplierFit.pros")}: ${proLabels}; ${t("supplierFit.cons")}: ${translateFitTagList(t, consPart)}`;
    }
    return `${t("supplierFit.pros")}: ${proLabels}`;
  }
  if (reason.startsWith("Минусы: ")) {
    return `${t("supplierFit.cons")}: ${translateFitTagList(t, reason.slice("Минусы: ".length))}`;
  }

  return reason;
}

const LEGACY_RECOMMENDATIONS: Record<string, string> = {
  "Все основные показатели в норме. Загрузите больше товаров, чтобы расти дальше.": "recommendation.allGood",
};

export function translateRecommendation(t: TFunc, rec: string): string {
  if (rec === "allGood") return t("recommendation.allGood");

  const coded = rec.match(/^([a-zA-Z]+):(\d+)$/);
  if (coded) {
    const key = `recommendation.${coded[1]}`;
    const translated = t(key);
    return translated !== key ? translated.replace("{count}", coded[2]) : rec;
  }

  const legacyKey = LEGACY_RECOMMENDATIONS[rec];
  if (legacyKey) return t(legacyKey);

  const noDescription = rec.match(/^(\d+) товар\(ов\) без описания — (.+)$/);
  if (noDescription) {
    return t("recommendation.noDescription").replace("{count}", noDescription[1]);
  }

  const noCategory = rec.match(/^(\d+) товар\(ов\) без категории — (.+)$/);
  if (noCategory) {
    return t("recommendation.noCategory").replace("{count}", noCategory[1]);
  }

  const lowStock = rec.match(/^(\d+) товар\(ов\) с низким остатком — (.+)$/);
  if (lowStock) {
    return t("recommendation.lowStock").replace("{count}", lowStock[1]);
  }

  const lowMargin = rec.match(/^(\d+) товар\(ов\) с маржой ниже 15% — (.+)$/);
  if (lowMargin) {
    return t("recommendation.lowMargin").replace("{count}", lowMargin[1]);
  }

  const key = `recommendation.${rec}`;
  const translated = t(key);
  return translated !== key ? translated : rec;
}

const LEGACY_IMPORT_ERRORS: Record<string, string> = {
  "Поле 'sku' обязательно": "import.error.requiredSku",
  "Дублирующий SKU в файле": "import.error.duplicateSku",
  "Поле 'name' обязательно": "import.error.requiredName",
  "Некорректная цена закупки": "import.error.invalidCostPrice",
  "(без названия)": "import.error.missingName",
  "Строка с ошибкой": "import.error.rowError",
  "Пропущено: пустой SKU": "import.error.skippedEmptySku",
};

export function translateImportError(t: TFunc, error?: string | null): string {
  if (!error?.trim()) return "";
  const legacyKey = LEGACY_IMPORT_ERRORS[error.trim()];
  if (legacyKey) return t(legacyKey);
  const codeKey = `import.error.${error.trim()}`;
  const translated = t(codeKey);
  return translated !== codeKey ? translated : error;
}

export function emptyDisplay(t: TFunc, value?: string | null): string {
  return value?.trim() ? value : t("common.emDash");
}
