import { Router, Request, Response } from 'express';
import { supabase } from '../db/client.js';
import { notifySellerReply } from '../notifications/openclaw-webhook.js';

const router = Router();

router.post('/email-inbound', async (req: Request, res: Response) => {
  console.log('[Webhook] Received inbound email');

  try {
    // SendGrid Inbound Parse sends multipart/form-data or JSON
    const {
      from: senderEmail,
      subject,
      text: body,
      html,
      headers: rawHeaders,
    } = req.body;

    if (!senderEmail) {
      res.status(400).json({ error: 'Missing sender email' });
      return;
    }

    // Extract clean email from "Name <email>" format
    const emailMatch = String(senderEmail).match(/<([^>]+)>/) || [null, String(senderEmail)];
    const cleanEmail = emailMatch[1]?.trim().toLowerCase();

    if (!cleanEmail) {
      res.status(400).json({ error: 'Could not parse sender email' });
      return;
    }

    // Try to match by seller email
    const { data: conversation } = await supabase
      .from('seller_conversations')
      .select('*')
      .eq('seller_email', cleanEmail)
      .neq('status', 'closed')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (!conversation) {
      // Try to match by In-Reply-To header or subject
      console.warn(`[Webhook] No matching conversation for email from ${cleanEmail}`);
      res.json({ message: 'No matching conversation found — email logged' });
      return;
    }

    // Store inbound message
    const messageBody = body || html || '(no body)';

    await supabase
      .from('conversation_messages')
      .insert({
        conversation_id: conversation.id,
        direction: 'inbound',
        subject: subject || '(no subject)',
        body: messageBody,
        received_at: new Date().toISOString(),
      });

    // Update conversation status
    await supabase
      .from('seller_conversations')
      .update({ status: 'replied', updated_at: new Date().toISOString() })
      .eq('id', conversation.id);

    // Notify via OpenClaw
    const sellerName = String(senderEmail).match(/^([^<]+)/)?.[1]?.trim() || cleanEmail;
    await notifySellerReply({
      conversation_id: conversation.id,
      seller_name: sellerName,
      reply_body: messageBody.slice(0, 500), // Truncate for WhatsApp
    });

    res.json({ message: 'Inbound email processed', conversation_id: conversation.id });
  } catch (err) {
    console.error('[Webhook] Error processing inbound email:', err);
    res.status(500).json({ error: 'Failed to process inbound email' });
  }
});

export default router;
