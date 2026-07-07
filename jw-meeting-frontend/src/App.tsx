import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { AssignmentsPage } from "./pages/AssignmentsPage";
import { CongregationPage } from "./pages/CongregationPage";
import { Dashboard } from "./pages/Dashboard";
import { ImportPage } from "./pages/ImportPage";
import { PersonsPage } from "./pages/PersonsPage";
import { PrintPage } from "./pages/PrintPage";
import { ProgramsPage } from "./pages/ProgramsPage";
import { PrintCardsPage } from "./pages/PrintCardsPage";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="/congregation" element={<CongregationPage />} />
        <Route path="/persons" element={<PersonsPage />} />
        <Route path="/programs" element={<ProgramsPage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/assignments" element={<AssignmentsPage />} />
        <Route path="/print" element={<PrintPage />} />
        <Route path="/print-cards" element={<PrintCardsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
