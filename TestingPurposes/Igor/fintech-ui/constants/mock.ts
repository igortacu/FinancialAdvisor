// constants/mock.ts
export const accounts = [
  { id: "a1", bank: "Revolut", type: "Checking •••• 8635", balance: 4228.76 },
  { id: "a2", bank: "ING", type: "Savings •••• 1123", balance: 950.12 },
];

export const payments = [
  { id: "p1", name: "Netflix", next: "Next: 12/04", amount: "$1.00" },
  { id: "p2", name: "PayPal", next: "Next: 14/04", amount: "$3.50" },
  { id: "p3", name: "Spotify", next: "Next: 13/04", amount: "$10.00" },
];

export const categories = [
  { id: "c1", name: "Groceries", spent: 124.3, limit: 300 },
  { id: "c2", name: "Transport", spent: 68.4, limit: 120 },
  { id: "c3", name: "Entertainment", spent: 45.0, limit: 80 },
  { id: "c4", name: "Bills", spent: 210.0, limit: 250 },
];

export const allocation502030 = [
  { x: "Needs", y: 55 },
  { x: "Wants", y: 25 },
  { x: "Savings", y: 20 },
];

export const cashFlow7d = [
  { x: 1, y: 500 },
  { x: 2, y: 650 },
  { x: 3, y: 400 },
  { x: 4, y: 820 },
  { x: 5, y: 700 },
  { x: 6, y: 980 },
  { x: 7, y: 900 },
];

export const monthlySpend = [
  { month: "Jan", needs: 1200, wants: 600, savings: 400 },
  { month: "Feb", needs: 1100, wants: 560, savings: 420 },
  { month: "Mar", needs: 1180, wants: 590, savings: 430 },
  { month: "Apr", needs: 1240, wants: 610, savings: 450 },
];

export const positions = [
  { id: "p1", name: "AAPL", change: 1.6, data: [10, 13, 12, 15, 14, 18, 17] },
  { id: "p2", name: "MSFT", change: -0.8, data: [8, 7, 9, 11, 10, 9, 10] },
  { id: "p3", name: "VOO", change: 0.4, data: [6, 6, 7, 8, 8, 9, 9] },
];

export const tx = [
  {
    id: "t1",
    name: "Lidl",
    note: "Groceries",
    amount: -23.45,
    date: "2025-09-21",
    method: "card",
  },
  {
    id: "t2",
    name: "Uber",
    note: "Transport",
    amount: -7.9,
    date: "2025-09-21",
    method: "paypal",
  },
  {
    id: "t3",
    name: "Spotify",
    note: "Entertainment",
    amount: -10.0,
    date: "2025-09-20",
    method: "card",
  },
  {
    id: "t4",
    name: "Salary",
    note: "Income",
    amount: 1200.0,
    date: "2025-09-18",
    method: "bank",
  },
];
