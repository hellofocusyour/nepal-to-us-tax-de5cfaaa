import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminLogin from "./pages/AdminLogin.tsx";
import AdminLayout from "./components/admin/AdminLayout.tsx";
import Dashboard from "./pages/admin/Dashboard.tsx";
import Students from "./pages/admin/Students.tsx";
import Inquiries from "./pages/admin/Inquiries.tsx";
import Payments from "./pages/admin/Payments.tsx";
import Batches from "./pages/admin/Batches.tsx";
import Announcements from "./pages/admin/Announcements.tsx";
import Reports from "./pages/admin/Reports.tsx";
import StudentLogin from "./pages/StudentLogin.tsx";
import StudentLayout from "./components/student/StudentLayout.tsx";
import StudentDashboard from "./pages/portal/StudentDashboard.tsx";

import StudentPayments from "./pages/portal/StudentPayments.tsx";
import StudentCertificates from "./pages/portal/StudentCertificates.tsx";
import StudentProfile from "./pages/portal/StudentProfile.tsx";
import StudentMyCourses from "./pages/portal/StudentMyCourses.tsx";
import StudentAnnouncements from "./pages/portal/StudentAnnouncements.tsx";
import StudentBatch from "./pages/portal/StudentBatch.tsx";
import StudentInbox from "./pages/portal/StudentInbox.tsx";
import AdminMyCourses from "./pages/admin/MyCourses.tsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.tsx";
import TermsOfService from "./pages/TermsOfService.tsx";
import RefundPolicy from "./pages/RefundPolicy.tsx";
import Inbox from "./pages/admin/Inbox.tsx";
import Integrations from "./pages/admin/Integrations.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="students" element={<Students />} />
              <Route path="inquiries" element={<Inquiries />} />
              <Route path="payments" element={<Payments />} />
              <Route path="batches" element={<Batches />} />
              <Route path="my-courses" element={<AdminMyCourses />} />
              <Route path="announcements" element={<Announcements />} />
              <Route path="reports" element={<Reports />} />
              <Route path="inbox" element={<Inbox />} />
              <Route path="settings/integrations" element={<Integrations />} />
            </Route>
            <Route path="/portal/login" element={<StudentLogin />} />
            <Route path="/login" element={<StudentLogin />} />
            <Route path="/signup" element={<StudentLogin />} />
            <Route path="/portal" element={<StudentLayout />}>
              <Route index element={<StudentDashboard />} />
              <Route path="batch" element={<StudentBatch />} />
              <Route path="my-courses" element={<StudentMyCourses />} />
              <Route path="syllabus" element={<StudentMyCourses />} />
              <Route path="courses" element={<StudentMyCourses />} />
              <Route path="announcements" element={<StudentAnnouncements />} />
              <Route path="payments" element={<StudentPayments />} />
              <Route path="certificates" element={<StudentCertificates />} />
              <Route path="profile" element={<StudentProfile />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
