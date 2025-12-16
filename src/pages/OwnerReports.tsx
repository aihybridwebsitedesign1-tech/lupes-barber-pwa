import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { exportToCSV } from '../lib/csvExport';
import Header from '../components/Header';

type DatePreset = 'today' | 'last7' | 'last30' | 'thisMonth' | 'custom';

type Metrics = {
  totalRevenue: number;
  servicesRevenue: number;
  totalTips: number;
  completedCount: number;
  cancelledCount: number;
  totalAppointments: number;
  cancellationRate: number;
};

type SourceBreakdown = {
  source: string;
  appointments: number;
  servicesRevenue: number;
  tips: number;
  percentage: number;
};

type BarberBreakdown = {
  name: string;
  completed: number;
  servicesRevenue: number;
  tips: number;
  avgTicket: number;
};

type ServiceBreakdown = {
  name: string;
  category: string;
  completed: number;
  revenue: number;
  avgPrice: number;
};

type ProductSale = {
  productName: string;
  brand: string;
  unitsSold: number;
  revenue: number;
  currentStock: number;
};

export default function OwnerReports() {
  const [datePreset, setDatePreset] = useState<DatePreset>('last30');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [sourceBreakdown, setSourceBreakdown] = useState<SourceBreakdown[]>([]);
  const [barberBreakdown, setBarberBreakdown] = useState<BarberBreakdown[]>([]);
  const [serviceBreakdown, setServiceBreakdown] = useState<ServiceBreakdown[]>([]);
  const [productSales, setProductSales] = useState<ProductSale[]>([]);
  const [productRevenue, setProductRevenue] = useState(0);
  const [appointmentsWithProducts, setAppointmentsWithProducts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { language } = useLanguage();
  const { userData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!userData) return;
    if (userData.role !== 'OWNER' && !userData.can_view_shop_reports) {
      navigate('/');
      return;
    }
    loadAllData();
  }, [userData, datePreset, customStartDate, customEndDate]);

  const getDateRange = () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (datePreset === 'today') {
      const endOfToday = new Date(startOfToday);
      endOfToday.setDate(endOfToday.getDate() + 1);
      return { start: startOfToday.toISOString(), end: endOfToday.toISOString() };
    } else if (datePreset === 'last7') {
      const start = new Date(startOfToday);
      start.setDate(start.getDate() - 7);
      return { start: start.toISOString(), end: now.toISOString() };
    } else if (datePreset === 'last30') {
      const start = new Date(startOfToday);
      start.setDate(start.getDate() - 30);
      return { start: start.toISOString(), end: now.toISOString() };
    } else if (datePreset === 'thisMonth') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: startOfMonth.toISOString(), end: now.toISOString() };
    } else if (datePreset === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate + 'T00:00:00');
      const end = new Date(customEndDate + 'T23:59:59');
      return { start: start.toISOString(), end: end.toISOString() };
    }
    return null;
  };

  const getRangeLabelvalue = () => {
    if (datePreset === 'today') return language === 'en' ? 'Today' : 'Hoy';
    if (datePreset === 'last7') return language === 'en' ? 'Last 7 days' : 'Últimos 7 días';
    if (datePreset === 'last30') return language === 'en' ? 'Last 30 days' : 'Últimos 30 días';
    if (datePreset === 'thisMonth') return language === 'en' ? 'This Month' : 'Este Mes';
    if (datePreset === 'custom' && customStartDate && customEndDate) {
      return `${customStartDate} - ${customEndDate}`;
    }
    return '';
  };

  const loadAllData = async () => {
    setLoading(true);
    setError('');

    try {
      const dateRange = getDateRange();
      if (!dateRange) {
        setLoading(false);
        return;
      }

      let appointmentsQuery = supabase
        .from('appointments')
        .select(`
          *,
          barber:barber_id(name),
          service:service_id(name_en, name_es, category, base_price)
        `)
        .gte('scheduled_start', dateRange.start)
        .lte('scheduled_start', dateRange.end);

      const { data: appointments, error: apptError } = await appointmentsQuery;

      if (apptError) throw apptError;

      const completed = (appointments || []).filter(a => a.status === 'completed');
      const cancelled = (appointments || []).filter(a => a.status === 'cancelled');
      const totalCount = (appointments || []).length;

      // Calculate services revenue with fallback to service base_price if services_total is not set
      const servicesRevenue = completed.reduce((sum, a) => {
        const serviceTotal = Number(a.services_total || 0);
        if (serviceTotal > 0) return sum + serviceTotal;
        // Fallback: use service base_price if services_total is not set
        const basePrice = Number((a.service as any)?.base_price || 0);
        return sum + basePrice;
      }, 0);
      const productsRevenue = completed.reduce((sum, a) => sum + Number(a.products_total || 0), 0);
      const totalTips = completed.reduce((sum, a) => sum + Number(a.tip_amount || 0), 0);
      const totalRevenue = servicesRevenue + productsRevenue;

      const cancellationRate = totalCount > 0 ? (cancelled.length / totalCount) * 100 : 0;

      setMetrics({
        totalRevenue,
        servicesRevenue,
        totalTips,
        completedCount: completed.length,
        cancelledCount: cancelled.length,
        totalAppointments: totalCount,
        cancellationRate,
      });

      // Helper to get service revenue for an appointment with fallback
      const getAptServiceRevenue = (apt: any): number => {
        const serviceTotal = Number(apt.services_total || 0);
        if (serviceTotal > 0) return serviceTotal;
        return Number(apt.service?.base_price || 0);
      };

      const sourceMap = new Map<string, SourceBreakdown>();
      completed.forEach(apt => {
        const source = apt.source || 'unknown';
        if (!sourceMap.has(source)) {
          sourceMap.set(source, {
            source,
            appointments: 0,
            servicesRevenue: 0,
            tips: 0,
            percentage: 0,
          });
        }
        const stats = sourceMap.get(source)!;
        stats.appointments += 1;
        stats.servicesRevenue += getAptServiceRevenue(apt);
        stats.tips += Number(apt.tip_amount || 0);
      });

      const sourceArray = Array.from(sourceMap.values());
      sourceArray.forEach(s => {
        s.percentage = completed.length > 0 ? (s.appointments / completed.length) * 100 : 0;
      });
      setSourceBreakdown(sourceArray.sort((a, b) => b.appointments - a.appointments));

      const barberMap = new Map<string, BarberBreakdown>();
      completed.forEach(apt => {
        const barberId = apt.barber_id || 'unassigned';
        const barberName = apt.barber?.name || (language === 'en' ? 'Unassigned' : 'Sin asignar');

        if (!barberMap.has(barberId)) {
          barberMap.set(barberId, {
            name: barberName,
            completed: 0,
            servicesRevenue: 0,
            tips: 0,
            avgTicket: 0,
          });
        }

        const stats = barberMap.get(barberId)!;
        stats.completed += 1;
        stats.servicesRevenue += getAptServiceRevenue(apt);
        stats.tips += Number(apt.tip_amount || 0);
      });

      const barberArray = Array.from(barberMap.values()).map(b => ({
        ...b,
        avgTicket: b.completed > 0 ? b.servicesRevenue / b.completed : 0,
      }));
      setBarberBreakdown(barberArray.sort((a, b) => b.servicesRevenue - a.servicesRevenue));

      const serviceMap = new Map<string, ServiceBreakdown>();
      completed.forEach(apt => {
        const serviceId = apt.service_id;
        const serviceName = language === 'en' ? apt.service?.name_en : apt.service?.name_es;
        const category = apt.service?.category || (language === 'en' ? 'Other' : 'Otro');

        if (serviceName && !serviceMap.has(serviceId)) {
          serviceMap.set(serviceId, {
            name: serviceName,
            category,
            completed: 0,
            revenue: 0,
            avgPrice: 0,
          });
        }

        if (serviceName) {
          const stats = serviceMap.get(serviceId)!;
          stats.completed += 1;
          stats.revenue += getAptServiceRevenue(apt);
        }
      });

      const serviceArray = Array.from(serviceMap.values()).map(s => ({
        ...s,
        avgPrice: s.completed > 0 ? s.revenue / s.completed : 0,
      }));
      setServiceBreakdown(serviceArray.sort((a, b) => b.revenue - a.revenue));

      const { data: appointmentProducts } = await supabase
        .from('appointment_products')
        .select(`
          *,
          appointment:appointment_id(scheduled_start, status),
          product:product_id(name_en, name_es, brand, current_stock)
        `)
        .gte('appointment.scheduled_start', dateRange.start)
        .lte('appointment.scheduled_start', dateRange.end);

      const productMap = new Map<string, ProductSale>();
      let productRevenueTotal = 0;
      const aptWithProductsSet = new Set();

      (appointmentProducts || []).forEach((ap: any) => {
        if (ap.appointment?.status !== 'completed') return;

        const productId = ap.product_id;
        const productName = language === 'en' ? ap.product?.name_en : ap.product?.name_es;
        const brand = ap.product?.brand || '';
        const currentStock = ap.product?.current_stock || 0;

        aptWithProductsSet.add(ap.appointment_id);

        if (productName && !productMap.has(productId)) {
          productMap.set(productId, {
            productName,
            brand,
            unitsSold: 0,
            revenue: 0,
            currentStock,
          });
        }

        if (productName) {
          const stats = productMap.get(productId)!;
          stats.unitsSold += ap.quantity || 0;
          const revenue = Number(ap.unit_price || 0) * (ap.quantity || 0);
          stats.revenue += revenue;
          productRevenueTotal += revenue;
        }
      });

      setProductSales(Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue));
      setProductRevenue(productRevenueTotal);
      setAppointmentsWithProducts(aptWithProductsSet.size);

    } catch (err: any) {
      console.error('Error loading analytics:', err);
      setError(
        language === 'en'
          ? 'Error loading analytics data. Please try again.'
          : 'Error al cargar datos de análisis. Por favor intenta de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExportBarbers = () => {
    if (!barberBreakdown.length) return;

    const headers = {
      name: 'Barber',
      completed: 'Appointments',
      servicesRevenue: 'Services Revenue',
      tips: 'Tips',
      avgTicket: 'Avg Ticket',
    };

    exportToCSV(barberBreakdown, 'lupes-barber-by-barber', headers);
  };

  const handleExportProducts = () => {
    if (!productSales.length) return;

    const headers = {
      productName: 'Product',
      brand: 'Brand',
      unitsSold: 'Units Sold',
      revenue: 'Revenue',
      currentStock: 'Current Stock',
    };

    exportToCSV(productSales, 'lupes-barber-product-sales', headers);
  };

  if (!userData || (userData.role !== 'OWNER' && !userData.can_view_shop_reports)) {
    return (
      <div>
        <Header />
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          {language === 'en' ? 'You do not have permission to view reports.' : 'No tienes permiso para ver reportes.'}
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  const getSourceLabel = (source: string) => {
    const labels: Record<string, { en: string; es: string }> = {
      owner: { en: 'Owner', es: 'Dueño' },
      barber: { en: 'Barber', es: 'Barbero' },
      client_web: { en: 'Online', es: 'En línea' },
      walk_in: { en: 'Walk-In', es: 'Sin cita' },
      unknown: { en: 'Unknown', es: 'Desconocido' },
    };
    return labels[source] ? (language === 'en' ? labels[source].en : labels[source].es) : source;
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Header />
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          {language === 'en' ? 'Analytics & Reports' : 'Análisis y Reportes'}
        </h2>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '1.5rem' }}>
          {language === 'en'
            ? 'Track performance, revenue, and booking sources'
            : 'Rastrea rendimiento, ingresos y fuentes de reservas'}
        </p>

        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            {['today', 'last7', 'last30', 'thisMonth', 'custom'].map((preset) => (
              <button
                key={preset}
                onClick={() => setDatePreset(preset as DatePreset)}
                style={{
                  padding: '0.75rem',
                  backgroundColor: datePreset === preset ? '#000' : 'white',
                  color: datePreset === preset ? 'white' : '#000',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: datePreset === preset ? '600' : '400',
                }}
              >
                {preset === 'today' && (language === 'en' ? 'Today' : 'Hoy')}
                {preset === 'last7' && (language === 'en' ? 'Last 7 Days' : 'Últimos 7 Días')}
                {preset === 'last30' && (language === 'en' ? 'Last 30 Days' : 'Últimos 30 Días')}
                {preset === 'thisMonth' && (language === 'en' ? 'This Month' : 'Este Mes')}
                {preset === 'custom' && (language === 'en' ? 'Custom' : 'Personalizado')}
              </button>
            ))}
          </div>

          {datePreset === 'custom' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                  {language === 'en' ? 'Start Date' : 'Fecha Inicio'}
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500' }}>
                  {language === 'en' ? 'End Date' : 'Fecha Fin'}
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#fee',
              color: '#c00',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', fontSize: '16px', color: '#666' }}>
            {language === 'en' ? 'Loading analytics...' : 'Cargando análisis...'}
          </div>
        ) : !metrics ? (
          <div style={{ textAlign: 'center', padding: '3rem', fontSize: '16px', color: '#666' }}>
            {language === 'en'
              ? 'Please select a date range to view analytics'
              : 'Por favor selecciona un rango de fechas para ver análisis'}
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {[
                { label: language === 'en' ? 'Total Revenue' : 'Ingresos Totales', value: formatCurrency(metrics.totalRevenue) },
                { label: language === 'en' ? 'Services Revenue' : 'Ingresos Servicios', value: formatCurrency(metrics.servicesRevenue) },
                { label: language === 'en' ? 'Total Tips' : 'Propinas Totales', value: formatCurrency(metrics.totalTips) },
                { label: language === 'en' ? 'Completed' : 'Completadas', value: metrics.completedCount },
                { label: language === 'en' ? 'Cancellation Rate' : 'Tasa Cancelación', value: formatPercent(metrics.cancellationRate) },
              ].map((card, i) => (
                <div key={i} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.5rem' }}>{card.label}</div>
                  <div style={{ fontSize: '26px', fontWeight: 'bold', marginBottom: '0.25rem' }}>{card.value}</div>
                  <div style={{ fontSize: '11px', color: '#999' }}>{getRangeLabelvalue()}</div>
                </div>
              ))}
            </div>

            {metrics.completedCount === 0 ? (
              <div style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '8px', textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📊</div>
                <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '0.5rem' }}>
                  {language === 'en' ? 'No Data for This Period' : 'No Hay Datos para Este Período'}
                </h3>
                <p style={{ fontSize: '14px', color: '#666' }}>
                  {language === 'en'
                    ? 'Try selecting a different date range to see analytics'
                    : 'Intenta seleccionar un rango de fechas diferente para ver análisis'}
                </p>
              </div>
            ) : (
              <>
                <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '2rem' }}>
                  <h3 style={{ padding: '1.5rem', fontSize: '20px', fontWeight: 'bold', borderBottom: '1px solid #eee' }}>
                    {language === 'en' ? 'By Booking Source' : 'Por Fuente de Reserva'}
                  </h3>
                  {sourceBreakdown.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ backgroundColor: '#f9f9f9' }}>
                        <tr>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                            {language === 'en' ? 'Source' : 'Fuente'}
                          </th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                            {language === 'en' ? 'Appointments' : 'Citas'}
                          </th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                            {language === 'en' ? 'Services Revenue' : 'Ingresos Servicios'}
                          </th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                            {language === 'en' ? 'Tips' : 'Propinas'}
                          </th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                            {language === 'en' ? '% of Total' : '% del Total'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sourceBreakdown.map((source, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '1rem', fontSize: '14px' }}>{getSourceLabel(source.source)}</td>
                            <td style={{ padding: '1rem', fontSize: '14px' }}>{source.appointments}</td>
                            <td style={{ padding: '1rem', fontSize: '14px' }}>{formatCurrency(source.servicesRevenue)}</td>
                            <td style={{ padding: '1rem', fontSize: '14px' }}>{formatCurrency(source.tips)}</td>
                            <td style={{ padding: '1rem', fontSize: '14px' }}>{formatPercent(source.percentage)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#999', fontSize: '14px' }}>
                      {language === 'en' ? 'No data for this period.' : 'No hay datos para este período.'}
                    </div>
                  )}
                </div>

                <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '2rem' }}>
                  <div style={{ padding: '1.5rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: 'bold' }}>
                      {language === 'en' ? 'By Barber' : 'Por Barbero'}
                    </h3>
                    {barberBreakdown.length > 0 && (
                      <button
                        onClick={handleExportBarbers}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '500',
                        }}
                      >
                        {language === 'en' ? '📥 Download CSV' : '📥 Descargar CSV'}
                      </button>
                    )}
                  </div>
                  {barberBreakdown.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ backgroundColor: '#f9f9f9' }}>
                        <tr>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                            {language === 'en' ? 'Barber' : 'Barbero'}
                          </th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                            {language === 'en' ? 'Completed' : 'Completadas'}
                          </th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                            {language === 'en' ? 'Services Revenue' : 'Ingresos Servicios'}
                          </th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                            {language === 'en' ? 'Tips' : 'Propinas'}
                          </th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                            {language === 'en' ? 'Avg Ticket' : 'Ticket Prom'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {barberBreakdown.map((barber, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '1rem', fontSize: '14px', fontWeight: '500' }}>{barber.name}</td>
                            <td style={{ padding: '1rem', fontSize: '14px' }}>{barber.completed}</td>
                            <td style={{ padding: '1rem', fontSize: '14px' }}>{formatCurrency(barber.servicesRevenue)}</td>
                            <td style={{ padding: '1rem', fontSize: '14px' }}>{formatCurrency(barber.tips)}</td>
                            <td style={{ padding: '1rem', fontSize: '14px' }}>{formatCurrency(barber.avgTicket)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#999', fontSize: '14px' }}>
                      {language === 'en' ? 'No data for this period.' : 'No hay datos para este período.'}
                    </div>
                  )}
                </div>

                <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '2rem' }}>
                  <h3 style={{ padding: '1.5rem', fontSize: '20px', fontWeight: 'bold', borderBottom: '1px solid #eee' }}>
                    {language === 'en' ? 'By Service / Category' : 'Por Servicio / Categoría'}
                  </h3>
                  {serviceBreakdown.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ backgroundColor: '#f9f9f9' }}>
                        <tr>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                            {language === 'en' ? 'Service' : 'Servicio'}
                          </th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                            {language === 'en' ? 'Category' : 'Categoría'}
                          </th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                            {language === 'en' ? 'Completed' : 'Completadas'}
                          </th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                            {language === 'en' ? 'Revenue' : 'Ingresos'}
                          </th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                            {language === 'en' ? 'Avg Price' : 'Precio Prom'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {serviceBreakdown.map((service, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '1rem', fontSize: '14px' }}>{service.name}</td>
                            <td style={{ padding: '1rem', fontSize: '14px' }}>{service.category}</td>
                            <td style={{ padding: '1rem', fontSize: '14px' }}>{service.completed}</td>
                            <td style={{ padding: '1rem', fontSize: '14px' }}>{formatCurrency(service.revenue)}</td>
                            <td style={{ padding: '1rem', fontSize: '14px' }}>{formatCurrency(service.avgPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#999', fontSize: '14px' }}>
                      {language === 'en' ? 'No data for this period.' : 'No hay datos para este período.'}
                    </div>
                  )}
                </div>

                <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '2rem' }}>
                  <div style={{ padding: '1.5rem', borderBottom: '1px solid #eee' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '20px', fontWeight: 'bold' }}>
                        {language === 'en' ? 'Product Sales' : 'Ventas de Productos'}
                      </h3>
                      {productSales.length > 0 && (
                        <button
                          onClick={handleExportProducts}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500',
                          }}
                        >
                          {language === 'en' ? '📥 Download CSV' : '📥 Descargar CSV'}
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.25rem' }}>
                          {language === 'en' ? 'Total Product Revenue' : 'Ingresos Totales Productos'}
                        </div>
                        <div style={{ fontSize: '22px', fontWeight: 'bold' }}>{formatCurrency(productRevenue)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.25rem' }}>
                          {language === 'en' ? 'Appointments with Products' : 'Citas con Productos'}
                        </div>
                        <div style={{ fontSize: '22px', fontWeight: 'bold' }}>{appointmentsWithProducts}</div>
                      </div>
                    </div>
                  </div>
                  {productSales.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ backgroundColor: '#f9f9f9' }}>
                        <tr>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                            {language === 'en' ? 'Product' : 'Producto'}
                          </th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                            {language === 'en' ? 'Brand' : 'Marca'}
                          </th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                            {language === 'en' ? 'Units Sold' : 'Unidades Vendidas'}
                          </th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                            {language === 'en' ? 'Revenue' : 'Ingresos'}
                          </th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                            {language === 'en' ? 'Current Stock' : 'Stock Actual'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {productSales.map((product, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '1rem', fontSize: '14px' }}>{product.productName}</td>
                            <td style={{ padding: '1rem', fontSize: '14px', color: '#666' }}>{product.brand || '—'}</td>
                            <td style={{ padding: '1rem', fontSize: '14px' }}>{product.unitsSold}</td>
                            <td style={{ padding: '1rem', fontSize: '14px' }}>{formatCurrency(product.revenue)}</td>
                            <td style={{ padding: '1rem', fontSize: '14px' }}>
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '12px',
                                backgroundColor: product.currentStock < 5 ? '#fee' : '#f0f0f0',
                                color: product.currentStock < 5 ? '#c00' : '#333',
                              }}>
                                {product.currentStock}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#999', fontSize: '14px' }}>
                      {language === 'en'
                        ? 'No product sales in this period.'
                        : 'No hay ventas de productos en este período.'}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
