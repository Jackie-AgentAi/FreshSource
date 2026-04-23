export function parseAmount(value: number | string | null | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (!value) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatCurrency(value: number | string | null | undefined): string {
  return `¥${parseAmount(value).toFixed(2)}`;
}

export function formatCompactDate(raw: string | null | undefined): string {
  if (!raw) {
    return '-';
  }

  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return raw.slice(0, 16).replace('T', ' ');
  }

  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  return `${month}-${day} ${hour}:${minute}`;
}

export function formatChineseDate(date = new Date()): string {
  return date.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

export function isOrderUrgent(createdAt: string, status: number): boolean {
  if (status !== 0) {
    return false;
  }

  const normalized = createdAt.includes('T') ? createdAt : createdAt.replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return Date.now() - date.getTime() >= 30 * 60 * 1000;
}
