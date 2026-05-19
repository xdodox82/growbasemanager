import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Dashboard from "./pages/Dashboard";
import TodayTasksPage from "./pages/TodayTasksPage";
import CropsPage from "./pages/CropsPage";
import CustomersPage from "./pages/CustomersPage";
import SuppliersPage from "./pages/SuppliersPage";
import OrdersPage from "./pages/OrdersPage";
import PlantingPlanPage from "./pages/PlantingPlanPage";
import HarvestPackingPage from "./pages/HarvestPackingPage";
import BlendsPage from "./pages/BlendsPage";
import InventoryPage from "./pages/InventoryPage";
import OtherInventoryPage from "./pages/OtherInventoryPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import DeliveryPage from "./pages/DeliveryPage";
import PrepPlantingPage from "./pages/PrepPlantingPage";
import PrepPackagingPage from "./pages/PrepPackagingPage";
import CostsPage from "./pages/CostsPage";
import AuthPage from "./pages/AuthPage";
import UsersPage from "./pages/UsersPage";
import PricesPage from "./pages/PricesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary fullScreen>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/today" element={<ProtectedRoute><TodayTasksPage /></ProtectedRoute>} />
                <Route path="/customers" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
                <Route path="/suppliers" element={<ProtectedRoute><SuppliersPage /></ProtectedRoute>} />
                <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
                <Route path="/crops" element={<ProtectedRoute><CropsPage /></ProtectedRoute>} />
                <Route path="/blends" element={<ProtectedRoute><BlendsPage /></ProtectedRoute>} />
                <Route path="/planting" element={<ProtectedRoute><ErrorBoundary fallbackMessage="Chyba pri načítaní Plánu sadenia"><PlantingPlanPage /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/prep-planting" element={<ProtectedRoute><PrepPlantingPage /></ProtectedRoute>} />
                <Route path="/prep-packaging" element={<ProtectedRoute><PrepPackagingPage /></ProtectedRoute>} />
                <Route path="/harvest-packing" element={<ProtectedRoute><HarvestPackingPage /></ProtectedRoute>} />
                <Route path="/delivery" element={<ProtectedRoute><DeliveryPage /></ProtectedRoute>} />
                <Route path="/calendar" element={<Navigate to="/planting" replace />} />

                {/* Sklad — jedna stránka so záložkami */}
                <Route path="/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
                {/* Spätná kompatibilita — staré routes redirectujú na nový /inventory s ?tab= */}
                <Route path="/inventory/seeds" element={<Navigate to="/inventory" replace />} />
                <Route path="/inventory/packaging" element={<Navigate to="/inventory?tab=packaging" replace />} />
                <Route path="/inventory/substrate" element={<Navigate to="/inventory?tab=substrate" replace />} />
                <Route path="/inventory/labels" element={<Navigate to="/inventory?tab=labels" replace />} />
                <Route path="/inventory/consumables" element={<Navigate to="/inventory?tab=consumables" replace />} />
                {/* Iné inventory routes ktoré nie sú v novej stránke — ponechané */}
                <Route path="/inventory/other" element={<ProtectedRoute><OtherInventoryPage /></ProtectedRoute>} />

                {/* Náklady — jedna stránka so záložkami */}
                <Route path="/costs" element={<ProtectedRoute><CostsPage /></ProtectedRoute>} />
                {/* Spätná kompatibilita — staré /costs/* routes redirectujú na nový /costs s ?tab= */}
                <Route path="/costs/fuel" element={<Navigate to="/costs?tab=fuel" replace />} />
                <Route path="/costs/adblue" element={<Navigate to="/costs?tab=adblue" replace />} />
                <Route path="/costs/electricity" element={<Navigate to="/costs?tab=electricity" replace />} />
                <Route path="/costs/water" element={<Navigate to="/costs?tab=water" replace />} />
                <Route path="/costs/car-service" element={<Navigate to="/costs?tab=car-service" replace />} />
                <Route path="/costs/other" element={<Navigate to="/costs?tab=other" replace />} />

                <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
                <Route path="/prices" element={<ProtectedRoute><PricesPage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
