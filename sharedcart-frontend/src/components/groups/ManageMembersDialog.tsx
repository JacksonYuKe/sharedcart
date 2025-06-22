// frontend/src/components/groups/ManageMembersDialog.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  Typography,
  Alert,
  Chip,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { Group, GroupMember, User } from '../../types';

interface ManageMembersDialogProps {
  open: boolean;
  onClose: () => void;
  group: Group | null;
  currentUser: User;
  onAddMember: (groupId: number, email: string) => Promise<void>;
  onRemoveMember: (groupId: number, userId: number) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const ManageMembersDialog: React.FC<ManageMembersDialogProps> = ({
  open,
  onClose,
  group,
  currentUser,
  onAddMember,
  onRemoveMember,
  isLoading,
  error,
}) => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    if (!open) {
      setEmail('');
      setEmailError('');
    }
  }, [open]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleAddMember = async () => {
    if (!group) return;
    console.log('ManageMembersDialog: handleAddMember called', {
      groupId: group.id,
      email: email,
      currentUser: currentUser.id,
      isAdmin: isGroupAdmin(currentUser.id),
      groupMembers: group.members
    });

    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Check if user is already a member
    const existingMember = group.members?.find(
      member => member.user?.email?.toLowerCase() === email.toLowerCase()
    );

    console.log('ManageMembersDialog: Checking for existing member', {
      email: email.toLowerCase(),
      existingMember,
      allMembers: group.members?.map(m => ({ id: m.id, email: m.user?.email, role: m.role }))
    });

    if (existingMember) {
      setEmailError('This user is already a member of the group');
      return;
    }

    setAddingMember(true);
    try {
      console.log('ManageMembersDialog: Making API call to add member...');
      await onAddMember(group.id, email);
      console.log('ManageMembersDialog: Member added successfully');
      setEmail('');
      setEmailError('');
    } catch (error: any) {
      console.error('ManageMembersDialog: Failed to add member:', error);
      setEmailError(error.message || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!group) return;

    const member = group.members?.find(m => m.user_id === userId);
    if (!member?.user?.name) return;

    if (window.confirm(`Are you sure you want to remove ${member.user.name} from this group?`)) {
      try {
        await onRemoveMember(group.id, userId);
      } catch (error: any) {
        console.error('Failed to remove member:', error);
      }
    }
  };

  const isGroupAdmin = (userId: number) => {
    if (!group) return false;
    return group.created_by_id === userId || 
           group.members?.some(member => 
             member.user_id === userId && member.role === 'admin'
           );
  };

  const canRemoveMember = (member: GroupMember) => {
    // Can't remove yourself
    if (member.user_id === currentUser.id) return false;
    
    // Only admins can remove members
    if (!isGroupAdmin(currentUser.id)) return false;
    
    // Can't remove the group creator unless you are the creator
    if (member.user_id === group?.created_by_id && currentUser.id !== group?.created_by_id) return false;
    
    return true;
  };

  if (!group) return null;

  const members = group.members || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon />
          <Typography variant="h6">
            Manage Members - {group.name}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Add Member Section */}
        {isGroupAdmin(currentUser.id) ? (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Add New Member
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                label="Email Address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                error={!!emailError}
                helperText={emailError}
                placeholder="Enter email address to invite"
                disabled={addingMember}
                InputProps={{
                  startAdornment: <EmailIcon sx={{ mr: 1, color: 'action.active' }} />,
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddMember();
                  }
                }}
              />
              <Button
                variant="contained"
                onClick={handleAddMember}
                disabled={addingMember || !email.trim()}
                sx={{ minWidth: 100 }}
              >
                {addingMember ? (
                  <CircularProgress size={20} />
                ) : (
                  <>
                    <PersonAddIcon sx={{ mr: 0.5 }} fontSize="small" />
                    Add
                  </>
                )}
              </Button>
            </Box>
          </Box>
        ) : (
          <Alert severity="info" sx={{ mb: 3 }}>
            Only group admins can add new members. You are currently a regular member.
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Members List */}
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Current Members ({members.length})
        </Typography>

        {members.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            No members found
          </Typography>
        ) : (
          <List>
            {members.map((member) => (
              <ListItem key={member.user_id} divider>
                <ListItemAvatar>
                  <Avatar>
                    {member.user?.name?.charAt(0).toUpperCase() || 'U'}
                  </Avatar>
                </ListItemAvatar>
                
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2">
                        {member.user?.name || 'Unknown User'}
                      </Typography>
                      {member.user_id === group.created_by_id && (
                        <Chip
                          icon={<AdminIcon fontSize="small" />}
                          label="Owner"
                          size="small"
                          color="primary"
                        />
                      )}
                      {member.role === 'admin' && member.user_id !== group.created_by_id && (
                        <Chip
                          icon={<AdminIcon fontSize="small" />}
                          label="Admin"
                          size="small"
                          color="secondary"
                        />
                      )}
                      {member.user_id === currentUser.id && (
                        <Chip
                          label="You"
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {member.user?.email}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                  }
                />
                
                <ListItemSecondaryAction>
                  {canRemoveMember(member) && (
                    <IconButton
                      edge="end"
                      onClick={() => handleRemoveMember(member.user_id)}
                      color="error"
                      disabled={isLoading}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManageMembersDialog;
