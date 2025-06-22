// frontend/src/components/settlements/SettlementCalculator.tsx
import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Divider,
  Avatar,
} from '@mui/material';
import {
  Calculate as CalculateIcon,
  AccountBalance as BalanceIcon,
  SwapHoriz as TransferIcon,
  CheckCircle as CheckIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { SettlementResult, Bill, Group } from '../../types';

interface SettlementCalculatorProps {
  group: Group;
  bills: Bill[];
  onCalculate: (billIds: number[]) => Promise<SettlementResult>;
  onConfirmSettlement: (settlement: SettlementResult) => void;
  isLoading: boolean;
  error: string | null;
}

const SettlementCalculator: React.FC<SettlementCalculatorProps> = ({
  group,
  bills,
  onCalculate,
  onConfirmSettlement,
  isLoading,
  error,
}) => {
  const [selectedBills, setSelectedBills] = useState<number[]>([]);
  const [settlementResult, setSettlementResult] = useState<SettlementResult | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const unsettledBills = bills.filter(bill => bill.status !== 'settled');

  const handleBillToggle = (billId: number) => {
    setSelectedBills(prev => 
      prev.includes(billId)
        ? prev.filter(id => id !== billId)
        : [...prev, billId]
    );
  };

  const handleSelectAll = () => {
    if (selectedBills.length === unsettledBills.length) {
      setSelectedBills([]);
    } else {
      setSelectedBills(unsettledBills.map(bill => bill.id));
    }
  };

  const handleCalculate = async () => {
    if (selectedBills.length === 0) return;
    
    try {
      const result = await onCalculate(selectedBills);
      setSettlementResult(result);
    } catch (error) {
      console.error('Failed to calculate settlement:', error);
    }
  };

  const handleConfirmSettlement = () => {
    if (settlementResult) {
      onConfirmSettlement(settlementResult);
      setConfirmDialogOpen(false);
      setSettlementResult(null);
      setSelectedBills([]);
    }
  };

  const getBalanceColor = (balance: string) => {
    const amount = parseFloat(balance);
    if (amount > 0) return 'success';
    if (amount < 0) return 'error';
    return 'default';
  };

  const getBalanceIcon = (balance: string) => {
    const amount = parseFloat(balance);
    if (amount > 0) return '↑';
    if (amount < 0) return '↓';
    return '−';
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Settlement Calculator - {group.name}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Bill Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Select Bills to Settle</Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={handleSelectAll}
            >
              {selectedBills.length === unsettledBills.length ? 'Deselect All' : 'Select All'}
            </Button>
          </Box>

          {unsettledBills.length === 0 ? (
            <Alert severity="info">
              No unsettled bills found for this group.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {unsettledBills.map((bill) => (
                <Grid item xs={12} sm={6} md={4} key={bill.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      cursor: 'pointer',
                      border: selectedBills.includes(bill.id) ? 2 : 1,
                      borderColor: selectedBills.includes(bill.id) ? 'primary.main' : 'divider',
                      '&:hover': {
                        boxShadow: 1,
                      }
                    }}
                    onClick={() => handleBillToggle(bill.id)}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="subtitle1" noWrap>
                        {bill.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ${parseFloat(bill.total_amount).toFixed(2)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Paid by {bill.paid_by?.name}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {selectedBills.length} of {unsettledBills.length} bills selected
            </Typography>
            <Button
              variant="contained"
              startIcon={<CalculateIcon />}
              onClick={handleCalculate}
              disabled={selectedBills.length === 0 || isLoading}
            >
              {isLoading ? <CircularProgress size={20} /> : 'Calculate Settlement'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Settlement Results */}
      {settlementResult && (
        <Box>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Settlement Summary
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {settlementResult.bill_count}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Bills
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      ${parseFloat(settlementResult.total_amount).toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Amount
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {settlementResult.transactions.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Transactions
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* User Balances */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                <BalanceIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                User Balances
              </Typography>
              
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell align="right">Paid</TableCell>
                      <TableCell align="right">Owes</TableCell>
                      <TableCell align="right">Balance</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {settlementResult.balances.map((balance) => (
                      <TableRow key={balance.user_id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 24, height: 24 }}>
                              {balance.user_name.charAt(0).toUpperCase()}
                            </Avatar>
                            {balance.user_name}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          ${parseFloat(balance.paid).toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          ${parseFloat(balance.owes).toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${getBalanceIcon(balance.balance)} $${Math.abs(parseFloat(balance.balance)).toFixed(2)}`}
                            color={getBalanceColor(balance.balance) as any}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Required Transactions */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                <TransferIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Required Transactions
              </Typography>
              
              {settlementResult.transactions.length === 0 ? (
                <Alert severity="success">
                  No transactions needed! Everyone is already settled up.
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>From</TableCell>
                        <TableCell>To</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {settlementResult.transactions.map((transaction, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 24, height: 24 }}>
                                {transaction.from_user_name.charAt(0).toUpperCase()}
                              </Avatar>
                              {transaction.from_user_name}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 24, height: 24 }}>
                                {transaction.to_user_name.charAt(0).toUpperCase()}
                              </Avatar>
                              {transaction.to_user_name}
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="bold" color="primary">
                              ${parseFloat(transaction.amount).toFixed(2)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              
              <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => {
                    // TODO: Implement export functionality
                    console.log('Export settlement');
                  }}
                >
                  Export
                </Button>
                <Button
                  variant="contained"
                  startIcon={<CheckIcon />}
                  onClick={() => setConfirmDialogOpen(true)}
                  color="success"
                >
                  Confirm Settlement
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Confirm Settlement</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to confirm this settlement? This action will mark all selected bills as settled and cannot be undone.
          </Typography>
          
          {settlementResult && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Settlement Summary:</Typography>
              <Typography variant="body2">
                • {settlementResult.bill_count} bills totaling ${parseFloat(settlementResult.total_amount).toFixed(2)}
              </Typography>
              <Typography variant="body2">
                • {settlementResult.transactions.length} required transactions
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmSettlement}
            variant="contained"
            color="success"
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={20} /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SettlementCalculator;
