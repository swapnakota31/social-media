import { useNavigate } from "react-router-dom";

function Feed() {

  const navigate = useNavigate();

  const handleLogout = () => {

    localStorage.removeItem("token");

    navigate("/");

  };

  return (

    <div>

      <h1>Feed Page 🚀</h1>

      <button onClick={handleLogout}>
        Logout
      </button>

    </div>

  );

}

export default Feed;