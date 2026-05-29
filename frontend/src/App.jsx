import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login";

import Signup from "./pages/Signup";

import Feed from "./pages/Feed";
import ProtectedRoute from "./components/ProtectedRoute";
import Profile from "./pages/Profile";

function App() {

  return (

    <Routes>

      <Route path="/" element={<Login />} />

      <Route path="/signup" element={<Signup />} />

      <Route
  path="/feed"
  element={
    <ProtectedRoute>

      <Feed />

    </ProtectedRoute>
  }
/>

          <Route
      path="/profile/:id"
      element={
        <ProtectedRoute>

          <Profile />

        </ProtectedRoute>
      }
    />

    </Routes>

  );

}

export default App;