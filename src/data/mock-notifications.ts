import { SensorNotification } from '@/types';

// Simulated RFID sensor detections awaiting user confirmation
export const mockNotifications: SensorNotification[] = [
  {
    id: 'notif-1',
    tagId: 'RFID-A1B2C3',
    wineId: 'w6',
    wineName: 'Château Margaux',
    type: 'saida',
    quantity: 1,
    detectedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    status: 'pending',
    confirmedAt: null,
  },
  {
    id: 'notif-2',
    tagId: 'RFID-D4E5F6',
    wineId: 'w4',
    wineName: 'Catena Zapata Malbec',
    type: 'saida',
    quantity: 1,
    detectedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    status: 'pending',
    confirmedAt: null,
  },
  {
    id: 'notif-3',
    tagId: 'RFID-G7H8I9',
    wineId: 'w3',
    wineName: 'Quinta do Crasto Reserva',
    type: 'entrada',
    quantity: 1,
    detectedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    status: 'pending',
    confirmedAt: null,
  },
  {
    id: 'notif-4',
    tagId: 'RFID-X0Y1Z2',
    wineId: null,
    wineName: null,
    type: 'entrada',
    quantity: 1,
    detectedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    status: 'pending',
    confirmedAt: null,
  },
];
