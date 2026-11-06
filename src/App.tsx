import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from '@/contexts/PostgreSQLContext';
import { Layout } from '@/components/layout/Layout';
import Index from '@/pages/Index';
import Analytics from '@/pages/Analytics';
import CalendarPage from '@/pages/CalendarPage';
import ImportacaoPage from '@/pages/ImportacaoPage';
import ConversorPage from '@/pages/ConversorPage';
import { ChurchSettings } from '@/pages/ChurchSettings';
import NetworkManagement from '@/pages/NetworkManagement';
import NetworkUpdatePage from '@/pages/NetworkUpdatePage';
import MemberManagement from '@/pages/MemberManagement';
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <AppProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Index />} />
                  <Route path="membros" element={<MemberManagement />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="calendar" element={<CalendarPage />} />
                  <Route path="importacao" element={<ImportacaoPage />} />
                  <Route path="conversor" element={<ConversorPage />} />
                  <Route path="configuracoes" element={<ChurchSettings />} />
                  <Route path="rede" element={<NetworkManagement />} />
                  <Route path="atualizacao" element={<NetworkUpdatePage />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AppProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
