import { Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Results from './pages/Results.jsx';
import RouteDetail from './pages/RouteDetail.jsx';
import About from './pages/About.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <nav className="app-nav">
        <NavLink to="/" className="app-nav__brand">
          AIR LENS
        </NavLink>
        <div className="app-nav__links">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Plan a route
          </NavLink>
          <NavLink to="/about" className={({ isActive }) => (isActive ? 'active' : '')}>
            About
          </NavLink>
        </div>
      </nav>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/results" element={<Results />} />
          <Route path="/route/:routeId" element={<RouteDetail />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>
    </div>
  );
}
