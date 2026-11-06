import { useMemo, useState } from 'react';
import { Member, MemberFilters } from '@/types/member';
import { MemberList } from '@/components/dashboard/MemberList';
import { calculateAge, getMemberType } from '@/utils/memberUtils';

interface MemberDirectoryProps {
  members: Member[];
  filters?: MemberFilters;
  onMemberUpdate: (member: Member) => void;
  onMemberDelete: (memberId: string) => void;
  onRefresh: () => void;
}

export const MemberDirectory = ({
  members,
  filters = {},
  onMemberUpdate,
  onMemberDelete,
  onRefresh
}: MemberDirectoryProps) => {
  const [sortField, setSortField] = useState<keyof Member | 'idade' | 'tipo' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const sortedMembers = useMemo(() => {
    if (!sortField) return members;

    return [...members].sort((a, b) => {
      if (sortField === 'dataNascimento') {
        const parseDate = (date: string) => {
          if (!date) return { day: 0, month: 0 };
          const parsed = new Date(date);
          return { day: parsed.getDate(), month: parsed.getMonth() + 1 };
        };
        const aDate = parseDate(a.dataNascimento);
        const bDate = parseDate(b.dataNascimento);
        const monthDifference = aDate.month - bDate.month;
        const dayDifference = aDate.day - bDate.day;
        const difference = monthDifference || dayDifference;
        return sortDirection === 'asc' ? difference : -difference;
      }

      const getValue = (member: Member): string | number => {
        if (sortField === 'idade') return calculateAge(member.dataNascimento);
        if (sortField === 'tipo') return getMemberType(member);
        return member[sortField] as string | number;
      };

      const aValue = getValue(a);
      const bValue = getValue(b);
      const difference = typeof aValue === 'string' && typeof bValue === 'string'
        ? aValue.localeCompare(bValue)
        : Number(aValue) - Number(bValue);
      return sortDirection === 'asc' ? difference : -difference;
    });
  }, [members, sortDirection, sortField]);

  const handleSort = (field: keyof Member | 'idade' | 'tipo') => {
    if (sortField === field) {
      setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortField(field);
    setSortDirection('asc');
  };

  return (
    <div data-member-list>
      <MemberList
        members={sortedMembers}
        onMemberUpdate={onMemberUpdate}
        onMemberDelete={onMemberDelete}
        onRefresh={onRefresh}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        filters={filters}
      />
    </div>
  );
};
