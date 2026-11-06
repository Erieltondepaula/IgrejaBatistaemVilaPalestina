import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { APP_VERSION } from '@/constants/appVersion';
import {
  compareVersions,
  fetchReleaseManifest,
  getManifestUrl,
  readNetworkUpdateConfig,
  type ReleaseManifest,
} from '@/lib/networkUpdates';

const REMINDER_KEY = 'dashboard-update-reminder-v1';
const CHECK_INTERVAL_MS = 60_000;

type Reminder = { version: string; remindAt: number };
type PromptStep = 'question' | 'reminder';

const reminderOptions = [
  { value: '1', label: 'Daqui a 1 hora' },
  { value: '4', label: 'Daqui a 4 horas' },
  { value: '12', label: 'Daqui a 12 horas' },
  { value: '24', label: 'Amanhã' },
  { value: '72', label: 'Daqui a 3 dias' },
];

export function NetworkUpdatePrompt() {
  const location = useLocation();
  const navigate = useNavigate();
  const [release, setRelease] = useState<ReleaseManifest | null>(null);
  const [step, setStep] = useState<PromptStep>('question');
  const [reminderHours, setReminderHours] = useState('4');
  const [isOpen, setIsOpen] = useState(false);

  const checkForUpdate = useCallback(async () => {
    try {
      const config = readNetworkUpdateConfig();
      if (isOpen || config.role !== 'secundaria' || location.pathname === '/atualizacao') return;

      const manifest = await fetchReleaseManifest(getManifestUrl(config));
      if (compareVersions(manifest.version, APP_VERSION) <= 0) {
        setRelease(null);
        return;
      }

      const storedReminder = window.localStorage.getItem(REMINDER_KEY);
      const reminder = storedReminder ? JSON.parse(storedReminder) as Reminder : null;
      if (reminder?.version === manifest.version && reminder.remindAt > Date.now()) return;

      setRelease(manifest);
      setStep('question');
      setIsOpen(true);
    } catch (error) {
      console.warn('Não foi possível verificar atualizações da rede:', error);
    }
  }, [isOpen, location.pathname]);

  useEffect(() => {
    void checkForUpdate();
    const interval = window.setInterval(() => void checkForUpdate(), CHECK_INTERVAL_MS);
    const handleFocus = () => void checkForUpdate();
    window.addEventListener('focus', handleFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkForUpdate]);

  const openUpdatePage = () => {
    setIsOpen(false);
    navigate('/atualizacao');
  };

  const saveReminder = () => {
    if (!release) return;
    const remindAt = Date.now() + Number(reminderHours) * 60 * 60 * 1000;
    window.localStorage.setItem(REMINDER_KEY, JSON.stringify({ version: release.version, remindAt }));
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setIsOpen(true);
    } else if (step === 'question') {
      setStep('reminder');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            {step === 'question' ? 'Atualização disponível' : 'Quando lembrar novamente?'}
          </DialogTitle>
          <DialogDescription>
            {step === 'question'
              ? `A versão ${release?.version} está disponível na rede (${release?.fileCount ?? release?.files.length ?? 0} arquivos). Deseja atualizar este computador agora?`
              : `A atualização ${release?.version} continuará disponível. Escolha quando deseja receber o aviso novamente.`}
          </DialogDescription>
        </DialogHeader>
        {step === 'reminder' && (
          <Select value={reminderHours} onValueChange={setReminderHours}>
            <SelectTrigger aria-label="Quando lembrar novamente">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {reminderOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <DialogFooter>
          {step === 'question' ? (
            <>
              <Button variant="outline" onClick={() => setStep('reminder')}>Não, lembrar depois</Button>
              <Button onClick={openUpdatePage}>Sim, atualizar</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep('question')}>Voltar</Button>
              <Button onClick={saveReminder}>Salvar lembrete</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
