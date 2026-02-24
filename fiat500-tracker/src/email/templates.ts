interface TemplateData {
  year: number;
  variant: string;
  price_formatted: string;
  platform: string;
  seller_name: string;
  user_postcode: string;
  user_name: string;
  offer_price?: string;
}

export function renderTemplate(
  template: 'initial_enquiry' | 'follow_up' | 'negotiate' | 'decline',
  data: TemplateData,
): { subject: string; body: string } {
  switch (template) {
    case 'initial_enquiry':
      return {
        subject: `Enquiry about your ${data.year} Fiat 500 ${data.variant} - ${data.price_formatted}`,
        body: `Hi ${data.seller_name},

I'm interested in your ${data.year} Fiat 500 ${data.variant} listed at ${data.price_formatted} on ${data.platform}. Is it still available?

I'm based in ${data.user_postcode} and happy to travel. Could you let me know:

1) Is the car still for sale?
2) Is there any flexibility on the price?
3) When would be convenient for a viewing?

Many thanks,
${data.user_name}`,
      };

    case 'follow_up':
      return {
        subject: `Re: Enquiry about your ${data.year} Fiat 500 ${data.variant}`,
        body: `Hi ${data.seller_name},

I contacted you a few days ago about your ${data.year} Fiat 500 ${data.variant} listed at ${data.price_formatted}. I just wanted to check if it's still available?

I'm still very interested and ready to arrange a viewing at your convenience.

Kind regards,
${data.user_name}`,
      };

    case 'negotiate':
      return {
        subject: `Re: ${data.year} Fiat 500 ${data.variant} - Offer`,
        body: `Hi ${data.seller_name},

Thank you for getting back to me about the ${data.year} Fiat 500 ${data.variant}.

Having done some research on similar cars in the area, I'd like to offer ${data.offer_price || 'a fair price'} for it. I believe this is a fair price given the current market.

I'm happy to come and view the car and can be flexible on timing. If you're agreeable, I can arrange to come as soon as this week.

Best regards,
${data.user_name}`,
      };

    case 'decline':
      return {
        subject: `Re: ${data.year} Fiat 500 ${data.variant}`,
        body: `Hi ${data.seller_name},

Thank you for your time regarding the ${data.year} Fiat 500 ${data.variant}. After further consideration, I've decided not to proceed at this time.

I wish you all the best with the sale.

Kind regards,
${data.user_name}`,
      };
  }
}
