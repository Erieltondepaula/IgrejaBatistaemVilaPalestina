// Local do arquivo: src/components/dashboard/Calendar.tsx

import { useState, useMemo, useEffect } from 'react';
import { DayPicker, DayContentProps } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { ptBR } from 'date-fns/locale';
import { format, getMonth, parse, isSameDay } from 'date-fns'; // ✅ Importa a função 'isSameDay'
import { useAppContext } from '@/contexts/useAppContext';
import { useCalendar } from '@/hooks/useCalendar';
import { CalendarEvent } from '@/types/member';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Cake, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const AppCalendar = () => {
  const { members } = useAppContext();
  const { events, addEvent, updateEvent, deleteEvent } = useCalendar();
  const [date, setDate] = useState<Date | undefined>(new Date());
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editingEventTitle, setEditingEventTitle] = useState('');

  useEffect(() => {
    if (editingEvent) {
      setEditingEventTitle(editingEvent.title);
    }
  }, [editingEvent]);
  
  const parseDateAsLocal = (dateString: string): Date => {
    // Se a data vem em formato ISO (com hora), extrair apenas a data
    if (dateString.includes('T')) {
      const isoDate = new Date(dateString);
      if (isNaN(isoDate.getTime())) {
        console.warn('Data ISO inválida:', dateString);
        return new Date(); // Retorna data atual como fallback
      }
      return isoDate;
    }
    // Caso contrário, fazer parse do formato yyyy-MM-dd
    const parsed = parse(dateString, 'yyyy-MM-dd', new Date());
    if (isNaN(parsed.getTime())) {
      console.warn('Data inválida:', dateString);
      return new Date(); // Retorna data atual como fallback
    }
    return parsed;
  };

  const birthdays = useMemo((): CalendarEvent[] => {
    return members
      .filter(member => 
        (member.situacaoAtual === 'ativo' || member.status === 'ativo') && 
        member.dataNascimento
      )
      .map((member) => {
        // Converter data ISO para formato yyyy-MM-dd para o calendário
        let dateForCalendar = member.dataNascimento;
        if (dateForCalendar.includes('T')) {
          const isoDate = new Date(dateForCalendar);
          if (!isNaN(isoDate.getTime())) {
            dateForCalendar = format(isoDate, 'yyyy-MM-dd');
          }
        }
        return {
          id: `birthday-${member.id}`,
          title: `Aniversário de ${member.nome.split(' ')[0]}`,
          date: dateForCalendar,
          type: 'birthday',
        };
      });
  }, [members]);

  const allEvents = useMemo(() => [...birthdays, ...events], [birthdays, events]);

  const eventsByDayOfYear = useMemo(() => {
    return allEvents.reduce((acc, event) => {
        try {
          const eventDate = parseDateAsLocal(event.date);
          // Validar se a data é válida
          if (isNaN(eventDate.getTime())) {
            console.warn('Data inválida no evento:', event);
            return acc;
          }
          const key = format(eventDate, 'MM-dd');
          if (!acc[key]) {
              acc[key] = { hasMale: false, hasFemale: false, hasEvent: false };
          }
          
          // ✅ CORREÇÃO: Verificar sexo do aniversariante
          if (event.type === 'birthday') {
            // Buscar o membro correspondente para verificar o sexo
            const member = members.find(m => `birthday-${m.id}` === event.id);
            if (member) {
              const sexo = member.sexo?.toUpperCase();
              if (sexo === 'M' || sexo === 'MASCULINO') {
                acc[key].hasMale = true;
              } else if (sexo === 'F' || sexo === 'FEMININO') {
                acc[key].hasFemale = true;
              }
            }
          }
          if (event.type === 'event') acc[key].hasEvent = true;
        } catch (error) {
          console.error('Erro ao processar evento:', event, error);
        }
        return acc;
    }, {} as Record<string, { hasMale: boolean, hasFemale: boolean, hasEvent: boolean }>);
  }, [allEvents, members]);

  // ✅ CORREÇÃO: Nova lógica para filtrar eventos do dia selecionado
  const eventsForSelectedDay = useMemo(() => {
    if (!date) return [];
    
    // Filtra aniversários que ocorrem no mesmo dia e mês do dia selecionado
    const dailyBirthdays = birthdays.filter(b => {
        const birthDate = parseDateAsLocal(b.date);
        return birthDate.getDate() === date.getDate() && birthDate.getMonth() === date.getMonth();
    });

    // Filtra eventos que ocorrem exatamente no dia selecionado
    const dailyEvents = events.filter(e => {
        const eventDate = parseDateAsLocal(e.date);
        return isSameDay(eventDate, date);
    });

    return [...dailyBirthdays, ...dailyEvents].sort((a, b) => a.title.localeCompare(b.title));
  }, [date, birthdays, events]);
  
  const DayWithDots = (props: DayContentProps) => {
    const key = format(props.date, 'MM-dd');
    const dayEvents = eventsByDayOfYear[key];

    return (
      <div className="relative h-full w-full flex items-center justify-center">
        <span>{format(props.date, 'd')}</span>
        <div className="absolute bottom-1 flex space-x-0.5">
          {/* ✅ AZUL para homens (M) */}
          {dayEvents?.hasMale && <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
          {/* ✅ ROSA para mulheres (F) */}
          {dayEvents?.hasFemale && <div className="h-1.5 w-1.5 rounded-full bg-pink-500" />}
          {/* Eventos customizados */}
          {dayEvents?.hasEvent && <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
        </div>
      </div>
    );
  };

  const handleAddEvent = () => {
    if (newEventTitle && date) {
      addEvent({
        title: newEventTitle,
        type: 'event', // Adicionado para consistência
        date: format(date, 'yyyy-MM-dd'),
      });
      setNewEventTitle('');
      setIsAddModalOpen(false);
    }
  };

  const handleUpdateEvent = () => {
    if (editingEvent && editingEventTitle) {
      updateEvent(editingEvent.id, { title: editingEventTitle });
      setIsEditModalOpen(false);
      setEditingEvent(null);
    }
  };

  const handleDeleteEvent = () => {
    if (editingEvent) {
      deleteEvent(editingEvent.id);
      setIsEditModalOpen(false);
      setEditingEvent(null);
    }
  };

  const openEditModal = (event: CalendarEvent) => {
    if (event.type === 'event' || event.type === 'task') {
      setEditingEvent(event);
      setIsEditModalOpen(true);
    }
  };
  
  const EventIcon = ({ event }: { event: CalendarEvent }) => {
    if (event.type === 'birthday') {
      const member = members.find(m => `birthday-${m.id}` === event.id);
      const colorClass = member?.sexo === 'M' ? 'text-blue-500' : 'text-pink-500';
      return <Cake className={`h-4 w-4 ${colorClass} mr-2 flex-shrink-0`} />;
    }
    return <CalendarIcon className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0" />;
  };

  return (
    <div className="p-2 border-t mt-4 flex flex-col h-full">
      <h3 className="text-lg font-semibold mb-2 text-center flex-shrink-0">Calendário</h3>
      <div className="flex-shrink-0">
        <DayPicker
          mode="single"
          selected={date}
          onSelect={setDate}
          locale={ptBR}
          components={{ DayContent: DayWithDots }}
          className="flex justify-center"
        />
      </div>
      <div className="mt-4 flex-shrink-0">
         <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
                <Button className="w-full">Adicionar Evento</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Adicionar Novo Evento</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="title" className="text-right">Título</Label>
                        <Input id="title" value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">Data</Label>
                        <Input id="date" type="text" value={date ? format(date, 'dd/MM/yyyy') : ''} readOnly className="col-span-3" />
                    </div>
                </div>
                <DialogFooter><Button onClick={handleAddEvent}>Salvar</Button></DialogFooter>
            </DialogContent>
        </Dialog>
      </div>

       <div className="mt-4 flex flex-col flex-grow min-h-0">
        {/* ✅ CORREÇÃO: O título agora é dinâmico */}
        <h4 className="font-semibold text-center mb-2 flex-shrink-0">
          Eventos de {date ? format(date, 'dd/MM') : 'Hoje'}
        </h4>
        <ScrollArea className="flex-grow">
          <div className="space-y-2 pr-2">
            {/* ✅ CORREÇÃO: A lista agora usa os eventos do dia selecionado */}
            {eventsForSelectedDay.length > 0 ? (
              eventsForSelectedDay.map(event => {
                const eventDate = parseDateAsLocal(event.date);
                const isClickable = event.type === 'event' || event.type === 'task';
                return (
                    <div 
                      key={event.id} 
                      className={`text-sm p-2 bg-muted/50 rounded-md flex items-center ${isClickable ? 'cursor-pointer hover:bg-muted' : ''}`}
                      onClick={() => isClickable && openEditModal(event)}
                    >
                        <EventIcon event={event} />
                        <div className="flex-grow">
                            <span className="font-medium">{event.title}</span>
                        </div>
                    </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center">Nenhum evento para este dia.</p>
            )}
          </div>
        </ScrollArea>
       </div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Evento</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-title" className="text-right">Título</Label>
              <Input id="edit-title" value={editingEventTitle} onChange={(e) => setEditingEventTitle(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Data</Label>
                <Input type="text" value={editingEvent ? format(parseDateAsLocal(editingEvent.date), 'dd/MM/yyyy') : ''} readOnly className="col-span-3" />
            </div>
          </div>
          <DialogFooter className="justify-between sm:justify-between">
             <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Essa ação não pode ser desfeita. Isso irá remover permanentemente o evento.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteEvent}>Continuar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button onClick={handleUpdateEvent}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};