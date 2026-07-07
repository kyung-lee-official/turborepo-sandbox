export type AsyncGeneratePdfInfoRow = {
  name: string;
  email: string;
  age: number;
  gender: string;
  invoiceDate: string;
};

export const MOCK_INFO_ROWS: AsyncGeneratePdfInfoRow[] = [
  {
    name: "Ada Lovelace",
    email: "ada.lovelace@example.com",
    age: 36,
    gender: "Female",
    invoiceDate: "2026-01-15",
  },
  {
    name: "Grace Hopper",
    email: "grace.hopper@example.com",
    age: 45,
    gender: "Female",
    invoiceDate: "2026-02-03",
  },
  {
    name: "Alan Turing",
    email: "alan.turing@example.com",
    age: 41,
    gender: "Male",
    invoiceDate: "2026-02-18",
  },
  {
    name: "Katherine Johnson",
    email: "katherine.johnson@example.com",
    age: 52,
    gender: "Female",
    invoiceDate: "2026-03-07",
  },
  {
    name: "Tim Berners-Lee",
    email: "tim.berners-lee@example.com",
    age: 38,
    gender: "Male",
    invoiceDate: "2026-03-22",
  },
];
