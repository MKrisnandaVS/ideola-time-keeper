export const CLIENTS = [
  "GELATO DI LENNO",
  "SANSPOWER",
  "RUMAH KAPAS",
  "YASINDO",
  "IDEOLA",
] as const;

export type ClientName = (typeof CLIENTS)[number];
