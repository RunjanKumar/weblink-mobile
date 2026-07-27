import {feedbackApi, type FeedbackPayload} from '../api/feedback.api';

export const feedbackRepository = {
  async submit(payload: FeedbackPayload): Promise<void> {
    await feedbackApi.submit(payload);
  },
};
