/**
 * usePubNubSubscription Hook
 *
 * Manages PubNub subscription lifecycle and message reception.
 * Returns the latest message from a channel.
 *
 * Usage:
 * ```tsx
 * const results = usePubNubSubscription(`search_results_${sessionId}`);
 * ```
 */

import { useEffect, useState } from 'react';
import PubNub from 'pubnub';

interface UsePubNubSubscriptionOptions {
  subscribeKey: string;
  uuid?: string;
}

/**
 * Subscribe to a PubNub channel and receive messages
 */
export function usePubNubSubscription<T>(
  channel: string,
  options?: UsePubNubSubscriptionOptions,
): T | null {
  const [message, setMessage] = useState<T | null>(null);
  const [pubnub] = useState(() => {
    const subscribeKey = options?.subscribeKey ||
      import.meta.env.VITE_PUBNUB_SUBSCRIBE_KEY ||
      process.env.REACT_APP_PUBNUB_SUBSCRIBE_KEY;

    if (!subscribeKey) {
      console.warn(
        '[PubNub] No subscribe key found. Set REACT_APP_PUBNUB_SUBSCRIBE_KEY env var.',
      );
      return null;
    }

    return new PubNub({
      subscribeKey,
      uuid: options?.uuid || `client_${Math.random().toString(36).substr(2, 9)}`,
    });
  });

  useEffect(() => {
    if (!pubnub) return;

    console.log(`[PubNub] Subscribing to channel: ${channel}`);

    const listener = {
      message: (event: any) => {
        console.log(`[PubNub] Message received on ${channel}:`, event.message);
        setMessage(event.message);
      },
      presence: (event: any) => {
        console.log(`[PubNub] Presence event on ${channel}:`, event);
      },
      status: (event: any) => {
        if (event.error) {
          console.error(`[PubNub] Error on ${channel}:`, event);
        } else {
          console.log(`[PubNub] Status on ${channel}:`, event.operation);
        }
      },
    };

    pubnub.addListener(listener);
    pubnub.subscribe({ channels: [channel] });

    // Cleanup: unsubscribe when component unmounts or channel changes
    return () => {
      console.log(`[PubNub] Unsubscribing from channel: ${channel}`);
      pubnub.unsubscribe({ channels: [channel] });
      pubnub.removeListener(listener);
    };
  }, [pubnub, channel]);

  return message;
}

/**
 * Get the current PubNub instance (for direct access if needed)
 */
export function usePubNubInstance(): PubNub | null {
  const [pubnub] = useState(() => {
    const subscribeKey =
      import.meta.env.REACT_APP_PUBNUB_SUBSCRIBE_KEY ||
      process.env.REACT_APP_PUBNUB_SUBSCRIBE_KEY;

    if (!subscribeKey) {
      return null;
    }

    return new PubNub({
      subscribeKey,
      uuid: `client_${Math.random().toString(36).substr(2, 9)}`,
    });
  });

  return pubnub;
}
