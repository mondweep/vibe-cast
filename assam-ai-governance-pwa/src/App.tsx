import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './domains/shared/components/Layout';
import { Dashboard } from './pages/Dashboard';
import { PropertyRegistrationList } from './domains/property-registration/components/ApplicationList';
import { ApplicationDetail } from './domains/property-registration/components/ApplicationDetail';
import { NewApplication } from './domains/property-registration/components/NewApplication';
import { CostAuditingDashboard } from './domains/cost-auditing/components/AuditDashboard';
import { EstimateDetail } from './domains/cost-auditing/components/EstimateDetail';
import { NewEstimate } from './domains/cost-auditing/components/NewEstimate';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/property">
            <Route index element={<PropertyRegistrationList />} />
            <Route path="new" element={<NewApplication />} />
            <Route path=":id" element={<ApplicationDetail />} />
          </Route>
          <Route path="/auditing">
            <Route index element={<CostAuditingDashboard />} />
            <Route path="new" element={<NewEstimate />} />
            <Route path=":id" element={<EstimateDetail />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
