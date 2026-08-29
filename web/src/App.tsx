import { Routes, Route } from "react-router-dom";
import { ProtectedLayout } from "./components/layout";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import OnboardingPage from "./pages/OnboardingPage";
import TreePage from "./pages/TreePage";
import SearchPage from "./pages/SearchPage";
import AIPage from "./pages/AIPage";
import SettingsPage from "./pages/SettingsPage";
import AdminPage from "./pages/AdminPage";
import PersonPage from "./pages/PersonPage";
import AddPersonPage from "./pages/AddPersonPage";
import StoriesPage from "./pages/StoriesPage";
import RelationPathPage from "./pages/RelationPathPage";

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/tree" element={<TreePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/ai" element={<AIPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/admin" element={<AdminPage />} />          <Route path="/persons/new" element={<AddPersonPage />} />
          <Route path="/persons/:id" element={<PersonPage />} />
          <Route path="/stories" element={<StoriesPage />} />
          <Route path="/relation-path" element={<RelationPathPage />} />
      </Route>
    </Routes>
  );
}
