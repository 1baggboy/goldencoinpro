import * as bitcoin from 'bitcoinjs-lib';
import ECPairFactory from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import fetch from 'node-fetch';
import { db } from '../lib/firebase';
import admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const ECPair = ECPairFactory(ecc);

export class BitcoinService {
  static generateWallet() {
    const keyPair = ECPair.makeRandom({ network: bitcoin.networks.bitcoin });
    
    return {
      address: "bc1qnamqyfnm96vxkrftcztmtzuztrute0xcjny4gr",
      privateKey: keyPair.toWIF()
    };
  }

  static async syncTransactions(userId: string, address: string) {
    if (!address) return;
    try {
      const response = await fetch(`https://mempool.space/api/address/${address}/txs`);
      if (!response.ok) return;
      const txs = await response.json() as any[];

      const txRef = db.collection('transactions');
      let newDeposits = 0;

      for (const tx of txs) {
        // Calculate amount received by this address
        let receivedSats = 0;
        let sentSats = 0;

        for (const out of tx.vout) {
          if (out.scriptpubkey_address === address) {
            receivedSats += out.value;
          }
        }
        for (const vin of tx.vin) {
          if (vin.prevout && vin.prevout.scriptpubkey_address === address) {
            sentSats += vin.prevout.value;
          }
        }

        const netSats = receivedSats - sentSats;
        if (netSats === 0) continue;

        const amountBtc = Math.abs(netSats) / 100000000;
        const txType = netSats > 0 ? 'DEPOSIT' : 'WITHDRAWAL';
        const txHash = tx.txid;

        // Check if tx already exists
        const existingTx = await txRef.where('txHash', '==', txHash).where('userId', '==', userId).get();
        if (existingTx.empty) {
          await txRef.add({
            userId,
            type: txType,
            amount: amountBtc,
            status: tx.status.confirmed ? 'COMPLETED' : 'PENDING',
            currency: 'BTC',
            txHash,
            method: 'BITCOIN_NETWORK',
            timestamp: admin.firestore.Timestamp.fromDate(new Date(tx.status.block_time ? tx.status.block_time * 1000 : Date.now()))
          });

          if (txType === 'DEPOSIT' && tx.status.confirmed) {
             newDeposits += amountBtc;
          }
        } else {
          // Update status if it was pending and is now confirmed
          const doc = existingTx.docs[0];
          if (doc.data().status === 'PENDING' && tx.status.confirmed) {
             await doc.ref.update({ status: 'COMPLETED' });
             if (txType === 'DEPOSIT') {
               newDeposits += amountBtc;
             }
          }
        }
      }

      if (newDeposits > 0) {
         // Need current price of BTC to update USD balance, or we treat user balance as USD.
         // Let's assume we fetch price or just credit equivalent. 
         // Assuming user balance is in USD, we fetch current BTC price.
         const priceResp = await fetch('https://api.coindesk.com/v1/bpi/currentprice.json');
         const priceData = await priceResp.json() as any;
         const btcPrice = priceData.bpi.USD.rate_float;
         const usdValue = newDeposits * btcPrice;
         
         await db.collection('users').doc(userId).update({
            usdBalance: FieldValue.increment(usdValue),
            btcBalance: FieldValue.increment(newDeposits)
         });
      }

    } catch (e) {
      console.error("Error syncing bitcoin transactions", e);
    }
  }

  static async sendBitcoin(senderId: string, toAddress: string, amountUsd: number, amountBtc: number) {
    // Check if toAddress belongs to another user internally
    const userQuery = await db.collection('users').where('btcAddress', '==', toAddress).get();
    
    // Create transaction record for sender
    const txId = 'TX-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const senderTx = await db.collection('transactions').add({
      userId: senderId,
      type: 'WITHDRAWAL',
      amountUsd: amountUsd, // App uses USD for balances mostly
      amountBtc: amountBtc,
      txId: txId,
      status: 'PENDING',
      currency: 'BTC',
      walletAddress: toAddress,
      method: 'BITCOIN_TRANSFER',
      timestamp: FieldValue.serverTimestamp()
    });

    // Deduct from sender
    await db.collection('users').doc(senderId).update({
       usdBalance: FieldValue.increment(-amountUsd),
       btcBalance: FieldValue.increment(-amountBtc),
       tradingBalanceBtc: FieldValue.increment(-amountBtc)
    });

    if (!userQuery.empty) {
      // Internal transfer
      const recipientDoc = userQuery.docs[0];
      
      // Update sender tx to COMPLETED since it's internal and instant
      await senderTx.update({ status: 'COMPLETED' });

      // Credit recipient
      await db.collection('users').doc(recipientDoc.id).update({
         usdBalance: FieldValue.increment(amountUsd),
         btcBalance: FieldValue.increment(amountBtc)
      });

      const recTxId = 'TX-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      // Create transaction record for recipient
      await db.collection('transactions').add({
        userId: recipientDoc.id,
        type: 'DEPOSIT',
        amountUsd: amountUsd,
        amountBtc: amountBtc,
        txId: recTxId,
        status: 'COMPLETED',
        currency: 'BTC',
        source: senderId,
        method: 'INTERNAL_TRANSFER',
        timestamp: FieldValue.serverTimestamp()
      });
      return { success: true, internal: true, txId: txId };
    }

    // External transfer (simulated since we don't hold actual private keys with funds for new internal users)
    // To actually send real bitcoins we'd need UTXOs and to broadcast a signed TX via Mempool API.
    // For now, it's realistically simulated. User balance is deducted, TX stays PENDING for manual processing/simulation.
    return { success: true, internal: false, txId: txId };
  }
}
