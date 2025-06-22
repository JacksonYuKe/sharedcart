// frontend/src/store/slices/settlementsSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Settlement, SettlementResult } from '../../types';
import { settlementsAPI } from '../../services/api';

interface SettlementsState {
  settlements: Settlement[];
  currentSettlement: Settlement | null;
  lastCalculation: SettlementResult | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: SettlementsState = {
  settlements: [],
  currentSettlement: null,
  lastCalculation: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const calculateSettlement = createAsyncThunk(
  'settlements/calculateSettlement',
  async ({ groupId, billIds }: { groupId: number; billIds: number[] }, { rejectWithValue }) => {
    try {
      const response = await settlementsAPI.calculateSettlement(groupId, billIds);
      return response.data.settlement;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to calculate settlement');
    }
  }
);

export const createSettlement = createAsyncThunk(
  'settlements/createSettlement',
  async ({ groupId, billIds }: { groupId: number; billIds: number[] }, { rejectWithValue }) => {
    try {
      const response = await settlementsAPI.createSettlement(groupId, billIds);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create settlement');
    }
  }
);

export const fetchSettlements = createAsyncThunk(
  'settlements/fetchSettlements',
  async ({ groupId, status }: { groupId: number; status?: string }, { rejectWithValue }) => {
    try {
      const response = await settlementsAPI.getSettlements(groupId, status);
      return response.data.settlements;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch settlements');
    }
  }
);

export const confirmSettlement = createAsyncThunk(
  'settlements/confirmSettlement',
  async (id: number, { rejectWithValue }) => {
    try {
      await settlementsAPI.confirmSettlement(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to confirm settlement');
    }
  }
);

const settlementsSlice = createSlice({
  name: 'settlements',
  initialState,
  reducers: {
    setCurrentSettlement: (state, action) => {
      state.currentSettlement = action.payload;
    },
    clearCalculation: (state) => {
      state.lastCalculation = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Calculate settlement
    builder
      .addCase(calculateSettlement.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(calculateSettlement.fulfilled, (state, action) => {
        state.isLoading = false;
        state.lastCalculation = action.payload;
      })
      .addCase(calculateSettlement.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create settlement
    builder
      .addCase(createSettlement.fulfilled, (state, action) => {
        state.settlements.push(action.payload.settlement);
        state.lastCalculation = action.payload.calculation;
      });

    // Fetch settlements
    builder
      .addCase(fetchSettlements.fulfilled, (state, action) => {
        state.settlements = action.payload;
      });

    // Confirm settlement
    builder
      .addCase(confirmSettlement.fulfilled, (state, action) => {
        const settlement = state.settlements.find(s => s.id === action.payload);
        if (settlement) {
          settlement.status = 'confirmed';
        }
        if (state.currentSettlement?.id === action.payload) {
          state.currentSettlement.status = 'confirmed';
        }
      });
  },
});

export const { setCurrentSettlement, clearCalculation, clearError } = settlementsSlice.actions;
export default settlementsSlice.reducer;