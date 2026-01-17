import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import PlantingPage from "./pages/PlantingManagement";
import HarvestPage from "./pages/HarvestPage";
import BaleniePage from "./pages/BaleniePage";
import BlendsPage from "./pages/BlendsPage";
import SeedsPage from "./pages/SeedsPage";
import PackagingPage from "./pages/PackagingPage";
import SubstratePage from "./pages/SubstratePage";
import OtherInventoryPage from "./pages/OtherInventoryPage";
import LabelsPage from "./pages/LabelsPage";
import ReportsPage from "./pages/ReportsPage";
import CalendarPage from "./pages/CalendarPage";
import SettingsPage from "./pages/SettingsPage";
import DeliveryPage from "./pages/DeliveryPage";
import PrepPlantingPage from "./pages/PrepPlantingPage";
import PrepPackagingPage from "./pages/PrepPackagingPage";
import FuelCostsPage from "./pages/FuelCostsPage";
import AdblueCostsPage from "./pages/AdblueCostsPage";
import ElectricityCostsPage from "./pages/ElectricityCostsPage";
import WaterCostsPage from "./pages/WaterCostsPage";
import CarServiceCostsPage from "./pages/CarServiceCostsPage";
import OtherCostsPage from "./pages/OtherCostsPage";
import ConsumableInventoryPage from "./pages/ConsumableInventoryPage";
import AuthPage from "./pages/AuthPage";
import UsersPage from "./pages/UsersPage";
import PricesPage from "./pages/PricesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
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
              <Route path="/planting" element={<ProtectedRoute><ErrorBoundary fallbackMessage="Chyba pri načítaní Plánu sadenia"><PlantingPage /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/prep-planting" element={<ProtectedRoute><PrepPlantingPage /></ProtectedRoute>} />
              <Route path="/prep-packaging" element={<ProtectedRoute><PrepPackagingPage /></ProtectedRoute>} />
              <Route path="/harvest" element={<ProtectedRoute><HarvestPage /></ProtectedRoute>} />
              <Route path="/balenie" element={<ProtectedRoute><BaleniePage /></ProtectedRoute>} />
              <Route path="/delivery" element={<ProtectedRoute><DeliveryPage /></ProtectedRoute>} />
              <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
              <Route path="/inventory/seeds" element={<ProtectedRoute><SeedsPage /></ProtectedRoute>} />
              <Route path="/inventory/packaging" element={<ProtectedRoute><PackagingPage /></ProtectedRoute>} />
              <Route path="/inventory/substrate" element={<ProtectedRoute><SubstratePage /></ProtectedRoute>} />
              <Route path="/inventory/other" element={<ProtectedRoute><OtherInventoryPage /></ProtectedRoute>} />
              <Route path="/inventory/labels" element={<ProtectedRoute><LabelsPage /></ProtectedRoute>} />
              <Route path="/costs/fuel" element={<ProtectedRoute><FuelCostsPage /></ProtectedRoute>} />
              <Route path="/costs/adblue" element={<ProtectedRoute><AdblueCostsPage /></ProtectedRoute>} />
              <Route path="/costs/electricity" element={<ProtectedRoute><ElectricityCostsPage /></ProtectedRoute>} />
              <Route path="/costs/water" element={<ProtectedRoute><WaterCostsPage /></ProtectedRoute>} />
              <Route path="/costs/car-service" element={<ProtectedRoute><CarServiceCostsPage /></ProtectedRoute>} />
              <Route path="/costs/other" element={<ProtectedRoute><OtherCostsPage /></ProtectedRoute>} />
              <Route path="/inventory/consumables" element={<ProtectedRoute><ConsumableInventoryPage /></ProtectedRoute>} />
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
); 

export default App;
