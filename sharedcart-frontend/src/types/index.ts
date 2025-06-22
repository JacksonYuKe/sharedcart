// frontend/src/types/index.ts

export interface User {
  id: number;
  email: string;
  name: string;
  avatar?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: number;
  name: string;
  description?: string;
  created_by_id: number;
  created_by?: User;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  members?: GroupMember[];
}

export interface GroupMember {
  id: number;
  user_id: number;
  group_id: number;
  role: 'admin' | 'member';
  joined_at: string;
  invited_by?: number;
  user?: User;
}

export interface Bill {
  id: number;
  group_id: number;
  group?: Group;
  title: string;
  description?: string;
  total_amount: string;
  paid_by_id: number;
  paid_by?: User;
  bill_date: string;
  status: 'pending' | 'finalized' | 'settled';
  created_at: string;
  updated_at: string;
  items?: BillItem[];
}

export interface BillItem {
  id: number;
  bill_id: number;
  name: string;
  description?: string;
  amount: string;
  quantity: number;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
  owners?: User[];
}

export interface Settlement {
  id: number;
  group_id: number;
  group?: Group;
  title: string;
  description?: string;
  created_by_id: number;
  created_by?: User;
  status: 'pending' | 'confirmed' | 'completed';
  settled_at?: string;
  created_at: string;
  updated_at: string;
  bills?: Bill[];
  transactions?: SettlementTransaction[];
}

export interface SettlementTransaction {
  id: number;
  settlement_id: number;
  from_user_id: number;
  from_user?: User;
  to_user_id: number;
  to_user?: User;
  amount: string;
  status: 'pending' | 'paid';
  paid_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface UserBalance {
  user_id: number;
  user_name: string;
  paid: string;
  owes: string;
  balance: string;
}

export interface Transaction {
  from_user_id: number;
  from_user_name: string;
  to_user_id: number;
  to_user_name: string;
  amount: string;
}

export interface SettlementResult {
  group_id: number;
  bill_count: number;
  total_amount: string;
  balances: UserBalance[];
  transactions: Transaction[];
}

// API Response Types
export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  error: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
}

export interface CreateBillRequest {
  group_id: number;
  title: string;
  description?: string;
  total_amount: string;
  bill_date: string;
  items: CreateBillItemRequest[];
}

export interface CreateBillItemRequest {
  name: string;
  description?: string;
  amount: string;
  quantity: number;
  is_shared: boolean;
  owner_ids?: number[];
}