// Local do arquivo: src/pages/CalendarPage.tsx

import { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useAppContext } from '@/contexts/useAppContext';
import { useCalendar } from '@/hooks/useCalendar';
import { DateSelectArg, EventClickArg } from '@fullcalendar/core';
import { CalendarEvent } from '@/types/member';
import { AddEditEventModal } from '@/components/dashboard/AddEditEventModal';

export default function CalendarPage() {
  const { members } = useAppContext();
  const { events, addEvent, updateEvent, deleteEvent } = useCalendar();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Partial<CalendarEvent> | null>(null);

  const allEvents = useMemo(() => {
    const year = new Date().getFullYear();
    const birthdayEvents = members
      .filter(m => m.status === 'ativo' && m.dataNascimento)
      .flatMap(member => {
        const [, month, day] = member.dataNascimento.split('-');
        // Define cor baseada no sexo: azul para masculino, rosa para feminino
        const color = member.sexo === 'M' ? '#3b82f6' : '#ec4899';
        
        return [-1, 0, 1].map(offset => ({
          id: `birthday-${member.id}-${year + offset}`,
          groupId: `birthday-${member.id}`,
          title: `Aniv. ${member.nomeCompleto || member.nome}`,
          start: `${year + offset}-${month}-${day}`,
          allDay: true,
          display: 'block',
          backgroundColor: color,
          borderColor: color,
          extendedProps: { 
            type: 'birthday', 
            originalTitle: `Aniversário de ${member.nomeCompleto || member.nome}`,
            memberId: member.id,
            memberSexo: member.sexo
          }
        }));
      });

    const customEvents = events.map(event => ({
      id: event.id,
      title: event.title,
      start: event.date,
      allDay: true,
      backgroundColor: event.color || (event.type === 'task' ? '#f59e0b' : '#3b82f6'),
      borderColor: event.color || (event.type === 'task' ? '#f59e0b' : '#3b82f6'),
      display: 'block',
      extendedProps: { ...event }
    }));
    
    return [...birthdayEvents, ...customEvents];
  }, [members, events]);

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setSelectedEvent({ date: selectInfo.startStr });
    setIsModalOpen(true);
  };

  // ✅ CORREÇÃO: Agora, qualquer evento clicado abre o modal.
  const handleEventClick = (clickInfo: EventClickArg) => {
    setSelectedEvent({
      id: clickInfo.event.id,
      title: clickInfo.event.title,
      date: clickInfo.event.startStr,
      ...clickInfo.event.extendedProps
    });
    setIsModalOpen(true);
  };

  const handleSaveEvent = (eventData: Omit<CalendarEvent, 'id'>) => {
    addEvent(eventData);
  };

  const handleUpdateEvent = (eventId: string, updates: Partial<Omit<CalendarEvent, 'id'>>) => {
    updateEvent(eventId, updates);
  };

  const handleDeleteEvent = (eventId: string) => {
    deleteEvent(eventId);
  };

  return (
    <>
      <div className="p-4 bg-card rounded-lg shadow-md h-[85vh]">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          initialView="dayGridMonth"
          locale="pt-br"
          weekends={true}
          events={allEvents}
          selectable={true}
          select={handleDateSelect}
          eventClick={handleEventClick}
          height="100%"
          timeZone='UTC'
        />
      </div>

      <AddEditEventModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEvent}
        onUpdate={handleUpdateEvent}
        onDelete={handleDeleteEvent}
        event={selectedEvent}
      />
    </>
  );
};