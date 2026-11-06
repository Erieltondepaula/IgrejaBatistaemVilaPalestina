// Local do arquivo: src/components/layout/Layout.tsx
// ✅ CÓDIGO FINAL COM O CALENDÁRIO DE VOLTA NA SIDEBAR

import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { BarChart2, Users, ListFilter, CalendarDays, Upload, FileSpreadsheet, Settings, Menu, Network } from "lucide-react";
import { Header } from "@/components/dashboard/Header";
import { NetworkUpdatePrompt } from "@/components/layout/NetworkUpdatePrompt";
import { useAppContext } from "@/contexts/useAppContext";
import { AppCalendar } from "@/components/dashboard/Calendar"; // Importar o calendário da sidebar
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const navigationItems = [
  { to: "/", label: "Filtros e resultados", icon: ListFilter },
  { to: "/membros", label: "Gestão de membros", icon: Users },
  { to: "/analytics", label: "Gráficos e Análises", icon: BarChart2 },
  { to: "/calendar", label: "Calendário Completo", icon: CalendarDays },
  { to: "/importacao", label: "Importação Interativa", icon: Upload, desktopOnly: true },
  { to: "/conversor", label: "Conversor de Arquivos", icon: FileSpreadsheet, desktopOnly: true },
  { to: "/configuracoes", label: "Configurações da Igreja", icon: Settings, desktopOnly: true },
  { to: "/rede", label: "Gerenciamento de Rede", icon: Network, desktopOnly: true },
];

export const Layout = () => {
  const { members, onFiltersChange } = useAppContext();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const renderNavigationLinks = (onNavigate?: () => void) => (
    <nav className="flex flex-col gap-2 mt-4">
      {navigationItems.map(({ to, label, icon: Icon, desktopOnly }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) => `${desktopOnly ? 'hidden md:flex' : 'flex'} items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${isActive ? "bg-muted text-primary" : ""}`}
        >
          <Icon className="h-4 w-4" /> {label}
        </NavLink>
      ))}
    </nav>
  );

  const handleCardClick = (statusGeral?: 'ativo' | 'desligado') => {
    console.log('🔵 Card clicado:', statusGeral);
    
    // Primeiro navega para a página principal
    navigate('/');
    
    // Aguarda um momento para a navegação completar, depois aplica o filtro
    setTimeout(() => {
      onFiltersChange({ statusGeral });
      console.log('🔵 Filtro aplicado:', { statusGeral });
      
      // Faz scroll para a lista de membros
      const memberList = document.querySelector('[data-member-list]');
      if (memberList) {
        memberList.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return (
    <div className="min-h-screen flex">
        <aside className="hidden w-80 shrink-0 bg-card border-r lg:flex lg:flex-col">
        <div className="p-4">
            <h1 className="text-2xl font-bold text-center">Menu</h1>
          {renderNavigationLinks()}
        </div>
        {/* ✅ ADICIONAR O CALENDÁRIO DE VOLTA À SIDEBAR */}
        <ScrollArea className="flex-1">
            <AppCalendar />
        </ScrollArea>
      </aside>
      <div className="min-w-0 flex-1 flex flex-col" style={{ background: 'none' }}>
        <NetworkUpdatePrompt />
        <header className="p-4 pb-0">
          <div className="mb-3 lg:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Abrir menu de navegação">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 max-w-[calc(100vw-1rem)] overflow-y-auto p-4">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                {renderNavigationLinks(() => setIsMobileMenuOpen(false))}
                <div className="mt-6 border-t pt-4">
                  <AppCalendar />
                </div>
              </SheetContent>
            </Sheet>
          </div>
           <Header members={members} onCardClick={handleCardClick} />
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};