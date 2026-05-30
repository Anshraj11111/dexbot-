/**
 * Emotion Manager — Singleton
 * Encapsulates all emotion state transitions and POST /api/emotion calls.
 * Requirements: 5.2, 5.3, 5.7, 14.4
 */
import { getApiClient } from './apiClient';
import { useRobotStore } from './Robot_State_Manager';
import { EMOTION_COLORS } from '@/utils/emotionColors';

const TIMEOUT_MS = 5000;

const Emotion_Manager = {
  /**
   * Sets the emotion on a robot via REST API.
   * - Disables emotion buttons (sets emotionPending = true)
   * - Calls POST /api/emotion
   * - On success: updates store emotion, re-enables buttons
   * - On error: reverts to previous emotion, re-enables buttons, throws for toast
   *
   * @param {string} botId
   * @param {string} emotion - One of HAPPY|SAD|ANGRY|SLEEPY|EXCITED|NEUTRAL
   * @param {string} baseURL - e.g. "http://192.168.1.42"
   * @returns {Promise<void>}
   */
  async setEmotion(botId, emotion, baseURL) {
    const store = useRobotStore.getState();
    const previousEmotion = store.robots[botId]?.emotion ?? 'NEUTRAL';

    // Disable buttons
    store.setEmotionPending(botId, true);

    try {
      const client = getApiClient(botId, baseURL);
      await Promise.race([
        client.post('/api/emotion', { emotion }),
        new Promise((_, reject) =>
          setTimeout(() => reject({ message: 'Request timed out', status: 0, code: 'ETIMEOUT' }), TIMEOUT_MS)
        ),
      ]);

      // Success — update store
      store.setEmotion(botId, emotion);
    } catch (err) {
      // Revert to previous emotion
      store.setEmotion(botId, previousEmotion);
      throw err; // Let the component show the toast
    } finally {
      // Always re-enable buttons
      store.setEmotionPending(botId, false);
    }
  },

  /**
   * Returns the hex color for the given emotion.
   * Falls back to '#FFFFFF' for unknown emotions.
   * @param {string} emotion
   * @returns {string}
   */
  getEmotionColor(emotion) {
    return EMOTION_COLORS[emotion] ?? '#FFFFFF';
  },
};

export default Emotion_Manager;
