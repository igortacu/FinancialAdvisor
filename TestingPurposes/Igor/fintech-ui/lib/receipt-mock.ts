// lib/receipt-mock.ts
export type ParsedItem = {
  name: string;
  qty: number;
  unit?: string;
  unitPrice?: number;
  total: number;
  discount?: number;
};

export type ParsedReceipt = {
  merchant: string;
  date?: string; // '23.09.25'
  time?: string; // '21:24'
  currency?: string; // 'MDL'
  total?: number; // 58.00
  vat?: number; // 9.67
  items: ParsedItem[];
  rawText?: string;
};

export const MOCK_RECEIPT: ParsedReceipt = {
  merchant: "Kaufland S.R.L., Chișinău, str. Kiev, 7",
  date: "23.09.25",
  time: "21:24",
  currency: "MDL",
  vat: 9.67,
  total: 58.0,
  items: [
    {
      name: "K. ÎNGHEȚATĂ 120 ml",
      qty: 1,
      unit: "BUC",
      unitPrice: 19.0,
      total: 19.0,
    },
    {
      name: "OH APA SP 0,75L PET",
      qty: 1,
      unit: "BUC",
      unitPrice: 10.0,
      total: 10.0,
    },
    {
      name: "VITAMIN AQUA ZERO 0",
      qty: 1,
      unit: "BUC",
      unitPrice: 29.0,
      total: 29.0,
    },
  ],
  rawText: `
KAUFLAND S.R.L.
Mun. Chișinău
str. Kiev, 7

Kaufland

[OND] 1016600004011
K. ÎNGHETATA 120ML                19.00
OH APA SP 0,75L PET               10.00
VITAMIN AQUA ZERO 0               29.00
----------------------------------------
SUMA                              58.00
TVA A - 20.00%                     9.67
NUMERAR
REST
# Magazin: 1440 Bon: 73995
Casa: 3  Casier: 109
23.09.25 21-24-40 N 781
BON FISCAL
`.trim(),
};
