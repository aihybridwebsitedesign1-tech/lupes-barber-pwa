import { useLanguage } from '../contexts/LanguageContext';

type PaymentStatus = 'paid' | 'unpaid' | 'refunded' | 'partial';

type PaymentStatusBadgeProps = {
  status: PaymentStatus | null;
  size?: 'small' | 'medium';
};

export default function PaymentStatusBadge({ status, size = 'medium' }: PaymentStatusBadgeProps) {
  const { language } = useLanguage();

  if (!status) {
    return null;
  }

  const config = {
    paid: {
      bg: '#10b981',
      text: language === 'en' ? 'Paid' : 'Pagado',
      icon: '💳',
    },
    unpaid: {
      bg: '#ef4444',
      text: language === 'en' ? 'Unpaid' : 'No Pagado',
      icon: '',
    },
    refunded: {
      bg: '#6b7280',
      text: language === 'en' ? 'Refunded' : 'Reembolsado',
      icon: '↩️',
    },
    partial: {
      bg: '#f59e0b',
      text: language === 'en' ? 'Partial' : 'Parcial',
      icon: '½',
    },
  };

  const statusConfig = config[status] || config.unpaid;
  const fontSize = size === 'small' ? '11px' : '12px';
  const padding = size === 'small' ? '2px 6px' : '4px 8px';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: statusConfig.bg,
        color: 'white',
        padding,
        borderRadius: '4px',
        fontSize,
        fontWeight: '600',
        whiteSpace: 'nowrap',
      }}
    >
      {statusConfig.icon && <span>{statusConfig.icon}</span>}
      <span>{statusConfig.text}</span>
    </span>
  );
}
