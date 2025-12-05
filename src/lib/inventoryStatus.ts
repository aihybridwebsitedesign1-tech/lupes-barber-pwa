export type InventoryStatus = 'OUT' | 'LOW' | 'HIGH' | 'OK';

export interface InventoryStatusResult {
  status: InventoryStatus;
  label: {
    en: string;
    es: string;
  };
  color: string;
  backgroundColor: string;
}

export function getInventoryStatus(
  currentStock: number,
  lowThreshold: number | null,
  highThreshold: number | null
): InventoryStatusResult {
  const defaultLowThreshold = 5;
  const defaultHighThreshold = 50;

  const effectiveLowThreshold = lowThreshold ?? defaultLowThreshold;
  const effectiveHighThreshold = highThreshold ?? defaultHighThreshold;

  if (currentStock <= 0) {
    return {
      status: 'OUT',
      label: { en: 'OUT OF STOCK', es: 'AGOTADO' },
      color: '#fff',
      backgroundColor: '#dc3545',
    };
  }

  if (currentStock <= effectiveLowThreshold) {
    return {
      status: 'LOW',
      label: { en: 'LOW STOCK', es: 'STOCK BAJO' },
      color: '#856404',
      backgroundColor: '#fff3cd',
    };
  }

  if (currentStock >= effectiveHighThreshold) {
    return {
      status: 'HIGH',
      label: { en: 'HIGH STOCK', es: 'STOCK ALTO' },
      color: '#004085',
      backgroundColor: '#cce5ff',
    };
  }

  return {
    status: 'OK',
    label: { en: 'IN STOCK', es: 'EN STOCK' },
    color: '#155724',
    backgroundColor: '#d4edda',
  };
}
