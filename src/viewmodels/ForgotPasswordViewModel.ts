import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {useMutation} from '@tanstack/react-query';
import axios from 'axios';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordFormValues,
  type ResetPasswordFormValues,
} from '../validators/auth.validators';
import {authRepository} from '../repositories/auth.repository';
import {getApiErrorMessage} from '../utils/errorHandler';

// Statuses that mean "the backend doesn't have the reset flow" — an older
// deployed backend without POST /v1/customer/forgot-password.
const ENDPOINT_MISSING_STATUSES = [404, 405, 501];

export type ForgotPasswordStep = 'request' | 'reset' | 'done';

/**
 * Two-step forgot-password flow:
 *   1. 'request' — guest enters their email; backend emails a 6-digit OTP.
 *   2. 'reset'   — guest enters the OTP + a new password.
 *   3. 'done'    — terminal success state ("back to login").
 */
export function useForgotPasswordViewModel(initialEmail?: string) {
  const [step, setStep] = useState<ForgotPasswordStep>('request');
  // The email the OTP was actually sent to (frozen at request time, reused by reset/resend).
  const [email, setEmail] = useState(initialEmail ?? '');

  const requestForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {email: initialEmail ?? ''},
    mode: 'onTouched',
  });

  const resetForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {otp: '', password: '', confirmPassword: ''},
    mode: 'onTouched',
  });

  const requestMutation = useMutation({
    mutationFn: (value: string) => authRepository.forgotPassword({email: value}),
    onSuccess: (_message, value) => {
      setEmail(value);
      setStep('reset');
    },
  });

  const resetMutation = useMutation({
    mutationFn: (values: ResetPasswordFormValues) =>
      authRepository.resetPassword({
        email,
        otp: values.otp.trim(),
        password: values.password,
      }),
    onSuccess: () => setStep('done'),
  });

  const onRequestSubmit = requestForm.handleSubmit(values => {
    requestMutation.mutate(values.email.trim());
  });

  const onResetSubmit = resetForm.handleSubmit(values => {
    resetMutation.mutate(values);
  });

  /** Re-send the code from the OTP step, reusing the confirmed email. */
  const onResend = () => {
    if (email && !requestMutation.isPending) {
      requestMutation.mutate(email);
    }
  };

  const endpointMissing =
    axios.isAxiosError(requestMutation.error) &&
    ENDPOINT_MISSING_STATUSES.includes(requestMutation.error.response?.status ?? 0);

  let infoMessage: string | null = null;
  let errorMessage: string | null = null;
  if (step === 'request') {
    if (endpointMissing) {
      infoMessage =
        'Password reset isn’t available in the app yet. Please contact reception to reset your password.';
    } else if (requestMutation.isError) {
      errorMessage = getApiErrorMessage(requestMutation.error);
    }
  } else if (step === 'reset') {
    // Shows the "OTP sent" confirmation after the initial send AND after a resend;
    // a failed resend replaces it with the error.
    if (resetMutation.isError) {
      errorMessage = getApiErrorMessage(resetMutation.error);
    } else if (requestMutation.isError) {
      errorMessage = getApiErrorMessage(requestMutation.error);
    } else if (requestMutation.isSuccess && requestMutation.data) {
      infoMessage = requestMutation.data;
    }
  }
  const successMessage =
    step === 'done' ? resetMutation.data ?? 'Your password has been updated.' : null;

  return {
    step,
    email,
    requestControl: requestForm.control,
    requestErrors: requestForm.formState.errors,
    resetControl: resetForm.control,
    resetErrors: resetForm.formState.errors,
    isRequesting: requestMutation.isPending,
    isResetting: resetMutation.isPending,
    infoMessage,
    errorMessage,
    successMessage,
    onRequestSubmit,
    onResetSubmit,
    onResend,
  };
}
