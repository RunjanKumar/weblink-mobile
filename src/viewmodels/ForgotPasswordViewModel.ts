import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {useMutation} from '@tanstack/react-query';
import axios from 'axios';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from '../validators/auth.validators';
import {authRepository} from '../repositories/auth.repository';
import {getApiErrorMessage} from '../utils/errorHandler';

// Statuses that mean "the backend endpoint isn't there yet" (see WEBLINK_ISSUES.md).
const ENDPOINT_MISSING_STATUSES = [404, 405, 501];

export function useForgotPasswordViewModel(initialEmail?: string) {
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {email: initialEmail ?? ''},
    mode: 'onTouched',
  });

  const mutation = useMutation({
    mutationFn: (values: ForgotPasswordFormValues) => authRepository.forgotPassword(values),
  });

  const onSubmit = form.handleSubmit(values => {
    mutation.mutate({email: values.email.trim()});
  });

  const endpointMissing =
    axios.isAxiosError(mutation.error) &&
    ENDPOINT_MISSING_STATUSES.includes(mutation.error.response?.status ?? 0);

  // A real success OR the graceful "not built yet" fallback are both shown as an
  // informational banner. Only genuine failures surface as an error.
  const infoMessage = mutation.isSuccess
    ? mutation.data
    : endpointMissing
      ? 'Password reset isn’t available in the app yet. Please contact reception to reset your password.'
      : null;

  const errorMessage =
    mutation.isError && !endpointMissing ? getApiErrorMessage(mutation.error) : null;

  return {
    control: form.control,
    errors: form.formState.errors,
    isSubmitting: mutation.isPending,
    infoMessage,
    errorMessage,
    onSubmit,
  };
}
