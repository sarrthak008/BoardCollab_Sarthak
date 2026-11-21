import React from "react";
import { useNavigate } from "react-router-dom";
import { sileo } from "sileo";
import { disconnectSocket } from "../utils/socket";

const Logout = () => {
  const navigate = useNavigate();

  const handelLogout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      disconnectSocket();

      sileo.success({
        title: "Logged out",
        description: "Switched account — sign in to continue",
      });

      navigate("/register");
    } catch (error) {
      sileo.error({
        title: "Logout failed",
        description: error.message,
      });
    }
  };

  return (
    <div
      onClick={handelLogout}
      className="absolute bottom-[10%] left-[10%] text-sm text-gray-500 hover:text-black transition cursor-pointer"
    >
      <span>
        use another account
        <i className="ri-aliens-line ml-2"></i>
      </span>
    </div>
  );
};

export default Logout;