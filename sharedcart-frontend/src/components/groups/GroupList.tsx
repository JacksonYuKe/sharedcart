// frontend/src/components/groups/GroupList.tsx
import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  AvatarGroup,
  Tooltip,
  Button,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  PersonAdd as PersonAddIcon,
  Group as GroupIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { Group, User } from '../../types';

interface GroupListProps {
  groups: Group[];
  currentUser: User;
  onEdit: (group: Group) => void;
  onDelete: (groupId: number) => void;
  onView: (group: Group) => void;
  onManageMembers: (group: Group) => void;
  onSelect: (group: Group) => void;
  selectedGroupId?: number;
}

const GroupList: React.FC<GroupListProps> = ({
  groups,
  currentUser,
  onEdit,
  onDelete,
  onView,
  onManageMembers,
  onSelect,
  selectedGroupId,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, group: Group) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedGroup(group);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedGroup(null);
  };

  const handleEdit = () => {
    if (selectedGroup) {
      onEdit(selectedGroup);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedGroup) {
      onDelete(selectedGroup.id);
    }
    handleMenuClose();
  };

  const handleView = () => {
    if (selectedGroup) {
      onView(selectedGroup);
    }
    handleMenuClose();
  };

  const handleManageMembers = () => {
    if (selectedGroup) {
      onManageMembers(selectedGroup);
    }
    handleMenuClose();
  };

  const isGroupAdmin = (group: Group) => {
    return group.created_by_id === currentUser.id || 
           group.members?.some(member => 
             member.user_id === currentUser.id && member.role === 'admin'
           );
  };

  const getMemberAvatars = (group: Group) => {
    const members = group.members || [];
    return members.slice(0, 4).map((member) => (
      <Tooltip key={member.user_id} title={member.user?.name || `User ${member.user_id}`}>
        <Avatar sx={{ width: 32, height: 32 }}>
          {member.user?.name?.charAt(0).toUpperCase() || 'U'}
        </Avatar>
      </Tooltip>
    ));
  };

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <GroupIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No groups found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create your first group to start tracking shared expenses
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {groups.map((group) => (
        <Card 
          key={group.id} 
          sx={{ 
            mb: 2, 
            cursor: 'pointer',
            border: selectedGroupId === group.id ? 2 : 1,
            borderColor: selectedGroupId === group.id ? 'primary.main' : 'divider',
            '&:hover': {
              boxShadow: 2,
            }
          }}
          onClick={() => onSelect(group)}
        >
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={8}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    {group.name}
                  </Typography>
                  
                  {isGroupAdmin(group) && (
                    <Chip
                      icon={<AdminIcon fontSize="small" />}
                      label="Admin"
                      color="primary"
                      size="small"
                      sx={{ mr: 1 }}
                    />
                  )}
                  
                  <Chip
                    icon={<PersonIcon fontSize="small" />}
                    label={`${group.members?.length || 0} members`}
                    size="small"
                    variant="outlined"
                  />
                </Box>
                
                {group.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {group.description}
                  </Typography>
                )}
                
                <Typography variant="caption" color="text.secondary">
                  Created {format(new Date(group.created_at), 'MMM dd, yyyy')}
                  {group.created_by?.name && ` by ${group.created_by.name}`}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={3}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
                  <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 32, height: 32 } }}>
                    {getMemberAvatars(group)}
                  </AvatarGroup>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={1}>
                <IconButton
                  onClick={(e) => handleMenuOpen(e, group)}
                  size="small"
                >
                  <MoreVertIcon />
                </IconButton>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ))}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleView}>
          <ViewIcon sx={{ mr: 1 }} fontSize="small" />
          View Details
        </MenuItem>
        
        <MenuItem onClick={handleManageMembers}>
          <PersonAddIcon sx={{ mr: 1 }} fontSize="small" />
          Manage Members
        </MenuItem>
        
        {selectedGroup && isGroupAdmin(selectedGroup) && (
          <MenuItem onClick={handleEdit}>
            <EditIcon sx={{ mr: 1 }} fontSize="small" />
            Edit Group
          </MenuItem>
        )}
        
        {selectedGroup && isGroupAdmin(selectedGroup) && (
          <MenuItem onClick={handleDelete}>
            <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
            Delete Group
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};

export default GroupList;
