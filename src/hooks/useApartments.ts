import { useState, useEffect } from 'react';
import { Apartment } from '../types';

const STORAGE_KEY = 'nyc_apartments_v1';

export function useApartments() {
  const [apartments, setApartments] = useState<Apartment[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apartments));
  }, [apartments]);

  const addApartment = (data: Omit<Apartment, 'id' | 'createdAt'>): Apartment => {
    const apt: Apartment = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setApartments(prev => [apt, ...prev]);
    return apt;
  };

  const updateApartment = (id: string, updates: Partial<Omit<Apartment, 'id' | 'createdAt'>>) => {
    setApartments(prev =>
      prev.map(apt => (apt.id === id ? { ...apt, ...updates } : apt))
    );
  };

  const deleteApartment = (id: string) => {
    setApartments(prev => prev.filter(apt => apt.id !== id));
  };

  const replaceAll = (apts: Apartment[]) => {
    setApartments(apts);
  };

  return { apartments, addApartment, updateApartment, deleteApartment, replaceAll };
}
