/** Spanish number and money formatting, so "1.234,56 €" reads natively. */

const EUR = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const EUR_PRECISE = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NUMBER = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });

export const euros = (value: number): string => EUR.format(value);
export const eurosPrecise = (value: number): string => EUR_PRECISE.format(value);
export const number = (value: number): string => NUMBER.format(value);

/** A €/kWh price, which needs three decimals to be meaningful. */
export const perKwh = (value: number): string =>
  `${value.toFixed(3).replace(".", ",")} €/kWh`;
