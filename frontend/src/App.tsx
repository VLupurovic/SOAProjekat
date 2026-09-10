import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar/Navbar";

import Home from "./pages/Home/Home";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import Profile from "./pages/Profile/Profile";
import CreateBlog from "./pages/CreateBlog/CreateBlog";
import Blogs from "./pages/Blogs/Blogs";
import CreateTour from "./pages/CreateTour/CreateTour";
import MyTours from "./pages/MyTours/MyTours";
import TourDetail from "./pages/TourDetail/TourDetail";
import PositionSimulator from "./pages/PositionSimulator/PositionSimulator";
import PublicTour from "./pages/PublicTour/PublicTour";
import ShoppingCart from "./pages/ShoppingCart/ShoppingCart";
import Tours from "./pages/Tours/Tours";
import TourExecution from "./pages/TourExecution/TourExecution";
import Toast from "./components/Toast/Toast";
import MyPurchases from "./pages/MyPurchases/MyPurchases";

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Toast />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/create-blog" element={<CreateBlog />} />
        <Route path="/blogs" element={<Blogs />} />
        <Route path="/my-tours" element={<MyTours />} />
        <Route path="/create-tour" element={<CreateTour />} />
        <Route path="/tours/:id" element={<TourDetail />} />
        <Route path="/position-simulator" element={<PositionSimulator />} />
        <Route path="/tours" element={<Tours />} />
        <Route path="/tours/:id/view" element={<PublicTour />} />
        <Route path="/tours/:id/execution" element={<TourExecution />} />
        <Route path="/cart" element={<ShoppingCart />} />
        <Route path="/my-purchases" element={<MyPurchases />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;