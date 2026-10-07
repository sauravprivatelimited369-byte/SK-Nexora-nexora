import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { OnboardingForm } from '@/components/onboarding-form';

export const metadata = { title: 'Set up your engineering profile' };

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.onboarding_complete) redirect('/dashboard');
  return <OnboardingForm initialName={user.name} />;
}
