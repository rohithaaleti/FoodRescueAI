import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

import RestaurantDashboard from "./pages/RestaurantDashboard";
import AddFood from "./pages/AddFood";
import MyDonations from "./pages/MyDonations";
import EditDonation from "./pages/EditDonation";

import NGODashboard from "./pages/NGODashboard";
import MyAcceptedDonations from "./pages/MyAcceptedDonations";

import AdminDashboard from "./pages/AdminDashboard";
import VolunteerDashboard from "./pages/VolunteerDashboard";

function App() {

  return (

    <BrowserRouter>
      <AuthProvider>

      <Routes>

        {/* Public */}

        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Restaurant */}

        <Route path="/restaurant" element={<ProtectedRoute allowedRoles={["restaurant"]}><RestaurantDashboard /></ProtectedRoute>} />
        <Route path="/add-food" element={<ProtectedRoute allowedRoles={["restaurant"]}><AddFood /></ProtectedRoute>} />
        <Route path="/my-donations" element={<ProtectedRoute allowedRoles={["restaurant"]}><MyDonations /></ProtectedRoute>} />
        <Route path="/edit/:id" element={<ProtectedRoute allowedRoles={["restaurant"]}><EditDonation /></ProtectedRoute>} />

        {/* NGO */}

        <Route path="/ngo" element={<ProtectedRoute allowedRoles={["ngo"]}><NGODashboard /></ProtectedRoute>} />
        <Route
          path="/ngo/my-donations"
          element={<ProtectedRoute allowedRoles={["ngo"]}><MyAcceptedDonations /></ProtectedRoute>}
        />

        {/* Admin */}

        <Route
          path="/admin"
          element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>}
        />
        <Route
  path="/volunteer"
  element={<ProtectedRoute allowedRoles={["volunteer"]}><VolunteerDashboard /></ProtectedRoute>}
/>

      </Routes>
      </AuthProvider>

    </BrowserRouter>

  );

}

export default App;
