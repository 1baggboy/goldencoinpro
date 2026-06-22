import { Router } from 'express';
import { SupportService } from '../services/SupportService';
import { EmailService } from '../services/EmailService';
import { db } from '../lib/firebase';
import { authenticate, AuthRequest } from '../middleware/auth';

export const supportRouter = Router();

supportRouter.post('/ticket', authenticate, async (req: AuthRequest, res) => {
  try {
    const { subject, message } = req.body;
    const ticket = await SupportService.createTicket(req.user!.userId, subject, message);
    res.json(ticket);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

supportRouter.post('/ticket/notify', authenticate, async (req: AuthRequest, res) => {
  try {
    const { ticketId, ticketNumber, subject, message } = req.body;
    // EmailService.sendSupportTicketAlert needs a user object and a ticket object
    const userSnap = await db!.collection('users').doc(req.user!.userId).get();
    const user = { ...userSnap.data(), id: req.user!.userId };
    const ticket = { id: ticketId, ticketNumber, subject, status: 'open' };
    
    await EmailService.sendSupportTicketAlert(user, ticket);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

supportRouter.post('/reply', authenticate, async (req: AuthRequest, res) => {
  try {
    const { ticketId, message } = req.body;
    const reply = await SupportService.replyToTicket(ticketId, req.user!.userId, 'USER', message);
    res.json(reply);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

supportRouter.post('/ticket/reply', authenticate, async (req: AuthRequest, res) => {
  try {
    const { ticketId, message } = req.body;
    // This is the admin reply route
    const reply = await SupportService.replyToTicket(ticketId, req.user!.userId, 'ADMIN', message);
    res.json(reply);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
