/**
 * PubNub Service
 *
 * Handles real-time pub/sub messaging for the Pi Network Explorer.
 * This service runs on the backend (Netlify Functions) to publish results.
 *
 * Reference: ADR-002 (PubNub for real-time messaging)
 */

// PubNub is imported on the backend only
// For frontend, use the PubNub React SDK separately

interface PubNubConfig {
  publishKey: string;
  subscribeKey: string;
  uuid?: string;
}

interface PublishOptions {
  channel: string;
  message: any;
}

/**
 * Initialize PubNub on the backend
 * This function is called in Netlify Functions context
 */
export function createPubNubClient(config: PubNubConfig) {
  try {
    // Dynamically import PubNub (only available on backend)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PubNub = require('pubnub');

    const client = new PubNub({
      publishKey: config.publishKey,
      subscribeKey: config.subscribeKey,
      uuid: config.uuid || 'pi-network-backend',
      logVerbosity: false,
    });

    return client;
  } catch (error) {
    console.error('[PubNub] Failed to initialize client:', error);
    throw error;
  }
}

/**
 * Publish a message to a PubNub channel
 * This wraps the PubNub publish API with error handling
 */
export async function publishMessage(
  client: any,
  options: PublishOptions,
): Promise<{ timetoken: string }> {
  try {
    const result = await client.publish({
      channel: options.channel,
      message: options.message,
    });

    console.log(`[PubNub] Published to ${options.channel}:`, {
      timetoken: result.timetoken,
    });

    return {
      timetoken: result.timetoken,
    };
  } catch (error: any) {
    console.error(`[PubNub] Publish failed for channel ${options.channel}:`, error);
    throw new Error(`Failed to publish to PubNub: ${error.message}`);
  }
}

/**
 * Format channel name with session ID
 * Ensures unique channels per user session
 */
export function getChannelName(baseChannel: string, sessionId: string): string {
  return `${baseChannel}_${sessionId}`;
}

/**
 * Validate PubNub configuration
 */
export function validatePubNubConfig(config: Partial<PubNubConfig>): boolean {
  if (!config.publishKey || typeof config.publishKey !== 'string') {
    console.error('[PubNub] Missing or invalid publishKey');
    return false;
  }

  if (!config.subscribeKey || typeof config.subscribeKey !== 'string') {
    console.error('[PubNub] Missing or invalid subscribeKey');
    return false;
  }

  return true;
}

/**
 * Create a PubNub client for Netlify Functions
 * Should be called at the top of each function that uses PubNub
 */
export function getPubNubClient(): any {
  const publishKey = process.env.PUBNUB_PUBLISH_KEY;
  const subscribeKey = process.env.PUBNUB_SUBSCRIBE_KEY;

  if (!validatePubNubConfig({ publishKey, subscribeKey })) {
    throw new Error('PubNub configuration is invalid or missing');
  }

  return createPubNubClient({
    publishKey: publishKey!,
    subscribeKey: subscribeKey!,
  });
}
