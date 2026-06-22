import { Router } from 'express';
import { TransactionService } from '../services/TransactionService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { BitcoinService } from '../services/BitcoinService';
import { db } from '../lib/firebase';

export const transactionRouter = Router();

transactionRouter.post('/deposit', authenticate, async (req: AuthRequest, res) => {
  try {
    const { amount, method } = req.body;
    const tx = await TransactionService.createDeposit(req.user!.userId, amount, method);
    res.json(tx);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

transactionRouter.post('/setup-wallet', authenticate, async (req: AuthRequest, res) => {
  try {
    const userRef = db.collection('users').doc(req.user!.userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists || !userDoc.data()?.btcAddress) {
       const btcWallet = BitcoinService.generateWallet();
       await userRef.set({ btcAddress: btcWallet.address }, { merge: true });
       
       await db.collection('users').doc(req.user!.userId).collection('privateData').doc('wallet').set({
         btcPrivateKey: btcWallet.privateKey,
         address: btcWallet.address,
         createdAt: new Date()
       });
       
       res.json({ success: true, address: btcWallet.address });
    } else {
       res.json({ success: true, address: userDoc.data()?.btcAddress });
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

transactionRouter.post('/sync-bitcoin', authenticate, async (req: AuthRequest, res) => {
  try {
    const { btcAddress } = req.body;
    if (btcAddress) {
       await BitcoinService.syncTransactions(req.user!.userId, btcAddress);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

transactionRouter.post('/send-bitcoin', authenticate, async (req: AuthRequest, res) => {
  try {
    const { toAddress, amountUsd, amountBtc } = req.body;
    const result = await BitcoinService.sendBitcoin(req.user!.userId, toAddress, amountUsd, amountBtc);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

transactionRouter.post('/withdraw', authenticate, async (req: AuthRequest, res) => {
  try {
    const { amount, method, details } = req.body;
    const tx = await TransactionService.createWithdrawal(req.user!.userId, amount, method, details);
    res.json(tx);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

transactionRouter.post('/export', authenticate, async (req: AuthRequest, res) => {
  try {
    const { email } = req.body;
    const transactions = await TransactionService.exportTransactions(req.user!.userId);
    
    // Simple CSV generator
    const header = "ID,Type,Amount,Status,Date\n";
    const rows = transactions.map((tx: any) => 
      `${tx.id},${tx.type},${tx.amount || tx.amountBtc || 0},${tx.status},${tx.createdAt instanceof Date ? tx.createdAt.toISOString() : tx.createdAt}`
    ).join("\n");
    
    const csvContent = header + rows;
    
    if (email) {
      // Need EmailService to support attachments.
      // For now, simple implementation to just send the CSV data in the body if email is requested, or not supported. 
      // User said "also". Maybe a separate button to email? Or a dropdown.
      // Let's implement an email sending route separately.
      return res.status(501).json({ error: "Email attachment not yet supported." });
    }
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
    res.send(csvContent);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
