import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase';
import { GSCDashboard } from '@/components/gsc/GSCDashboard';

export default async function GSCPage() {
  const cookieStore = await cookies();
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        cookieStore.set(name, value, options);
      },
      remove(name: string, options: any) {
        cookieStore.set(name, '', options);
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check for UNUSED payment (one-time access)
  const { data: unusedPayment } = await supabase
    .from('gsc_payments')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .eq('report_generated', false)
    .single();

  const hasUnusedReport = !!unusedPayment;

  // Get all payments for stats
  const { data: allPayments } = await supabase
    .from('gsc_payments')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false });

  const reportStatus = {
    totalPurchased: allPayments?.length || 0,
    reportsGenerated: allPayments?.filter((p) => p.report_generated).length || 0,
    reportsAvailable: allPayments?.filter((p) => !p.report_generated).length || 0,
  };

  // Check GSC connection status
  const { data: connection } = await supabase
    .from('gsc_connections')
    .select('google_account_email')
    .eq('user_id', user.id)
    .single();

  const isConnected = !!connection;
  const googleEmail = connection?.google_account_email;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Google Search Console Analysis
        </h1>
        <p className="text-gray-600">
          One-time diagnostic reports for your search performance
        </p>
      </div>

      <GSCDashboard
        hasUnusedReport={hasUnusedReport}
        isConnected={isConnected}
        googleEmail={googleEmail}
        reportStatus={reportStatus}
      />
    </div>
  );
}
