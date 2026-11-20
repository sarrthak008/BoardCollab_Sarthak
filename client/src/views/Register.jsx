import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sileo } from "sileo";
import api from "../utils/api";

const Register = () => {
  const navigate = useNavigate();

  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const handleRegisterChange = (e) => {
    setRegisterData({ ...registerData, [e.target.name]: e.target.value });
  };

  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    const name = registerData.name.trim();
    const email = registerData.email.trim();
    const password = registerData.password;

    if (!name) {
      sileo.error({ title: "Name is required" });
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      sileo.error({ title: "Please enter a valid email address" });
      return;
    }

    if (password.length < 6) {
      sileo.error({ title: "Password must be at least 6 characters" });
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/api/auth/register", {
        name,
        email,
        password,
      });

      const { token, user } = res.data.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      sileo.success({
        title: "Account created!",
        description: `Welcome to BoardCollab, ${user.name}`,
      });
      setRegisterData({ name: "", email: "", password: "" });
      navigate("/rooms");
    } catch (error) {
      sileo.error({
        title: error.response?.data?.message || "Registration failed",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    const email = loginData.email.trim();
    const password = loginData.password;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      sileo.error({ title: "Please enter a valid email address" });
      return;
    }

    if (!password) {
      sileo.error({ title: "Password is required" });
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/api/auth/login", {
        email,
        password,
      });

      const { token, user } = res.data.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      sileo.success({
        title: "Welcome back!",
        description: `Logged in as ${user.email}`,
      });
      setLoginData({ email: "", password: "" });
      setIsLoginOpen(false);
      navigate("/rooms");
    } catch (error) {
      sileo.error({
        title: error.response?.data?.message || "Login failed",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 md:grid-cols-2 bg-white text-neutral-900 font-sans relative">
      {/* Top 10% Left 10% Back Arrow */}
      <a
        href="/"
        aria-label="Back to home"
        className="fixed top-[10%] left-[10%] z-20 flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-black transition"
      >
        <i className="ri-arrow-left-line text-lg"></i>
        <span>Back</span>
      </a>

      {/* Left Side: Image */}
      <div className="hidden md:flex items-center justify-center p-12 bg-white">
        <img
          src="/cursor.png"
          alt="Collaborate cursor"
          className="w-52 h-52 object-contain mix-blend-multiply"
        />
      </div>

      {/* Right Side: Clean White Register Form */}
      <div className="flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-12 bg-white">
        <div className="w-full max-w-sm mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-neutral-900 leading-snug">
              Create an{" "}
              <span className="bg-[#ffe11b] px-2 py-0.5 rounded-md">
                account
              </span>
            </h1>
            <p className="text-xs text-neutral-500 mt-4">
              Enter your details to get started with{" "}
              <span className="bg-[#bae6fd] text-neutral-900 font-medium px-1.5 py-0.5 rounded">
                BoardCollab
              </span>
              .
            </p>
          </div>
          <form onSubmit={handleRegisterSubmit} noValidate className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Name
              </label>
              <input
                type="text"
                name="name"
                value={registerData.name}
                onChange={handleRegisterChange}
                placeholder="Your name"
                className="w-full px-3.5 py-2 rounded-lg border border-neutral-200 bg-white text-sm focus:outline-none focus:border-black transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={registerData.email}
                onChange={handleRegisterChange}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2 rounded-lg border border-neutral-200 bg-white text-sm focus:outline-none focus:border-black transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={registerData.password}
                onChange={handleRegisterChange}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 rounded-lg border border-neutral-200 bg-white text-sm focus:outline-none focus:border-black transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white font-medium text-sm py-2.5 px-4 rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{loading ? "Please wait..." : "Register"}</span>
              <i className="ri-arrow-right-up-line text-base"></i>
            </button>
          </form>

          <p className="mt-5 text-xs text-neutral-500 text-center">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => setIsLoginOpen(true)}
              className="font-semibold text-neutral-900 underline decoration-[#ffe11b] decoration-2 underline-offset-4 hover:text-black cursor-pointer"
            >
              Login
            </button>
          </p>
        </div>
      </div>

      {/* Simple Login Modal Popup */}
      {isLoginOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs px-4"
          onClick={() => setIsLoginOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white border border-neutral-200 rounded-xl p-6 shadow-lg relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsLoginOpen(false)}
              aria-label="Close modal"
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 cursor-pointer"
            >
              <i className="ri-close-line text-lg"></i>
            </button>

            <h2 className="text-xl font-bold text-neutral-900">
              Welcome{" "}
              <span className="bg-[#bae6fd] px-2 py-0.5 rounded-md">back</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Sign in to your account
            </p>

            <form onSubmit={handleLoginSubmit} noValidate className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={loginData.email}
                  onChange={handleLoginChange}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:border-black transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={loginData.password}
                  onChange={handleLoginChange}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:border-black transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white font-medium text-sm py-2.5 px-4 rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{loading ? "Please wait..." : "Login"}</span>
                <i className="ri-login-box-line text-base"></i>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;