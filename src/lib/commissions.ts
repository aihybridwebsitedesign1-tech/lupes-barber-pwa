import { supabase } from './supabase';

export type CommissionRates = {
  service_commission_rate: number;
  product_commission_rate: number;
  tip_commission_rate: number;
};

export type CommissionItem = {
  id: string;
  type: 'service' | 'product' | 'tip';
  date: string;
  description: string;
  revenue_amount: number;
  commission_rate: number;
  commission_amount: number;
  appointment_id?: string;
  inventory_transaction_id?: string;
};

export type CommissionBreakdown = {
  services: {
    count: number;
    total_revenue: number;
    commission_rate: number;
    commission_amount: number;
    items: CommissionItem[];
  };
  products: {
    count: number;
    total_revenue: number;
    commission_rate: number;
    commission_amount: number;
    items: CommissionItem[];
  };
  tips: {
    count: number;
    total_amount: number;
    commission_rate: number;
    commission_amount: number;
    items: CommissionItem[];
  };
  total_commission: number;
};

export type PayoutCalculation = {
  barber_id: string;
  barber_name: string;
  start_date: string;
  end_date: string;
  breakdown: CommissionBreakdown;
  calculated_amount: number;
};

export type BarberSummary = {
  barber_id: string;
  barber_name: string;
  commission_rates: CommissionRates;
  service_revenue: number;
  product_revenue: number;
  tip_revenue: number;
  total_commission_due: number;
  total_paid: number;
  balance_due: number;
};

export async function getBarberCommissionRates(barberId: string): Promise<CommissionRates | null> {
  const { data, error } = await supabase
    .from('users')
    .select('service_commission_rate, product_commission_rate, tip_commission_rate')
    .eq('id', barberId)
    .eq('role', 'BARBER')
    .maybeSingle();

  if (error || !data) {
    console.error('Error fetching commission rates:', error);
    return null;
  }

  return {
    service_commission_rate: parseFloat(data.service_commission_rate || '0.5'),
    product_commission_rate: parseFloat(data.product_commission_rate || '0.1'),
    tip_commission_rate: parseFloat(data.tip_commission_rate || '1.0'),
  };
}

export async function calculateCommissionForPeriod(
  barberId: string,
  startDate: string,
  endDate: string
): Promise<PayoutCalculation | null> {
  const rates = await getBarberCommissionRates(barberId);
  if (!rates) return null;

  const { data: barberData } = await supabase
    .from('users')
    .select('name')
    .eq('id', barberId)
    .maybeSingle();

  const barberName = barberData?.name || 'Unknown';

  const endDateTime = new Date(endDate);
  endDateTime.setHours(23, 59, 59, 999);

  const { data: appointments, error: apptError } = await supabase
    .from('appointments')
    .select('id, appointment_date, service_price, tip_amount, services(name), status')
    .eq('barber_id', barberId)
    .gte('appointment_date', startDate)
    .lte('appointment_date', endDateTime.toISOString())
    .eq('commission_paid', false)
    .in('status', ['COMPLETED', 'NO_SHOW']);

  if (apptError) {
    console.error('Error fetching appointments:', apptError);
    return null;
  }

  const { data: productSales, error: prodError } = await supabase
    .from('inventory_transactions')
    .select(`
      id,
      created_at,
      quantity_change,
      products(name, retail_price),
      appointments(barber_id)
    `)
    .eq('type', 'sale')
    .eq('commission_paid', false)
    .gte('created_at', startDate)
    .lte('created_at', endDateTime.toISOString());

  if (prodError) {
    console.error('Error fetching product sales:', prodError);
  }

  const barberProductSales = (productSales || []).filter(
    (sale: any) => sale.appointments?.barber_id === barberId
  );

  const serviceItems: CommissionItem[] = [];
  const tipItems: CommissionItem[] = [];
  const productItems: CommissionItem[] = [];

  let serviceTotalRevenue = 0;
  let tipTotalAmount = 0;
  let productTotalRevenue = 0;

  (appointments || []).forEach((appt: any) => {
    if (appt.status === 'COMPLETED' && appt.service_price) {
      const serviceRevenue = parseFloat(appt.service_price || '0');
      const serviceCommission = serviceRevenue * rates.service_commission_rate;

      serviceTotalRevenue += serviceRevenue;

      serviceItems.push({
        id: appt.id,
        type: 'service',
        date: appt.appointment_date,
        description: appt.services?.name || 'Service',
        revenue_amount: serviceRevenue,
        commission_rate: rates.service_commission_rate,
        commission_amount: serviceCommission,
        appointment_id: appt.id,
      });
    }

    if (appt.status === 'COMPLETED' && appt.tip_amount) {
      const tipAmount = parseFloat(appt.tip_amount || '0');
      const tipCommission = tipAmount * rates.tip_commission_rate;

      tipTotalAmount += tipAmount;

      tipItems.push({
        id: `${appt.id}-tip`,
        type: 'tip',
        date: appt.appointment_date,
        description: `Tip for ${appt.services?.name || 'service'}`,
        revenue_amount: tipAmount,
        commission_rate: rates.tip_commission_rate,
        commission_amount: tipCommission,
        appointment_id: appt.id,
      });
    }
  });

  barberProductSales.forEach((sale: any) => {
    const quantity = Math.abs(sale.quantity_change);
    const price = parseFloat(sale.products?.retail_price || '0');
    const revenue = quantity * price;
    const commission = revenue * rates.product_commission_rate;

    productTotalRevenue += revenue;

    productItems.push({
      id: sale.id,
      type: 'product',
      date: sale.created_at,
      description: sale.products?.name || 'Product',
      revenue_amount: revenue,
      commission_rate: rates.product_commission_rate,
      commission_amount: commission,
      inventory_transaction_id: sale.id,
    });
  });

  const serviceCommissionTotal = serviceTotalRevenue * rates.service_commission_rate;
  const productCommissionTotal = productTotalRevenue * rates.product_commission_rate;
  const tipCommissionTotal = tipTotalAmount * rates.tip_commission_rate;

  const breakdown: CommissionBreakdown = {
    services: {
      count: serviceItems.length,
      total_revenue: serviceTotalRevenue,
      commission_rate: rates.service_commission_rate,
      commission_amount: serviceCommissionTotal,
      items: serviceItems,
    },
    products: {
      count: productItems.length,
      total_revenue: productTotalRevenue,
      commission_rate: rates.product_commission_rate,
      commission_amount: productCommissionTotal,
      items: productItems,
    },
    tips: {
      count: tipItems.length,
      total_amount: tipTotalAmount,
      commission_rate: rates.tip_commission_rate,
      commission_amount: tipCommissionTotal,
      items: tipItems,
    },
    total_commission: serviceCommissionTotal + productCommissionTotal + tipCommissionTotal,
  };

  return {
    barber_id: barberId,
    barber_name: barberName,
    start_date: startDate,
    end_date: endDate,
    breakdown,
    calculated_amount: breakdown.total_commission,
  };
}

export async function createPayout(
  barberId: string,
  startDate: string,
  endDate: string,
  actualAmountPaid: number,
  paymentMethod: string,
  overrideNote?: string,
  forceOverride: boolean = false
): Promise<{ success: boolean; payout?: any; error?: string }> {
  if (!forceOverride) {
    const overlap = await checkPayoutOverlap(barberId, startDate, endDate);
    if (overlap) {
      return {
        success: false,
        error: 'Selected dates overlap an already-paid payout period.',
      };
    }
  }

  const calculation = await calculateCommissionForPeriod(barberId, startDate, endDate);
  if (!calculation) {
    return { success: false, error: 'Failed to calculate commission' };
  }

  const calculatedAmount = Math.round(calculation.calculated_amount * 100) / 100;
  const actualAmount = Math.round(actualAmountPaid * 100) / 100;

  const isOverride = Math.abs(calculatedAmount - actualAmount) > 0.01;

  if (isOverride && (!overrideNote || overrideNote.trim().length === 0)) {
    return {
      success: false,
      error: 'Override note is required when actual amount differs from calculated amount',
    };
  }

  const { data: payout, error: payoutError } = await supabase
    .from('payouts')
    .insert({
      barber_id: barberId,
      start_date: startDate,
      end_date: endDate,
      calculated_amount: calculatedAmount,
      actual_amount_paid: actualAmount,
      payment_method: paymentMethod,
      override_flag: isOverride,
      override_note: isOverride ? overrideNote : null,
      date_paid: new Date().toISOString().split('T')[0],
      calculation_breakdown: calculation.breakdown,
    })
    .select()
    .single();

  if (payoutError || !payout) {
    console.error('Error creating payout:', payoutError);
    return { success: false, error: payoutError?.message || 'Failed to create payout' };
  }

  const payoutItems: any[] = [];

  calculation.breakdown.services.items.forEach((item) => {
    payoutItems.push({
      payout_id: payout.id,
      appointment_id: item.appointment_id,
      item_type: 'service',
      revenue_amount: item.revenue_amount,
      commission_rate: item.commission_rate,
      commission_amount: item.commission_amount,
    });
  });

  calculation.breakdown.tips.items.forEach((item) => {
    payoutItems.push({
      payout_id: payout.id,
      appointment_id: item.appointment_id,
      item_type: 'tip',
      revenue_amount: item.revenue_amount,
      commission_rate: item.commission_rate,
      commission_amount: item.commission_amount,
    });
  });

  calculation.breakdown.products.items.forEach((item) => {
    payoutItems.push({
      payout_id: payout.id,
      inventory_transaction_id: item.inventory_transaction_id,
      item_type: 'product',
      revenue_amount: item.revenue_amount,
      commission_rate: item.commission_rate,
      commission_amount: item.commission_amount,
    });
  });

  if (payoutItems.length > 0) {
    const { error: itemsError } = await supabase.from('payout_items').insert(payoutItems);

    if (itemsError) {
      console.error('Error creating payout items:', itemsError);
    }
  }

  const appointmentIds = [
    ...calculation.breakdown.services.items.map((i) => i.appointment_id),
    ...calculation.breakdown.tips.items.map((i) => i.appointment_id),
  ].filter((id): id is string => id !== undefined);

  if (appointmentIds.length > 0) {
    await supabase
      .from('appointments')
      .update({ commission_paid: true, payout_id: payout.id })
      .in('id', appointmentIds);
  }

  const transactionIds = calculation.breakdown.products.items
    .map((i) => i.inventory_transaction_id)
    .filter((id): id is string => id !== undefined);

  if (transactionIds.length > 0) {
    await supabase
      .from('inventory_transactions')
      .update({ commission_paid: true, payout_id: payout.id })
      .in('id', transactionIds);
  }

  return { success: true, payout };
}

export async function checkPayoutOverlap(
  barberId: string,
  startDate: string,
  endDate: string,
  excludePayoutId?: string
): Promise<boolean> {
  let query = supabase
    .from('payouts')
    .select('id')
    .eq('barber_id', barberId)
    .or(`start_date.lte.${endDate},end_date.gte.${startDate}`)
    .limit(1);

  if (excludePayoutId) {
    query = query.neq('id', excludePayoutId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error checking payout overlap:', error);
    return false;
  }

  return (data || []).length > 0;
}

export async function getBarbersSummary(): Promise<BarberSummary[]> {
  const { data: barbers, error: barbersError } = await supabase
    .from('users')
    .select(`
      id,
      name,
      service_commission_rate,
      product_commission_rate,
      tip_commission_rate
    `)
    .eq('role', 'BARBER')
    .eq('active', true)
    .order('name');

  if (barbersError || !barbers) {
    console.error('Error fetching barbers:', barbersError);
    return [];
  }

  const summaries: BarberSummary[] = [];

  for (const barber of barbers) {
    const { data: unpaidAppts } = await supabase
      .from('appointments')
      .select('service_price, tip_amount')
      .eq('barber_id', barber.id)
      .eq('commission_paid', false)
      .eq('status', 'COMPLETED');

    let serviceRevenue = 0;
    let tipRevenue = 0;

    (unpaidAppts || []).forEach((appt: any) => {
      serviceRevenue += parseFloat(appt.service_price || '0');
      tipRevenue += parseFloat(appt.tip_amount || '0');
    });

    const { data: unpaidProducts } = await supabase
      .from('inventory_transactions')
      .select(`
        quantity_change,
        products(retail_price),
        appointments(barber_id)
      `)
      .eq('type', 'sale')
      .eq('commission_paid', false);

    let productRevenue = 0;

    (unpaidProducts || []).forEach((sale: any) => {
      if (sale.appointments?.barber_id === barber.id) {
        const quantity = Math.abs(sale.quantity_change);
        const price = parseFloat(sale.products?.retail_price || '0');
        productRevenue += quantity * price;
      }
    });

    const serviceRate = parseFloat(barber.service_commission_rate || '0.5');
    const productRate = parseFloat(barber.product_commission_rate || '0.1');
    const tipRate = parseFloat(barber.tip_commission_rate || '1.0');

    const serviceCommission = serviceRevenue * serviceRate;
    const productCommission = productRevenue * productRate;
    const tipCommission = tipRevenue * tipRate;

    const totalCommissionDue = serviceCommission + productCommission + tipCommission;

    const { data: payouts } = await supabase
      .from('payouts')
      .select('actual_amount_paid')
      .eq('barber_id', barber.id);

    const totalPaid = (payouts || []).reduce(
      (sum: number, p: any) => sum + parseFloat(p.actual_amount_paid || '0'),
      0
    );

    summaries.push({
      barber_id: barber.id,
      barber_name: barber.name,
      commission_rates: {
        service_commission_rate: serviceRate,
        product_commission_rate: productRate,
        tip_commission_rate: tipRate,
      },
      service_revenue: serviceRevenue,
      product_revenue: productRevenue,
      tip_revenue: tipRevenue,
      total_commission_due: totalCommissionDue,
      total_paid: totalPaid,
      balance_due: totalCommissionDue - totalPaid,
    });
  }

  return summaries;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}
