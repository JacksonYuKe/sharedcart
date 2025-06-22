// frontend/src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import groupsSlice from './slices/groupsSlice';
import billsSlice from './slices/billsSlice';
import settlementsSlice from './slices/settlementsSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    groups: groupsSlice,
    bills: billsSlice,
    settlements: settlementsSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;