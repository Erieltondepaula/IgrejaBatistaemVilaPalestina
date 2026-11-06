// Local do arquivo: src/hooks/useCalendar.ts

import { useState, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { CalendarEvent } from '@/types/member';
import { useToast } from '@/components/ui/use-toast';

// Tipos para entrada de dados mais genéricos
type NewEventInput = Omit<CalendarEvent, 'id'>;
type UpdateEventInput = Partial<Omit<CalendarEvent, 'id'>>;

export const useCalendar = () => {
  const [storedEvents, setStoredEvents] = useLocalStorage<CalendarEvent[]>('calendar-events', []);
  const [events, setEvents] = useState<CalendarEvent[]>(storedEvents);
  const { toast } = useToast();

  useEffect(() => {
    setEvents(storedEvents);
  }, [storedEvents]);

  const addEvent = (event: NewEventInput) => {
    const newEvent: CalendarEvent = {
      id: `event-${Date.now()}`,
      ...event
    };
    setStoredEvents([...storedEvents, newEvent]);
    toast({ title: "Salvo com sucesso!" });
  };

  const updateEvent = (eventId: string, updates: UpdateEventInput) => {
    const updatedEvents = storedEvents.map(event => 
      event.id === eventId ? { ...event, ...updates } : event
    );
    setStoredEvents(updatedEvents);
    toast({ title: "Evento atualizado!" });
  };
  
  const deleteEvent = (eventId: string) => {
    const filteredEvents = storedEvents.filter(event => event.id !== eventId);
    setStoredEvents(filteredEvents);
    toast({ title: "Evento removido.", variant: "destructive" });
  };

  return { events, addEvent, updateEvent, deleteEvent, setEvents };
};