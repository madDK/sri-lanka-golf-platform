// ConnectBiz SMS & WhatsApp Gateways Simulator

/**
 * Simulates sending an SMS via Dialog, Mobitel, Ada Global, or Hutch
 * @param {string} provider - Provider name
 * @param {string} mobile - Recipient number
 * @param {string} text - Message text
 * @returns {Promise<{status: string, messageId: string}>}
 */
async function sendSmsGateway(provider, mobile, text) {
  // Simulate network latency (200ms)
  await new Promise(resolve => setTimeout(resolve, 200));

  // Simulating typical gateway success rate (95%)
  const isDelivered = Math.random() < 0.95;
  const messageId = 'sms_' + Math.random().toString(36).substring(2, 11).toUpperCase();

  console.log(`[SMS GATEWAY - ${provider}] Sent to ${mobile}: "${text}" - Result: ${isDelivered ? 'DELIVERED' : 'FAILED'} (ID: ${messageId})`);

  return {
    status: isDelivered ? 'Delivered' : 'Failed',
    messageId
  };
}

/**
 * Simulates sending a WhatsApp Template message via Meta Cloud API
 * @param {string} recipient - Recipient number
 * @param {string} templateName - Template name
 * @param {Array<string>} params - Template parameters ({{1}}, {{2}}, etc)
 * @returns {Promise<{status: string, messageId: string}>}
 */
async function sendWhatsAppGateway(recipient, templateName, params) {
  // Simulate network latency (300ms)
  await new Promise(resolve => setTimeout(resolve, 300));

  // Simulating Meta Cloud API status cycle (Sent -> Delivered -> Read)
  const successState = Math.random();
  let status = 'Failed';
  
  if (successState > 0.15) {
    status = 'Read'; // 85% read
  } else if (successState > 0.05) {
    status = 'Delivered'; // 10% delivered but unread
  } // 5% failed

  const messageId = 'wa_' + Math.random().toString(36).substring(2, 15);

  console.log(`[WHATSAPP GATEWAY - Meta Cloud API] Sent to ${recipient} template [${templateName}] with params [${params.join(', ')}] - Result: ${status} (ID: ${messageId})`);

  return {
    status,
    messageId
  };
}

module.exports = {
  sendSmsGateway,
  sendWhatsAppGateway
};
