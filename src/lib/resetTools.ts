import { supabase } from './supabase';

export type ResetResult = {
  success: boolean;
  error?: string;
  [key: string]: any;
};

export async function resetTestAppointments(): Promise<ResetResult> {
  try {
    const { data, error } = await supabase.rpc('reset_test_appointments');

    if (error) {
      console.error('Error resetting test appointments:', error);
      return {
        success: false,
        error: error.message || 'Failed to reset test appointments',
      };
    }

    return data as ResetResult;
  } catch (err: any) {
    console.error('Error calling reset_test_appointments:', err);
    return {
      success: false,
      error: err.message || 'An unexpected error occurred',
    };
  }
}

export async function resetTestPayouts(): Promise<ResetResult> {
  try {
    const { data, error } = await supabase.rpc('reset_test_payouts');

    if (error) {
      console.error('Error resetting test payouts:', error);
      return {
        success: false,
        error: error.message || 'Failed to reset test payouts',
      };
    }

    return data as ResetResult;
  } catch (err: any) {
    console.error('Error calling reset_test_payouts:', err);
    return {
      success: false,
      error: err.message || 'An unexpected error occurred',
    };
  }
}

export async function resetTimeTracking(): Promise<ResetResult> {
  try {
    const { data, error } = await supabase.rpc('reset_time_tracking');

    if (error) {
      console.error('Error resetting time tracking:', error);
      return {
        success: false,
        error: error.message || 'Failed to reset time tracking',
      };
    }

    return data as ResetResult;
  } catch (err: any) {
    console.error('Error calling reset_time_tracking:', err);
    return {
      success: false,
      error: err.message || 'An unexpected error occurred',
    };
  }
}

export async function resetAllNonCoreData(): Promise<ResetResult> {
  try {
    const { data, error } = await supabase.rpc('reset_all_non_core_data');

    if (error) {
      console.error('Error resetting all data:', error);
      return {
        success: false,
        error: error.message || 'Failed to reset all data',
      };
    }

    return data as ResetResult;
  } catch (err: any) {
    console.error('Error calling reset_all_non_core_data:', err);
    return {
      success: false,
      error: err.message || 'An unexpected error occurred',
    };
  }
}

export async function generateDemoData(): Promise<ResetResult> {
  try {
    const { data, error } = await supabase.rpc('generate_demo_data');

    if (error) {
      console.error('Error generating demo data:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate demo data',
      };
    }

    return data as ResetResult;
  } catch (err: any) {
    console.error('Error calling generate_demo_data:', err);
    return {
      success: false,
      error: err.message || 'An unexpected error occurred',
    };
  }
}

export function formatResetResult(result: ResetResult, language: 'en' | 'es'): string {
  if (!result.success) {
    return result.error || (language === 'en' ? 'Unknown error' : 'Error desconocido');
  }

  const parts: string[] = [];

  if (result.appointments_deleted !== undefined) {
    parts.push(
      language === 'en'
        ? `${result.appointments_deleted} appointment(s) deleted`
        : `${result.appointments_deleted} cita(s) eliminada(s)`
    );
  }

  if (result.payouts_deleted !== undefined) {
    parts.push(
      language === 'en'
        ? `${result.payouts_deleted} payout(s) deleted`
        : `${result.payouts_deleted} pago(s) eliminado(s)`
    );
  }

  if (result.payout_items_deleted !== undefined) {
    parts.push(
      language === 'en'
        ? `${result.payout_items_deleted} payout item(s) deleted`
        : `${result.payout_items_deleted} item(s) de pago eliminado(s)`
    );
  }

  if (result.entries_deleted !== undefined) {
    parts.push(
      language === 'en'
        ? `${result.entries_deleted} time tracking entry(ies) deleted`
        : `${result.entries_deleted} entrada(s) de tiempo eliminada(s)`
    );
  }

  if (result.time_tracking_deleted !== undefined) {
    parts.push(
      language === 'en'
        ? `${result.time_tracking_deleted} time tracking entry(ies) deleted`
        : `${result.time_tracking_deleted} entrada(s) de tiempo eliminada(s)`
    );
  }

  if (result.transformations_deleted !== undefined) {
    parts.push(
      language === 'en'
        ? `${result.transformations_deleted} transformation photo(s) deleted`
        : `${result.transformations_deleted} foto(s) de transformación eliminada(s)`
    );
  }

  if (result.reminders_deleted !== undefined) {
    parts.push(
      language === 'en'
        ? `${result.reminders_deleted} reminder(s) deleted`
        : `${result.reminders_deleted} recordatorio(s) eliminado(s)`
    );
  }

  if (result.inventory_transactions_deleted !== undefined) {
    parts.push(
      language === 'en'
        ? `${result.inventory_transactions_deleted} inventory transaction(s) deleted`
        : `${result.inventory_transactions_deleted} transacción(es) de inventario eliminada(s)`
    );
  }

  if (result.messages_deleted !== undefined) {
    parts.push(
      language === 'en'
        ? `${result.messages_deleted} message(s) deleted`
        : `${result.messages_deleted} mensaje(s) eliminado(s)`
    );
  }

  // Handle demo data generation results
  if (result.barbers_created !== undefined) {
    parts.push(
      language === 'en'
        ? `${result.barbers_created} barber(s) created`
        : `${result.barbers_created} barbero(s) creado(s)`
    );
  }

  if (result.clients_created !== undefined) {
    parts.push(
      language === 'en'
        ? `${result.clients_created} client(s) created`
        : `${result.clients_created} cliente(s) creado(s)`
    );
  }

  if (result.services_created !== undefined) {
    parts.push(
      language === 'en'
        ? `${result.services_created} service(s) created`
        : `${result.services_created} servicio(s) creado(s)`
    );
  }

  if (result.products_created !== undefined) {
    parts.push(
      language === 'en'
        ? `${result.products_created} product(s) created`
        : `${result.products_created} producto(s) creado(s)`
    );
  }

  if (result.appointments_created !== undefined) {
    parts.push(
      language === 'en'
        ? `${result.appointments_created} appointment(s) created`
        : `${result.appointments_created} cita(s) creada(s)`
    );
  }

  return parts.join(', ');
}
