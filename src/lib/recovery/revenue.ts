export type RevenueInput = {
  dealValue: number | null | undefined;
  recoveryProbability: number | null | undefined; // 0-1
};

export function calculatePotentialRecoverableRevenue(input: RevenueInput): number | null {
  if (!input.dealValue || !input.recoveryProbability) return null;
  if (input.dealValue <= 0) return null;
  if (input.recoveryProbability <= 0 || input.recoveryProbability > 1) return null;
  return Math.round(input.dealValue * input.recoveryProbability);
}

export function formatCurrency(value: number | null | undefined, currency: string = "RUB"): string {
  if (value === null || value === undefined) return "—";
  try {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `₽${value.toLocaleString("ru-RU")}`;
  }
}
