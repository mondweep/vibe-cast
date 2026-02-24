import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../db/client.js';
import { renderTemplate } from '../email/templates.js';
import { sendEmail } from '../email/sendgrid.js';
import { notifySellerReply } from '../notifications/openclaw-webhook.js';

const router = Router();

const createConversationSchema = z.object({
  listing_id: z.string().uuid(),
  seller_email: z.string().email().optional(),
  template: z.enum(['initial_enquiry', 'follow_up', 'negotiate', 'decline']),
  custom_body: z.string().optional(),
  offer_price: z.number().positive().optional(),
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = createConversationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { listing_id, seller_email, template, custom_body, offer_price } = parsed.data;

  // Fetch listing
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('*')
    .eq('id', listing_id)
    .single();

  if (listingError || !listing) {
    res.status(404).json({ error: 'Listing not found' });
    return;
  }

  // Fetch user config
  const { data: config } = await supabase
    .from('user_config')
    .select('*')
    .limit(1)
    .single();

  if (!config) {
    res.status(400).json({ error: 'No user configuration found' });
    return;
  }

  // Render email template
  const rendered = custom_body
    ? { subject: `Re: ${listing.title}`, body: custom_body }
    : renderTemplate(template, {
        year: listing.year,
        variant: listing.engine_size ? `${listing.engine_size}L` : '',
        price_formatted: `£${(listing.price / 100).toFixed(0)}`,
        platform: listing.platform,
        seller_name: listing.seller_name || 'there',
        user_postcode: config.postcode,
        user_name: config.user_name,
        offer_price: offer_price ? `£${(offer_price / 100).toFixed(0)}` : undefined,
      });

  // Create conversation
  const { data: conversation, error: convError } = await supabase
    .from('seller_conversations')
    .insert({
      listing_id,
      seller_email: seller_email || null,
      status: 'awaiting_approval',
    })
    .select()
    .single();

  if (convError || !conversation) {
    res.status(500).json({ error: 'Failed to create conversation', details: convError?.message });
    return;
  }

  // Create draft message
  const { data: message, error: msgError } = await supabase
    .from('conversation_messages')
    .insert({
      conversation_id: conversation.id,
      direction: 'outbound',
      subject: rendered.subject,
      body: rendered.body,
      template_used: template,
    })
    .select()
    .single();

  if (msgError) {
    res.status(500).json({ error: 'Failed to create message', details: msgError.message });
    return;
  }

  res.status(201).json({
    conversation,
    draft_message: message,
    preview: {
      subject: rendered.subject,
      body: rendered.body,
    },
  });
});

router.get('/', async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('seller_conversations')
    .select(`
      *,
      listing:listings(id, title, price, url, platform),
      messages:conversation_messages(*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data || []);
});

router.post('/:id/approve', async (req: Request, res: Response) => {
  const conversationId = req.params.id;

  // Fetch conversation and latest draft message
  const { data: conversation } = await supabase
    .from('seller_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  if (conversation.status !== 'awaiting_approval') {
    res.status(400).json({ error: `Cannot approve — status is "${conversation.status}"` });
    return;
  }

  // Get the draft message
  const { data: draftMessage } = await supabase
    .from('conversation_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('direction', 'outbound')
    .is('sent_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!draftMessage) {
    res.status(400).json({ error: 'No draft message to send' });
    return;
  }

  if (!conversation.seller_email) {
    res.status(400).json({ error: 'No seller email address — set it first' });
    return;
  }

  // Get config for outbound email
  const { data: config } = await supabase
    .from('user_config')
    .select('outbound_email')
    .limit(1)
    .single();

  if (!config?.outbound_email) {
    res.status(400).json({ error: 'No outbound email configured in user config' });
    return;
  }

  // Send via SendGrid
  const sent = await sendEmail({
    to: conversation.seller_email,
    from: config.outbound_email,
    subject: draftMessage.subject,
    body: draftMessage.body,
  });

  const now = new Date().toISOString();

  if (sent) {
    // Update message
    await supabase
      .from('conversation_messages')
      .update({ approved_at: now, sent_at: now })
      .eq('id', draftMessage.id);

    // Update conversation status
    await supabase
      .from('seller_conversations')
      .update({ status: 'sent', updated_at: now })
      .eq('id', conversationId);

    res.json({ message: 'Email sent successfully', sent_at: now });
  } else {
    // Mark as approved but not sent
    await supabase
      .from('conversation_messages')
      .update({ approved_at: now })
      .eq('id', draftMessage.id);

    res.status(502).json({ error: 'Email sending failed — approved but not sent' });
  }
});

router.post('/:id/reply', async (req: Request, res: Response) => {
  const conversationId = req.params.id;
  const { body } = req.body;

  if (!body || typeof body !== 'string') {
    res.status(400).json({ error: 'body is required' });
    return;
  }

  const { data: conversation } = await supabase
    .from('seller_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  // Get the last message for a reply subject
  const { data: lastMsg } = await supabase
    .from('conversation_messages')
    .select('subject')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const subject = lastMsg?.subject
    ? (lastMsg.subject.startsWith('Re:') ? lastMsg.subject : `Re: ${lastMsg.subject}`)
    : 'Re: Fiat 500 enquiry';

  const { data: message, error } = await supabase
    .from('conversation_messages')
    .insert({
      conversation_id: conversationId,
      direction: 'outbound',
      subject,
      body,
      template_used: null,
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: 'Failed to create reply draft', details: error.message });
    return;
  }

  // Update conversation status to awaiting_approval
  await supabase
    .from('seller_conversations')
    .update({ status: 'awaiting_approval', updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  res.json({
    message: 'Reply draft created — approve to send',
    draft_message: message,
  });
});

router.post('/:id/reject', async (req: Request, res: Response) => {
  const conversationId = req.params.id;

  const { data: conversation } = await supabase
    .from('seller_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  // Delete unsent draft messages
  await supabase
    .from('conversation_messages')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('direction', 'outbound')
    .is('sent_at', null);

  // Close conversation
  await supabase
    .from('seller_conversations')
    .update({ status: 'closed', updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  res.json({ message: 'Conversation closed', status: 'closed' });
});

export default router;
