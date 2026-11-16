import {useState} from 'react';
import {useMutation, useQuery} from '@tanstack/react-query';
import {feedbackRepository} from '../repositories/feedback.repository';
import {customerRepository} from '../repositories/customer.repository';
import {isPortalModuleEnabled} from '../models/user.model';
import {getApiErrorMessage} from '../utils/errorHandler';

/**
 * Feedback ViewModel. Local star + notes state; submits via React Query mutation
 * and resets the form on success (mirrors the web feedback viewModel).
 *
 * The server needs a 1–5 star rating (the message is optional), so nothing is
 * sent without one. `offered` is false where the hotel switched the Feedback
 * module off: the server refuses it there, so the screens say so instead of
 * showing a form that cannot be sent.
 */
export function useFeedbackViewModel() {
  const [star, setStar] = useState(0);
  const [notes, setNotes] = useState('');

  // Same query (and cache) as the dashboard: no extra request when it has loaded.
  const profileQuery = useQuery({
    queryKey: ['customer', 'profile'],
    queryFn: () => customerRepository.getProfile(),
  });
  const offered = isPortalModuleEnabled(profileQuery.data?.portalModules, 'FEEDBACK');

  const mutation = useMutation({
    mutationFn: () => feedbackRepository.submit({star, notes}),
  });

  const canSubmit = offered && star >= 1;

  const submit = (onDone?: () => void) => {
    if (!canSubmit) {
      return;
    }
    mutation.mutate(undefined, {
      onSuccess: () => {
        setStar(0);
        setNotes('');
        onDone?.();
      },
    });
  };

  return {
    star,
    setStar,
    notes,
    setNotes,
    submit,
    offered,
    canSubmit,
    isSubmitting: mutation.isPending,
    error: mutation.isError ? getApiErrorMessage(mutation.error, 'Could not send your feedback.') : null,
  };
}
