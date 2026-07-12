import { v4 as uuidv4 } from 'uuid';
import admin from 'firebase-admin';
import { EmailService } from './EmailService';
import { db, messaging } from '../lib/firebase';

export class TransactionService {
  static async createDeposit(userId: string, amount: number, method: string) {
    if (!db) throw new Error("Firebase Admin not initialized");
    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) throw new Error("User not found");

    const user = { ...userDoc.data(), id: userId } as any;

    const reference = `DEP-${uuidv4().substring(0, 8).toUpperCase()}`;
    
    const tx = {
      userId,
      amount,
      type: 'DEPOSIT',
      status: 'PENDING',
      method,
      reference,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('transactions').add(tx);

    await EmailService.sendTransactionAlert(user, tx);
    
    return tx;
  }

  static async createWithdrawal(userId: string, amount: number, method: string, details: string) {
    if (!db) throw new Error("Firebase Admin not initialized");

    if (amount < 50) throw new Error("Minimum withdrawal amount is $50");

    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) throw new Error("User not found");

    const user = { ...userDoc.data(), id: userId } as any;

    if (user.usdBalance < amount) throw new Error("Insufficient balance");

    // Deduct balance immediately
    const btcPrice = 67000; // Fallback or fetch current
    const amountBtc = amount / btcPrice;
    
    await userDocRef.update({ 
      usdBalance: admin.firestore.FieldValue.increment(-amount),
      btcBalance: admin.firestore.FieldValue.increment(-amountBtc),
      tradingBalanceBtc: admin.firestore.FieldValue.increment(-amountBtc)
    });

    const reference = `WTH-${uuidv4().substring(0, 8).toUpperCase()}`;

    const tx = {
      userId,
      amount,
      type: 'WITHDRAWAL',
      status: 'PENDING',
      method,
      details,
      reference,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('transactions').add(tx);

    await EmailService.sendTransactionAlert(user, tx);

    return tx;
  }

  static async approveTransaction(txId: string) {
    if (!db) throw new Error("Firebase Admin not initialized");
    const txRef = db.collection('transactions').doc(txId);
    const txDoc = await txRef.get();
    
    if (!txDoc.exists) throw new Error("Transaction not found");
    const tx = txDoc.data() as any;

    const currentStatus = (tx.status || '').toUpperCase();
    if (currentStatus !== 'PENDING') throw new Error("Transaction already processed");

    await txRef.update({ 
      status: 'SUCCESS',
      updatedAt: new Date()
    });

    const updatedTx = { ...tx, status: 'SUCCESS' };

    const userRef = db.collection('users').doc(tx.userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) throw new Error("User not found");
    const user = { ...userDoc.data(), id: tx.userId } as any;

    const txTypeUpper = (tx.type || '').toUpperCase();
    if (txTypeUpper === 'DEPOSIT') {
      const amountUsd = tx.amountUsd || tx.amount || 0;
      // If amountBtc is missing, try to calculate it based on a reasonable fallback price if possible
      // but primarily rely on tx.amountBtc if it was provided at creation (e.g., in Deposit.tsx)
      const amountBtc = tx.amountBtc || (amountUsd / 67000); 

      await userRef.update({ 
        usdBalance: admin.firestore.FieldValue.increment(amountUsd),
        totalDepositedUsd: admin.firestore.FieldValue.increment(amountUsd),
        btcBalance: admin.firestore.FieldValue.increment(amountBtc),
        tradingBalanceBtc: admin.firestore.FieldValue.increment(amountBtc),
        totalDeposited: admin.firestore.FieldValue.increment(amountBtc)
      });
    }
    // Withdrawal balance already deducted at request time

    await EmailService.sendTransactionAlert(user, updatedTx);

    // Send real-time browser FCM push notifications
    const fcmTokens = user.fcmTokens || [];
    if (messaging && Array.isArray(fcmTokens) && fcmTokens.length > 0) {
      try {
        const title = tx.type === 'DEPOSIT' ? 'Deposit Approved 🎉' : 'Withdrawal Approved 🎉';
        const body = tx.type === 'DEPOSIT'
          ? `Your deposit of $${tx.amount.toLocaleString()} has been credited to your account.`
          : `Your withdrawal of $${tx.amount.toLocaleString()} was successfully processed.`;

        console.log(`[FCM] Sending push notification to user ${user.id} on ${fcmTokens.length} devices.`);
        const payload = {
          notification: {
            title,
            body
          },
          tokens: fcmTokens
        };

        const response = await messaging.sendEachForMulticast(payload);
        console.log(`[FCM] Sent: ${response.successCount} succeeded, ${response.failureCount} failed.`);

        if (response.failureCount > 0) {
          const invalidTokens: string[] = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              const errorCode = resp.error?.code;
              if (
                errorCode === 'messaging/invalid-registration-token' ||
                errorCode === 'messaging/registration-token-not-registered'
              ) {
                invalidTokens.push(fcmTokens[idx]);
              }
            }
          });
          if (invalidTokens.length > 0) {
            await userRef.update({
              fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens)
            });
            console.log(`[FCM] Cleaned up ${invalidTokens.length} expired or invalid tokens`);
          }
        }
      } catch (error) {
        console.error('[FCM] Error sending multicast push notification:', error);
      }
    }

    return updatedTx;
  }

  static async rejectTransaction(txId: string, reason: string) {
    if (!db) throw new Error("Firebase Admin not initialized");
    const txRef = db.collection('transactions').doc(txId);
    const txDoc = await txRef.get();
    
    if (!txDoc.exists) throw new Error("Transaction not found");
    const tx = txDoc.data() as any;

    const currentStatus = (tx.status || '').toUpperCase();
    if (currentStatus !== 'PENDING') throw new Error("Transaction already processed");

    await txRef.update({ 
      status: 'REJECTED',
      rejectionReason: reason,
      updatedAt: new Date()
    });

    const updatedTx = { ...tx, status: 'REJECTED', rejectionReason: reason };

    const userRef = db.collection('users').doc(tx.userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) throw new Error("User not found");
    const user = { ...userDoc.data(), id: tx.userId } as any;

    const txTypeUpper = (tx.type || '').toUpperCase();
    if (txTypeUpper === 'WITHDRAWAL') {
      // Refund balance
      const amountBtc = tx.amountBtc || 0;
      const amountUsd = tx.amountUsd || tx.amount || 0;
      await userRef.update({ 
        btcBalance: admin.firestore.FieldValue.increment(amountBtc),
        tradingBalanceBtc: admin.firestore.FieldValue.increment(amountBtc),
        usdBalance: admin.firestore.FieldValue.increment(amountUsd)
      });
    }

    await EmailService.sendTransactionAlert(user, updatedTx);

    return updatedTx;
  }

  static async exportTransactions(userId: string) {
    if (!db) throw new Error("Firebase Admin not initialized");
    
    const snapshot = await db.collection('transactions')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .get();
      
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

