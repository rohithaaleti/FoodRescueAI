import { BrowserRouter, Routes, Route } from "react-router-dom";

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

function App() {

  return (

    <BrowserRouter>

      <Routes>

        {/* Public */}

        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Restaurant */}

        <Route path="/restaurant" element={<RestaurantDashboard />} />
        <Route path="/add-food" element={<AddFood />} />
        <Route path="/my-donations" element={<MyDonations />} />
        <Route path="/edit/:id" element={<EditDonation />} />

        {/* NGO */}

        <Route path="/ngo" element={<NGODashboard />} />
        <Route
          path="/ngo/my-donations"
          element={<MyAcceptedDonations />}
        />

        {/* Admin */}

        <Route
          path="/admin"
          element={<AdminDashboard />}
        />

      </Routes>

    </BrowserRouter>

  );

}

export default App;