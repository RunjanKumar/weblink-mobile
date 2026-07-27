import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {useMutation} from '@tanstack/react-query';
import {loginSchema, type LoginFormValues} from '../validators/auth.validators';
import {useAuth} from '../store/AuthContext';
import {getApiErrorMessage} from '../utils/errorHandler';
import {storage} from '../services/storage.service';
import {STORAGE_KEYS} from '../constants/storageKeys';

/**
 * LoginScreen's ViewModel. Owns the form (RHF + Zod), the sign-in mutation
 * (React Query), remembered-email persistence, and error mapping. The screen
 * stays purely presentational.
 */
export function useLoginViewModel() {
  const {signIn} = useAuth();
  const rememberedEmail = storage.getString(STORAGE_KEYS.REMEMBERED_EMAIL) ?? '';

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {email: rememberedEmail, password: ''},
    mode: 'onTouched',
  });

  const mutation = useMutation({
    mutationFn: (values: LoginFormValues) => signIn(values),
  });

  const onSubmit = form.handleSubmit(values => {
    const email = values.email.trim();
    storage.setString(STORAGE_KEYS.REMEMBERED_EMAIL, email);
    // Fire-and-forget: success flips auth status and RootNavigator swaps to the app.
    mutation.mutate({email, password: values.password});
  });

  return {
    control: form.control,
    errors: form.formState.errors,
    isSubmitting: mutation.isPending,
    formError: mutation.isError ? getApiErrorMessage(mutation.error, 'Unable to sign in. Please try again.') : null,
    onSubmit,
  };
}
