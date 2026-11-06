import { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { MemberCreateDialog } from '@/components/dashboard/MemberCreateDialog';
import { MemberDirectory } from '@/components/dashboard/MemberDirectory';
import { useAppContext } from '@/contexts/useAppContext';

const MemberManagement = () => {
  const { members, onMemberUpdate, onMemberDelete, onRefresh } = useAppContext();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showDisconnected, setShowDisconnected] = useState(false);
  const visibleMembers = showDisconnected
    ? members
    : members.filter((member) => member.status !== 'desligado');

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Users className="h-6 w-6 text-primary" />
            Gestão de membros
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre, consulte, edite e remova membros do sistema.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-disconnected-members"
              checked={showDisconnected}
              onCheckedChange={(checked) => setShowDisconnected(checked === true)}
            />
            <label htmlFor="show-disconnected-members" className="cursor-pointer text-sm">
              Mostrar desligados ({members.filter((member) => member.status === 'desligado').length})
            </label>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Cadastrar novo membro
          </Button>
        </div>
      </div>

      <MemberDirectory
        members={visibleMembers}
        onMemberUpdate={onMemberUpdate}
        onMemberDelete={onMemberDelete}
        onRefresh={onRefresh}
      />

      <MemberCreateDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={onRefresh}
      />
    </div>
  );
};

export default MemberManagement;
