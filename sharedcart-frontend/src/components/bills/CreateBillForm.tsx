// frontend/src/components/bills/CreateBillForm.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  IconButton,
  Chip,
  Grid,
  Alert,
  Divider,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { CreateBillRequest, Group, User, CreateBillItemRequest } from '../../types';

interface CreateBillFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateBillRequest) => void;
  groups: Group[];
  selectedGroup: Group | null;
  isLoading: boolean;
  error: string | null;
}

interface BillItemForm extends CreateBillItemRequest {
  tempId: string;
  share_type: 'shared' | 'personal';
  assigned_to_id?: number | null;
}

const CreateBillForm: React.FC<CreateBillFormProps> = ({
  open,
  onClose,
  onSubmit,
  groups,
  selectedGroup,
  isLoading,
  error,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    group_id: selectedGroup?.id || 0,
    paid_by_id: 0,
    bill_date: new Date(),
    total_amount: '',
  });

  const [items, setItems] = useState<BillItemForm[]>([
    {
      tempId: '1',
      name: '',
      amount: '',
      quantity: 1,
      is_shared: true,
      share_type: 'shared' as const,
      assigned_to_id: null,
    },
  ]);

  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (selectedGroup) {
      setFormData(prev => ({
        ...prev,
        group_id: selectedGroup.id,
        paid_by_id: selectedGroup.members?.[0]?.user_id || 0,
      }));
    }
  }, [selectedGroup]);

  const handleChange = (field: string, value: any) => {
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

  const addItem = () => {
    const newItem: BillItemForm = {
      tempId: Date.now().toString(),
      name: '',
      amount: '',
      quantity: 1,
      is_shared: true,
      share_type: 'shared',
      assigned_to_id: null,
    };
    setItems(prev => [...prev, newItem]);
  };

  const removeItem = (tempId: string) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(item => item.tempId !== tempId));
    }
  };

  const updateItem = (tempId: string, field: keyof BillItemForm, value: any) => {
    setItems(prev =>
      prev.map(item => {
        if (item.tempId === tempId) {
          let updatedItem = { ...item, [field]: value };
          
          // Update is_shared when share_type changes
          if (field === 'share_type') {
            updatedItem.is_shared = value === 'shared';
            if (value === 'shared') {
              updatedItem.assigned_to_id = null;
            }
          }
          
          return updatedItem;
        }
        return item;
      })
    );
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      const amount = parseFloat(item.amount) || 0;
      return total + (amount * item.quantity);
    }, 0).toFixed(2);
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    
    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    }
    
    if (!formData.group_id) {
      errors.group_id = 'Please select a group';
    }
    
    if (!formData.paid_by_id) {
      errors.paid_by_id = 'Please select who paid';
    }
    
    items.forEach((item, index) => {
      if (!item.name.trim()) {
        errors[`item_${index}_name`] = 'Item name is required';
      }
      if (!item.amount || parseFloat(item.amount) <= 0) {
        errors[`item_${index}_amount`] = 'Amount must be greater than 0';
      }
      if (item.share_type === 'personal' && !item.assigned_to_id) {
        errors[`item_${index}_assigned`] = 'Please assign this personal item to someone';
      }
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    console.log('CreateBillForm: handleSubmit called', {
      formData,
      items,
      isValid: validateForm()
    });
    
    if (validateForm()) {
      const total = calculateTotal();
      const submitData: CreateBillRequest = {
        ...formData,
        bill_date: formData.bill_date.toISOString(),
        total_amount: total,
        items: items.map(({ tempId, share_type, assigned_to_id, ...item }) => ({
          ...item,
          amount: parseFloat(item.amount).toFixed(2),
          is_shared: share_type === 'shared',
          owner_ids: share_type === 'personal' && assigned_to_id ? [assigned_to_id] : undefined,
        })),
      };
      console.log('CreateBillForm: Calling onSubmit with data', submitData);
      onSubmit(submitData);
    } else {
      console.log('CreateBillForm: Form validation failed', validationErrors);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      group_id: selectedGroup?.id || 0,
      paid_by_id: 0,
      bill_date: new Date(),
      total_amount: '',
    });
    setItems([{
      tempId: '1',
      name: '',
      amount: '',
      quantity: 1,
      is_shared: true,
      share_type: 'shared',
      assigned_to_id: null,
    }]);
    setValidationErrors({});
    onClose();
  };

  const currentGroup = groups.find(g => g.id === formData.group_id);
  const groupMembers = currentGroup?.members || [];

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6">Create New Bill</Typography>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Bill Title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              error={!!validationErrors.title}
              helperText={validationErrors.title}
              placeholder="e.g., Grocery Shopping, Dinner at Restaurant"
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description (Optional)"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              multiline
              rows={2}
              placeholder="Additional details about this bill"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!validationErrors.group_id}>
              <InputLabel>Group</InputLabel>
              <Select
                value={formData.group_id}
                onChange={(e) => handleChange('group_id', e.target.value)}
                label="Group"
              >
                {groups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Bill Date"
              type="date"
              value={formData.bill_date instanceof Date 
                ? formData.bill_date.toISOString().split('T')[0] 
                : formData.bill_date
              }
              onChange={(e) => handleChange('bill_date', new Date(e.target.value))}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControl fullWidth error={!!validationErrors.paid_by_id}>
              <InputLabel>Paid By</InputLabel>
              <Select
                value={formData.paid_by_id}
                onChange={(e) => handleChange('paid_by_id', e.target.value)}
                label="Paid By"
              >
                {groupMembers.map((member) => (
                  <MenuItem key={member.user_id} value={member.user_id}>
                    {member.user?.name || `User ${member.user_id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Bill Items</Typography>
          <Button
            startIcon={<AddIcon />}
            onClick={addItem}
            variant="outlined"
            size="small"
          >
            Add Item
          </Button>
        </Box>
        
        {items.map((item, index) => (
          <Box key={item.tempId} sx={{ mb: 2, p: 2, border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Item Name"
                  value={item.name}
                  onChange={(e) => updateItem(item.tempId, 'name', e.target.value)}
                  error={!!validationErrors[`item_${index}_name`]}
                  helperText={validationErrors[`item_${index}_name`]}
                />
              </Grid>
              
              <Grid item xs={6} sm={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Amount"
                  type="number"
                  inputProps={{ min: 0, step: 0.01 }}
                  value={item.amount}
                  onChange={(e) => updateItem(item.tempId, 'amount', e.target.value)}
                  error={!!validationErrors[`item_${index}_amount`]}
                  helperText={validationErrors[`item_${index}_amount`]}
                />
              </Grid>
              
              <Grid item xs={6} sm={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Quantity"
                  type="number"
                  inputProps={{ min: 1 }}
                  value={item.quantity}
                  onChange={(e) => updateItem(item.tempId, 'quantity', parseInt(e.target.value) || 1)}
                />
              </Grid>
              
              <Grid item xs={12} sm={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={item.share_type === 'personal'}
                      onChange={(e) => updateItem(item.tempId, 'share_type', e.target.checked ? 'personal' : 'shared')}
                    />
                  }
                  label="Personal Item"
                />
              </Grid>
              
              <Grid item xs={12} sm={1}>
                <IconButton
                  onClick={() => removeItem(item.tempId)}
                  disabled={items.length === 1}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Grid>
              
              {item.share_type === 'personal' && (
                <Grid item xs={12}>
                  <FormControl fullWidth size="small" error={!!validationErrors[`item_${index}_assigned`]}>
                    <InputLabel>Assign To</InputLabel>
                    <Select
                      value={item.assigned_to_id || ''}
                      onChange={(e) => updateItem(item.tempId, 'assigned_to_id', e.target.value)}
                      label="Assign To"
                    >
                      {groupMembers.map((member) => (
                        <MenuItem key={member.user_id} value={member.user_id}>
                          {member.user?.name || `User ${member.user_id}`}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>
          </Box>
        ))}
        
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="h6" align="center">
            Total Amount: ${calculateTotal()}
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isLoading}
        >
          {isLoading ? 'Creating...' : 'Create Bill'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateBillForm;
