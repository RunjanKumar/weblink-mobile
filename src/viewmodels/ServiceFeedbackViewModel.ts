import {useCallback, useState} from 'react';
import {useMutation} from '@tanstack/react-query';
import {feedbackRepository} from '../repositories/feedback.repository';
import type {FeedbackPayload} from '../api/feedback.api';
import {getApiErrorMessage} from '../utils/errorHandler';

/**
 * Rating a finished service request.
 *
 * WHAT THE BACKEND ACTUALLY OFFERS: there is no per-request feedback endpoint —
 * only `POST /v1/feedback` ({star, notes}), the guest's stay rating. So a rating
 * given on a request is posted there with the service and its reference written
 * into the note, which is what lets the front desk tell what it refers to.
 *
 * The consequence, and why `rated` lives in memory: nothing comes back that says
 * a request was already rated. The stars re-open on the next launch. That is
 * honest about what is stored rather than pretending a record exists.
 */
export interface ServiceFeedbackDraft {
  star: number;
  note: string;
}

const EMPTY: ServiceFeedbackDraft = {star: 0, note: ''};

export function useServiceFeedbackViewModel() {
  const [drafts, setDrafts] = useState<Record<string, ServiceFeedbackDraft>>({});
  const [rated, setRated] = useState<Record<string, number>>({});

  const mutation = useMutation({
    mutationFn: (payload: FeedbackPayload) => feedbackRepository.submit(payload),
  });

  // Per request id, so switching rows in the list keeps each draft intact.
  const draftOf = useCallback((id: string): ServiceFeedbackDraft => drafts[id] ?? EMPTY, [drafts]);

  const setStar = useCallback((id: string, star: number) => {
    setDrafts(prev => ({...prev, [id]: {...(prev[id] ?? EMPTY), star}}));
  }, []);

  const setNote = useCallback((id: string, note: string) => {
    setDrafts(prev => ({...prev, [id]: {...(prev[id] ?? EMPTY), note}}));
  }, []);

  /** `subject` names the service and its reference for the hotel's feedback log. */
  const submit = useCallback(
    async (id: string, subject: string) => {
      const {star, note} = drafts[id] ?? EMPTY;
      await mutation.mutateAsync({star, notes: note ? `${subject} — ${note}` : subject});
      setRated(prev => ({...prev, [id]: star}));
      setDrafts(prev => {
        const {[id]: _sent, ...rest} = prev;
        return rest;
      });
    },
    [drafts, mutation],
  );

  return {
    draftOf,
    setStar,
    setNote,
    submit,
    /** The star count already sent for a request this session, if any. */
    ratedStar: useCallback((id: string): number | undefined => rated[id], [rated]),
    isSubmitting: mutation.isPending,
    error: mutation.isError ? getApiErrorMessage(mutation.error, 'Could not send your feedback.') : null,
  };
}
