import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface SendOrderConfirmationParams {
  to: string;
  orderNumber: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  customerName?: string;
}

export async function sendOrderConfirmationEmail({
  to,
  orderNumber,
  items,
  subtotal,
  discount,
  total,
  customerName = 'Valued Customer',
}: SendOrderConfirmationParams) {
  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);

  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatPrice(item.price * item.quantity)}</td>
      </tr>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #4f46e5;">
          <h1 style="color: #4f46e5; margin: 0; font-size: 28px;">ShopFlow V2</h1>
        </div>

        <div style="padding: 30px 0;">
          <h2 style="color: #1f2937; margin: 0 0 10px;">Order Confirmed! ✓</h2>
          <p style="color: #6b7280; margin: 0;">Hi ${customerName},</p>
          <p style="color: #6b7280;">Thank you for your order. We're getting it ready for you!</p>

          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Order Number</p>
            <p style="margin: 5px 0 0; font-size: 18px; font-weight: 600; color: #1f2937; font-family: monospace;">${orderNumber}</p>
          </div>

          <h3 style="color: #1f2937; margin: 30px 0 15px;">Order Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 12px; text-align: left; font-weight: 600;">Item</th>
                <th style="padding: 12px; text-align: center; font-weight: 600;">Qty</th>
                <th style="padding: 12px; text-align: right; font-weight: 600;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6b7280;">Subtotal</span>
              <span style="color: #1f2937;">${formatPrice(subtotal)}</span>
            </div>
            ${
              discount > 0
                ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #059669;">
              <span>Discount</span>
              <span>-${formatPrice(discount)}</span>
            </div>
            `
                : ''
            }
            <div style="display: flex; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 18px; font-weight: 600;">
              <span style="color: #1f2937;">Total</span>
              <span style="color: #1f2937;">${formatPrice(total)}</span>
            </div>
          </div>
        </div>

        <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 14px;">
          <p style="margin: 0;">Questions? Contact us at support@shopflow.demo</p>
          <p style="margin: 10px 0 0;">© 2026 ShopFlow V2. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: 'ShopFlow <onboarding@resend.dev>',
      to: [to],
      subject: `Order Confirmed - ${orderNumber}`,
      html,
    });

    if (error) {
      console.error('Failed to send email:', error);
      return { success: false, error };
    }

    console.log('Email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}
