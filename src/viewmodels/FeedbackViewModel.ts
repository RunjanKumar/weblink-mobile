import {useState} from 'react';
import {useMutation} from '@tanstack/react-query';
import {feedbackRepository} from '../repositories/feedback.repository';
import {getApiErrorMessage} from '../utils/errorHandler';

/**
 * Feedback ViewModel. Local star + notes state; submits via React Query mutation
 * and resets the form on success (mirrors the web feedback viewModel).
 */
export function useFeedbackViewModel() {
  const [star, setStar] = useState(0);
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: () => feedbackRepository.submit({star, notes}),
  });

  const submit = (onDone?: () => void) => {
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
    isSubmitting: mutation.isPending,
    error: mutation.isError ? getApiErrorMessage(mutation.error, 'Failed to submit feedback.') : null,
  };
}
