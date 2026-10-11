import { Route, Routes } from 'react-router';
import { PublicLayout } from '../components/layout/PublicLayout';
import { HomePage } from '../pages/HomePage';
import { ServicesPage } from '../pages/ServicesPage';
import { TrackingPage } from '../pages/TrackingPage';
import { HelpPage } from '../pages/HelpPage';
import { ContactPage } from '../pages/ContactPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { DesignSystemShowcasePage } from '../pages/DesignSystemShowcasePage';
import { ApplicationSubmissionPage } from '../pages/ApplicationSubmissionPage';

export function AppRouter() {
  return (
    <Routes>
      {/* Public Layanan Shell Layout */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/layanan" element={<ServicesPage />} />
        <Route path="/ajukan" element={<ApplicationSubmissionPage />} />
        <Route path="/tracking" element={<TrackingPage />} />
        <Route path="/bantuan" element={<HelpPage />} />
        <Route path="/kontak" element={<ContactPage />} />
        
        {/* Design system showcase retained for audit & reference */}
        <Route path="/design-system" element={<DesignSystemShowcasePage />} />

        {/* 404 Public Error Page */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}