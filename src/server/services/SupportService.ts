import { EmailService } from './EmailService';
import { db } from '../lib/firebase';

export class SupportService {
  static async createTicket(userId: string, subject: string, message: string) {
    if (!db) throw new Error("Firebase Admin not initialized");
    
    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) throw new Error("User not found");

    const user = { ...userDoc.data(), id: userId } as any;

    const ticketNumber = `GC-${Math.floor(100000 + Math.random() * 900000)}`;

    const ticketRef = await db.collection('support_tickets').add({
      userId,
      subject,
      status: 'open',
      priority: 'medium',
      ticketNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMessage: message
    });

    await db.collection('support_tickets').doc(ticketRef.id).collection('replies').add({
      message: message,
      senderId: userId,
      senderName: user.displayName || user.email?.split('@')[0] || "User",
      isAdmin: false,
      createdAt: new Date()
    });

    const ticket = { id: ticketRef.id, ticketNumber, subject, status: 'open' };
    await EmailService.sendSupportTicketAlert(user, ticket);

    return ticket;
  }

  static async replyToTicket(ticketId: string, senderId: string, senderType: 'USER' | 'ADMIN', message: string) {
    if (!db) throw new Error("Firebase Admin not initialized");
    
    const ticketRef = db.collection('support_tickets').doc(ticketId);
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) throw new Error("Ticket not found");
    const ticket = ticketDoc.data() as any;

    const userDocRef = db.collection('users').doc(ticket.userId);
    const userDoc = await userDocRef.get();
    const user = { ...userDoc.data(), id: ticket.userId } as any;

    await ticketRef.collection('replies').add({
      message,
      senderId,
      senderName: senderType === 'ADMIN' ? "Golden Coin Support" : (user.displayName || "User"),
      isAdmin: senderType === 'ADMIN',
      createdAt: new Date()
    });

    const newStatus = senderType === 'ADMIN' ? 'pending' : 'open';
    await ticketRef.update({ 
      updatedAt: new Date(),
      status: newStatus,
      lastMessage: message
    });

    if (senderType === 'ADMIN') {
      // Send email notification to user
      await EmailService.sendSupportReply(user, ticket, message);
    } else {
      // Notify admin about user reply
      await EmailService.sendAdminEmailNotification(
        `Support Ticket Update: ${ticket.subject}`,
        `User ${user.displayName || user.email} replied to ticket ${ticket.ticketNumber || ticketId}: \n\n"${message}"`
      );
    }

    return { ticketId, message, status: newStatus };
  }
}

