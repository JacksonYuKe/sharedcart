// frontend/src/pages/SettlementsPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Alert,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import {
  AccountBalance as BalanceIcon,
} from '@mui/icons-material';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { fetchGroups } from '../store/slices/groupsSlice';
import { fetchBills } from '../store/slices/billsSlice';
import { calculateSettlement, createSettlement } from '../store/slices/settlementsSlice';
import SettlementCalculator from '../components/settlements/SettlementCalculator';
import { Group, SettlementResult } from '../types';

const SettlementsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { groups } = useAppSelector(state => state.groups);
  const { bills } = useAppSelector(state => state.bills);
  const { isLoading, error } = useAppSelector(state => state.settlements);
  
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

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

  const handleCalculateSettlement = async (billIds: number[]): Promise<SettlementResult> => {
    if (!selectedGroup) {
      throw new Error('No group selected');
    }

    const result = await dispatch(calculateSettlement({
      groupId: selectedGroup.id,
      billIds,
    })).unwrap();

    return result;
  };

  const handleConfirmSettlement = (settlement: SettlementResult) => {
    if (!selectedGroup) return;

    // For now, we'll use createSettlement with the bills from the settlement
    // In a real app, you'd need to track which bills were part of the calculation
    dispatch(createSettlement({
      groupId: selectedGroup.id,
      billIds: [], // This would need to be tracked from the calculation
    }))
      .unwrap()
      .then(() => {
        // Refresh bills after settlement
        dispatch(fetchBills({ groupId: selectedGroup.id }));
      })
      .catch((error: any) => {
        console.error('Failed to confirm settlement:', error);
      });
  };

  const filteredBills = selectedGroup 
    ? bills.filter(bill => bill.group_id === selectedGroup.id)
    : [];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <BalanceIcon sx={{ mr: 2, fontSize: 32 }} />
        <Typography variant="h4" component="h1">
          Settlements
        </Typography>
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
                <Typography variant="body1" color="text.secondary">
                  Calculate and manage settlements for {selectedGroup.name}
                </Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Settlement Calculator */}
      {selectedGroup ? (
        <SettlementCalculator
          group={selectedGroup}
          bills={filteredBills}
          onCalculate={handleCalculateSettlement}
          onConfirmSettlement={handleConfirmSettlement}
          isLoading={isLoading}
          error={error}
        />
      ) : (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <BalanceIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Select a group to manage settlements
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose a group from the dropdown above to calculate and confirm settlements
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default SettlementsPage;
