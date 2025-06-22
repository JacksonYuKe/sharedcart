// frontend/src/store/slices/groupsSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Group, CreateGroupRequest } from '../../types';
import { groupsAPI } from '../../services/api';

interface GroupsState {
  groups: Group[];
  currentGroup: Group | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: GroupsState = {
  groups: [],
  currentGroup: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchGroups = createAsyncThunk(
  'groups/fetchGroups',
  async (_, { rejectWithValue }) => {
    try {
      const response = await groupsAPI.getGroups();
      return response.data.groups;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch groups');
    }
  }
);

export const fetchGroup = createAsyncThunk(
  'groups/fetchGroup',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await groupsAPI.getGroup(id);
      return response.data.group;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch group');
    }
  }
);

export const createGroup = createAsyncThunk(
  'groups/createGroup',
  async (groupData: CreateGroupRequest, { rejectWithValue }) => {
    try {
      const response = await groupsAPI.createGroup(groupData);
      return response.data.group;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create group');
    }
  }
);

export const updateGroup = createAsyncThunk(
  'groups/updateGroup',
  async ({ id, data }: { id: number; data: CreateGroupRequest }, { rejectWithValue }) => {
    try {
      const response = await groupsAPI.updateGroup(id, data);
      return response.data.group;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update group');
    }
  }
);

export const deleteGroup = createAsyncThunk(
  'groups/deleteGroup',
  async (id: number, { rejectWithValue }) => {
    try {
      await groupsAPI.deleteGroup(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete group');
    }
  }
);

export const addMember = createAsyncThunk(
  'groups/addMember',
  async ({ groupId, email }: { groupId: number; email: string }, { rejectWithValue }) => {
    try {
      console.log('Redux thunk: Adding member', { groupId, email });
      const response = await groupsAPI.addMember(groupId, email);
      console.log('Redux thunk: Member added successfully', response.data);
      return { groupId, email };
    } catch (error: any) {
      console.error('Redux thunk: Failed to add member', error);
      return rejectWithValue(error.response?.data?.error || 'Failed to add member');
    }
  }
);

export const removeMember = createAsyncThunk(
  'groups/removeMember',
  async ({ groupId, userId }: { groupId: number; userId: number }, { rejectWithValue }) => {
    try {
      await groupsAPI.removeMember(groupId, userId);
      return { groupId, userId };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to remove member');
    }
  }
);

const groupsSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    setCurrentGroup: (state, action) => {
      state.currentGroup = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch groups
    builder
      .addCase(fetchGroups.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.isLoading = false;
        state.groups = action.payload;
      })
      .addCase(fetchGroups.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch single group
    builder
      .addCase(fetchGroup.fulfilled, (state, action) => {
        state.currentGroup = action.payload;
      });

    // Create group
    builder
      .addCase(createGroup.fulfilled, (state, action) => {
        state.groups.push(action.payload);
      });

    // Update group
    builder
      .addCase(updateGroup.fulfilled, (state, action) => {
        const index = state.groups.findIndex(group => group.id === action.payload.id);
        if (index !== -1) {
          state.groups[index] = action.payload;
        }
        if (state.currentGroup?.id === action.payload.id) {
          state.currentGroup = action.payload;
        }
      });

    // Delete group
    builder
      .addCase(deleteGroup.fulfilled, (state, action) => {
        state.groups = state.groups.filter(group => group.id !== action.payload);
        if (state.currentGroup?.id === action.payload) {
          state.currentGroup = null;
        }
      });

    // Add member - refresh groups to get updated member list
    builder
      .addCase(addMember.fulfilled, (state, action) => {
        // We'll refresh the groups list after adding a member
        // This ensures we get the complete member information
      });

    // Remove member - refresh groups to get updated member list  
    builder
      .addCase(removeMember.fulfilled, (state, action) => {
        // We'll refresh the groups list after removing a member
        // This ensures the member list is up to date
      });
  },
});

export const { setCurrentGroup, clearError } = groupsSlice.actions;
export default groupsSlice.reducer;