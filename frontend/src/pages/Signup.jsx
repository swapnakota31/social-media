import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
function Signup() {

  const [username, setUsername] = useState("");
    
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleSignup = async () => {

    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/auth/signup`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          username,
          email,
          password,
        }),
      }
    );

    const data = await response.json();

    console.log(data);

    if (response.ok) {

      alert("Signup successful 🚀");
      navigate("/");    

    } else {

      alert(data.message);

    }

  };

  return (

    <div className="container">

      <div className="form-box">

        <h1>Signup</h1>

        <input
          type="text"
          placeholder="Enter username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="email"
          placeholder="Enter email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={handleSignup}>
          Signup
        </button>
<p>

  Already have an account?

  <Link to="/">
    Login
  </Link>

</p>
      </div>

    </div>

  );

}

export default Signup;