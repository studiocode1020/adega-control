"use client";
import { useState, useEffect, useCallback } from 'react';
import { SensorNotification } from '@/types';
import { getNotifications, setNotifications, getWines, setWines, getMovements, setMovements } from '@/lib/storage';
import { generateId } from '@/lib/format';
import { mockNotifications } from '@/data/mock-notifications';

const NOTIF_INITIALIZED_KEY = 'adega-notifications-initialized';

export function useNotifications() {
  const [notifications, setNotificationsState] = useState<SensorNotification[]>([]);

  useEffect(() => {
    // Seed mock notifications if first time
    if (typeof window !== 'undefined' && !localStorage.getItem(NOTIF_INITIALIZED_KEY)) {
      setNotifications(mockNotifications);
      localStorage.setItem(NOTIF_INITIALIZED_KEY, 'true');
    }
    setNotificationsState(getNotifications());
  }, []);

  const pending = notifications.filter(n => n.status === 'pending');

  const confirm = useCallback((notifId: string) => {
    const all = getNotifications();
    const notif = all.find(n => n.id === notifId);
    if (!notif || notif.status !== 'pending' || !notif.wineId) return;

    // Update notification status
    const updated = all.map(n => n.id === notifId
      ? { ...n, status: 'confirmed' as const, confirmedAt: new Date().toISOString() }
      : n
    );
    setNotifications(updated);
    setNotificationsState(updated);

    // Create movement
    const movements = getMovements();
    const newMovement = {
      id: generateId(),
      wineId: notif.wineId,
      type: notif.type,
      quantity: notif.quantity,
      date: new Date().toISOString().split('T')[0],
      reason: notif.type === 'saida' ? 'consumo' as const : null,
      supplier: null,
      invoiceNumber: null,
      notes: `Detectado pelo sensor RFID (tag: ${notif.tagId})`,
      createdAt: new Date().toISOString(),
    };
    setMovements([newMovement, ...movements]);

    // Update wine quantity
    const wines = getWines();
    const updatedWines = wines.map(w => {
      if (w.id === notif.wineId) {
        const newQty = notif.type === 'entrada'
          ? w.quantity + notif.quantity
          : w.quantity - notif.quantity;
        return { ...w, quantity: Math.max(0, newQty) };
      }
      return w;
    });
    setWines(updatedWines);
  }, []);

  const reject = useCallback((notifId: string) => {
    const all = getNotifications();
    const updated = all.map(n => n.id === notifId
      ? { ...n, status: 'rejected' as const, confirmedAt: new Date().toISOString() }
      : n
    );
    setNotifications(updated);
    setNotificationsState(updated);
  }, []);

  const clearResolved = useCallback(() => {
    const all = getNotifications();
    const onlyPending = all.filter(n => n.status === 'pending');
    setNotifications(onlyPending);
    setNotificationsState(onlyPending);
  }, []);

  // Future: this function will be called by WebSocket/API when sensor sends data
  const addFromSensor = useCallback((data: { tagId: string; type: 'entrada' | 'saida'; wineId?: string; wineName?: string }) => {
    const all = getNotifications();
    const newNotif: SensorNotification = {
      id: generateId(),
      tagId: data.tagId,
      wineId: data.wineId || null,
      wineName: data.wineName || null,
      type: data.type,
      quantity: 1,
      detectedAt: new Date().toISOString(),
      status: 'pending',
      confirmedAt: null,
    };
    const updated = [newNotif, ...all];
    setNotifications(updated);
    setNotificationsState(updated);
    return newNotif;
  }, []);

  return { notifications, pending, confirm, reject, clearResolved, addFromSensor };
}
