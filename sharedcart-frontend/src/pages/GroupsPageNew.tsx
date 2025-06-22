// frontend/src/pages/GroupsPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Fab,
} from '@mui/material';
import {
  Add as AddIcon,
} from '@mui/icons-material';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { 
  fetchGroups, 
  createGroup, 
  deleteGroup,
  updateGroup,
  setCurrentGroup,
  addMember,
  removeMember,
} from '../store/slices/groupsSlice';
import CreateGroupForm from '../components/groups/CreateGroupForm';
import GroupList from '../components/groups/GroupList';
import ManageMembersDialog from '../components/groups/ManageMembersDialog';
import EditGroupDialog from '../components/groups/EditGroupDialog';
import { Group, CreateGroupRequest } from '../types';

const GroupsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { groups, isLoading, error, currentGroup } = useAppSelector(state => state.groups);
  const { user } = useAppSelector(state => state.auth);
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedGroupForMembers, setSelectedGroupForMembers] = useState<Group | null>(null);
  const [selectedGroupForEdit, setSelectedGroupForEdit] = useState<Group | null>(null);

  useEffect(() => {
    dispatch(fetchGroups());
  }, [dispatch]);

  const handleCreateGroup = (groupData: any) => {
    dispatch(createGroup(groupData))
      .unwrap()
      .then(() => {
        setCreateDialogOpen(false);
        dispatch(fetchGroups());
      })
      .catch((error) => {
        console.error('Failed to create group:', error);
      });
  };

  const handleEditGroup = (group: Group) => {
    setSelectedGroupForEdit(group);
    setEditDialogOpen(true);
  };

  const handleUpdateGroup = (groupId: number, data: CreateGroupRequest) => {
    dispatch(updateGroup({ id: groupId, data }))
      .unwrap()
      .then(() => {
        setEditDialogOpen(false);
        setSelectedGroupForEdit(null);
      })
      .catch((error) => {
        console.error('Failed to update group:', error);
      });
  };

  const handleDeleteGroup = (groupId: number) => {
    if (window.confirm('Are you sure you want to delete this group? All bills and data will be lost.')) {
      dispatch(deleteGroup(groupId))
        .unwrap()
        .then(() => {
          dispatch(fetchGroups());
        })
        .catch((error) => {
          console.error('Failed to delete group:', error);
        });
    }
  };

  const handleViewGroup = (group: Group) => {
    // TODO: Implement view group details
    console.log('View group:', group);
  };

  const handleManageMembers = (group: Group) => {
    setSelectedGroupForMembers(group);
    setMembersDialogOpen(true);
  };

  const handleSelectGroup = (group: Group) => {
    dispatch(setCurrentGroup(group));
  };

  const handleAddMember = async (groupId: number, email: string): Promise<void> => {
    console.log('GroupsPage: Adding member', { groupId, email });
    try {
      console.log('GroupsPage: Dispatching addMember thunk...');
      await dispatch(addMember({ groupId, email })).unwrap();
      console.log('GroupsPage: Member added, refreshing groups...');
      // Refresh the groups to get updated member information
      await dispatch(fetchGroups()).unwrap();
      console.log('GroupsPage: Groups refreshed successfully');
    } catch (error: any) {
      console.error('GroupsPage: Failed to add member:', error);
      throw new Error(error || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (groupId: number, userId: number): Promise<void> => {
    try {
      await dispatch(removeMember({ groupId, userId })).unwrap();
      // Refresh the groups to get updated member information
      await dispatch(fetchGroups()).unwrap();
    } catch (error: any) {
      throw new Error(error || 'Failed to remove member');
    }
  };

  if (!user) {
    return (
      <Alert severity="error">
        Please log in to view groups.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          My Groups
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Group
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Groups List */}
      <GroupList
        groups={groups}
        currentUser={user}
        onEdit={handleEditGroup}
        onDelete={handleDeleteGroup}
        onView={handleViewGroup}
        onManageMembers={handleManageMembers}
        onSelect={handleSelectGroup}
        selectedGroupId={currentGroup?.id}
      />

      {/* Create Group Dialog */}
      <CreateGroupForm
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleCreateGroup}
        isLoading={isLoading}
        error={error}
      />

      {/* Edit Group Dialog */}
      <EditGroupDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedGroupForEdit(null);
        }}
        onSubmit={handleUpdateGroup}
        group={selectedGroupForEdit}
        isLoading={isLoading}
        error={error}
      />

      {/* Manage Members Dialog */}
      <ManageMembersDialog
        open={membersDialogOpen}
        onClose={() => {
          setMembersDialogOpen(false);
          setSelectedGroupForMembers(null);
        }}
        group={selectedGroupForMembers}
        currentUser={user}
        onAddMember={handleAddMember}
        onRemoveMember={handleRemoveMember}
        isLoading={isLoading}
        error={error}
      />

      {/* Floating Action Button for mobile */}
      <Fab
        color="primary"
        aria-label="create group"
        onClick={() => setCreateDialogOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', sm: 'none' }
        }}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
};

export default GroupsPage;
