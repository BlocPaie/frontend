export type InvoiceStatus = 'pending' | 'executed' | 'cancelled';

export interface Contractor {
  id: string;
  name: string;
  email: string;
  registeredDate: string;
  walletAddress: string;
}

export interface Invoice {
  id: string;
  contractorId: string;
  contractorName: string;
  companyName: string;
  amount: number;
  createdDate: string;
  status: InvoiceStatus;
  txHash?: string;
}

export const MOCK_CONTRACTORS: Contractor[] = [
  {
    id: 'CTR-0001',
    name: 'Alice Martin',
    email: 'alice@devstudio.io',
    registeredDate: '2026-02-15',
    walletAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  },
  {
    id: 'CTR-0002',
    name: 'Bob Chen',
    email: 'bob.chen@freelance.dev',
    registeredDate: '2026-02-28',
    walletAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
  },
  {
    id: 'CTR-0003',
    name: 'Sofia Reyes',
    email: 'sofia@pixel.works',
    registeredDate: '2026-03-01',
    walletAddress: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
  },
];

export const MOCK_INVOICES: Invoice[] = [
  {
    id: 'INV-2026-001',
    contractorId: 'CTR-0001',
    contractorName: 'Alice Martin',
    companyName: 'Acme Corp',
    amount: 4500,
    createdDate: '2026-03-01',
    status: 'executed',
    txHash: '0x3a1b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
  },
  {
    id: 'INV-2026-002',
    contractorId: 'CTR-0002',
    contractorName: 'Bob Chen',
    companyName: 'Acme Corp',
    amount: 2800,
    createdDate: '2026-03-05',
    status: 'pending',
  },
  {
    id: 'INV-2026-003',
    contractorId: 'CTR-0003',
    contractorName: 'Sofia Reyes',
    companyName: 'Acme Corp',
    amount: 1200,
    createdDate: '2026-03-08',
    status: 'cancelled',
    txHash: '0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e',
  },
  {
    id: 'INV-2026-004',
    contractorId: 'CTR-0001',
    contractorName: 'Alice Martin',
    companyName: 'Acme Corp',
    amount: 6000,
    createdDate: '2026-03-10',
    status: 'pending',
  },
];

export const CONTRACTOR_PENDING: Invoice[] = [
  {
    id: 'INV-2026-002',
    contractorId: 'CTR-0002',
    contractorName: 'Bob Chen',
    companyName: 'Acme Corp',
    amount: 2800,
    createdDate: '2026-03-05',
    status: 'pending',
  },
];

export const CONTRACTOR_EXECUTED: Invoice[] = [
  {
    id: 'INV-2026-001',
    contractorId: 'CTR-0001',
    contractorName: 'Alice Martin',
    companyName: 'Acme Corp',
    amount: 4500,
    createdDate: '2026-03-01',
    status: 'executed',
    txHash: '0x3a1b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
  },
];
