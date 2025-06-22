// frontend/src/components/groups/EditGroupDialog.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Group, CreateGroupRequest } from '../../types';

interface EditGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (groupId: number, data: CreateGroupRequest) => void;
  group: Group | null;
  isLoading: boolean;
  error: string | null;
}

const EditGroupDialog: React.FC<EditGroupDialogProps> = ({
  open,
  onClose,
  onSubmit,
  group,
  isLoading,
  error,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (group && open) {
      setFormData({
        name: group.name,
        description: group.description || '',
      });
    }
  }, [group, open]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Group name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Group name must be at least 2 characters';
    } else if (formData.name.trim().length > 50) {
      errors.name = 'Group name must be less than 50 characters';
    }
    
    if (formData.description && formData.description.length > 200) {
      errors.description = 'Description must be less than 200 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!group) return;
    
    if (validateForm()) {
      const submitData: CreateGroupRequest = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      };
      onSubmit(group.id, submitData);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
    });
    setValidationErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Group</DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Group Name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={!!validationErrors.name}
            helperText={validationErrors.name}
            placeholder="e.g., Roommates, Trip to Europe, Office Lunch"
            margin="normal"
            disabled={isLoading}
            autoFocus
          />
          
          <TextField
            fullWidth
            label="Description (Optional)"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            error={!!validationErrors.description}
            helperText={validationErrors.description || `${formData.description.length}/200 characters`}
            placeholder="Brief description of what this group is for"
            margin="normal"
            multiline
            rows={3}
            disabled={isLoading}
          />
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Updating...
            </>
          ) : (
            'Update Group'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditGroupDialog;
