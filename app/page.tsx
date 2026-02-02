import { redirect } from 'next/navigation';
import { getOptionalSession } from '@/lib/auth';

export default async function HomePage() {
  const session = await getOptionalSession();

  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
