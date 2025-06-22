// frontend/src/store/slices/billsSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Bill, CreateBillRequest } from '../../types';
import { billsAPI } from '../../services/api';

interface BillsState {
  bills: Bill[];
  currentBill: Bill | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: BillsState = {
  bills: [],
  currentBill: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchBills = createAsyncThunk(
  'bills/fetchBills',
  async ({ groupId, status }: { groupId: number; status?: string }, { rejectWithValue }) => {
    try {
      const response = await billsAPI.getBills(groupId, status);
      return response.data.bills;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch bills');
    }
  }
);

export const fetchBill = createAsyncThunk(
  'bills/fetchBill',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await billsAPI.getBill(id);
      return response.data.bill;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch bill');
    }
  }
);

export const createBill = createAsyncThunk(
  'bills/createBill',
  async (billData: CreateBillRequest, { rejectWithValue }) => {
    try {
      console.log('Redux thunk: Creating bill', billData);
      const response = await billsAPI.createBill(billData);
      console.log('Redux thunk: Bill created successfully', response.data);
      return response.data.bill;
    } catch (error: any) {
      console.error('Redux thunk: Failed to create bill', error);
      return rejectWithValue(error.response?.data?.error || 'Failed to create bill');
    }
  }
);

export const finalizeBill = createAsyncThunk(
  'bills/finalizeBill',
  async (id: number, { rejectWithValue }) => {
    try {
      await billsAPI.finalizeBill(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to finalize bill');
    }
  }
);

export const deleteBill = createAsyncThunk(
  'bills/deleteBill',
  async (id: number, { rejectWithValue }) => {
    try {
      await billsAPI.deleteBill(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete bill');
    }
  }
);

const billsSlice = createSlice({
  name: 'bills',
  initialState,
  reducers: {
    setCurrentBill: (state, action) => {
      state.currentBill = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch bills
    builder
      .addCase(fetchBills.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBills.fulfilled, (state, action) => {
        state.isLoading = false;
        state.bills = action.payload;
      })
      .addCase(fetchBills.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch single bill
    builder
      .addCase(fetchBill.fulfilled, (state, action) => {
        state.currentBill = action.payload;
      });

    // Create bill
    builder
      .addCase(createBill.fulfilled, (state, action) => {
        state.bills.push(action.payload);
      });

    // Finalize bill
    builder
      .addCase(finalizeBill.fulfilled, (state, action) => {
        const bill = state.bills.find(b => b.id === action.payload);
        if (bill) {
          bill.status = 'finalized';
        }
        if (state.currentBill?.id === action.payload) {
          state.currentBill.status = 'finalized';
        }
      });

    // Delete bill
    builder
      .addCase(deleteBill.fulfilled, (state, action) => {
        state.bills = state.bills.filter(bill => bill.id !== action.payload);
        if (state.currentBill?.id === action.payload) {
          state.currentBill = null;
        }
      });
  },
});

export const { setCurrentBill, clearError } = billsSlice.actions;
export default billsSlice.reducer;