// frontend/src/pages/BillsPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Fab,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
} from '@mui/material';
import {
  Add as AddIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { fetchBills, createBill, deleteBill } from '../store/slices/billsSlice';
import { fetchGroups } from '../store/slices/groupsSlice';
import CreateBillForm from '../components/bills/CreateBillForm';
import BillList from '../components/bills/BillList';
import { Bill, Group } from '../types';

const BillsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { bills, isLoading, error } = useAppSelector(state => state.bills);
  const { groups } = useAppSelector(state => state.groups);
  
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchGroups());
  }, [dispatch]);

  useEffect(() => {
    if (selectedGroup) {
      dispatch(fetchBills({ groupId: selectedGroup.id }));
    }
  }, [dispatch, selectedGroup]);

  // Set first group as default if none selected
  useEffect(() => {
    if (groups.length > 0 && !selectedGroup) {
      setSelectedGroup(groups[0]);
    }
  }, [groups, selectedGroup]);

  const handleCreateBill = (billData: any) => {
    dispatch(createBill(billData))
      .unwrap()
      .then(() => {
        setCreateDialogOpen(false);
        if (selectedGroup) {
          dispatch(fetchBills({ groupId: selectedGroup.id }));
        }
      })
      .catch((error) => {
        console.error('Failed to create bill:', error);
      });
  };

  const handleEditBill = (bill: Bill) => {
    // TODO: Implement edit functionality
    console.log('Edit bill:', bill);
  };

  const handleDeleteBill = (billId: number) => {
    if (window.confirm('Are you sure you want to delete this bill?')) {
      dispatch(deleteBill(billId))
        .unwrap()
        .then(() => {
          if (selectedGroup) {
            dispatch(fetchBills({ groupId: selectedGroup.id }));
          }
        })
        .catch((error) => {
          console.error('Failed to delete bill:', error);
        });
    }
  };

  const handleViewBill = (bill: Bill) => {
    // TODO: Implement view bill details
    console.log('View bill:', bill);
  };

  const filteredBills = selectedGroup 
    ? bills.filter(bill => bill.group_id === selectedGroup.id)
    : [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Bills
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
          disabled={!selectedGroup}
        >
          Create Bill
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Group Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel>Select Group</InputLabel>
                <Select
                  value={selectedGroup?.id || ''}
                  onChange={(e) => {
                    const group = groups.find(g => g.id === e.target.value);
                    setSelectedGroup(group || null);
                  }}
                  label="Select Group"
                >
                  {groups.map((group) => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {selectedGroup && (
              <Grid item xs={12} sm={6} md={8}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <ReceiptIcon color="action" />
                  <Typography variant="body1">
                    {filteredBills.length} bill{filteredBills.length !== 1 ? 's' : ''} in {selectedGroup.name}
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Bills List */}
      {selectedGroup ? (
        <BillList
          bills={filteredBills}
          loading={isLoading}
          onEdit={handleEditBill}
          onDelete={handleDeleteBill}
          onView={handleViewBill}
          selectedGroup={selectedGroup}
        />
      ) : (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <ReceiptIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Select a group to view bills
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose a group from the dropdown above to see its bills
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Create Bill Dialog */}
      <CreateBillForm
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleCreateBill}
        groups={groups}
        selectedGroup={selectedGroup}
        isLoading={isLoading}
        error={error}
      />

      {/* Floating Action Button for mobile */}
      <Fab
        color="primary"
        aria-label="create bill"
        onClick={() => setCreateDialogOpen(true)}
        disabled={!selectedGroup}
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

export default BillsPage;
