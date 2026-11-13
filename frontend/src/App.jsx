// Routing aplikasi. HashRouter agar bisa dihosting di mana saja (GitHub Pages/Netlify) dan offline.

import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAppState } from './state.js';
import { ToastHost } from './components/ui.jsx';
import { Welcome, StudentAuth, TeacherAuth } from './screens/Auth.jsx';
import { Home, Warmup, WorldMap, World, Result } from './screens/Student.jsx';
import Problem from './screens/problem/Problem.jsx';
import { Team } from './screens/Team.jsx';
import { Profile, Install, About } from './screens/Profile.jsx';
import { TeacherHome, TeacherClass } from './screens/Teacher.jsx';

const homeFor = (profile) => (profile?.role === 'teacher' ? '/teacher' : '/home');

function RequireRole({ role, children }) {
  const { profile } = useAppState();
  if (!profile?.onboarded) return <Navigate to="/welcome" replace />;
  if (profile.role !== role) return <Navigate to={homeFor(profile)} replace />;
  return children;
}

function PublicOnly({ children }) {
  const { profile } = useAppState();
  return profile?.onboarded ? <Navigate to={homeFor(profile)} replace /> : children;
}

function Root() {
  const { profile } = useAppState();
  return <Navigate to={profile?.onboarded ? homeFor(profile) : '/welcome'} replace />;
}

const student = (el) => <RequireRole role="student">{el}</RequireRole>;
const teacher = (el) => <RequireRole role="teacher">{el}</RequireRole>;

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Root />} />
        <Route path="/welcome" element={<PublicOnly><Welcome /></PublicOnly>} />
        <Route path="/siswa" element={<PublicOnly><StudentAuth /></PublicOnly>} />
        <Route path="/guru" element={<PublicOnly><TeacherAuth /></PublicOnly>} />

        <Route path="/home" element={student(<Home />)} />
        <Route path="/warmup" element={student(<Warmup />)} />
        <Route path="/map" element={student(<WorldMap />)} />
        <Route path="/world/:n" element={student(<World />)} />
        <Route path="/play/:id" element={student(<Problem />)} />
        <Route path="/result" element={student(<Result />)} />
        <Route path="/team" element={student(<Team />)} />
        <Route path="/profile" element={student(<Profile />)} />

        <Route path="/teacher" element={teacher(<TeacherHome />)} />
        <Route path="/teacher/class/:id" element={teacher(<TeacherClass />)} />

        <Route path="/install" element={<Install />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<Root />} />
      </Routes>
      <ToastHost />
    </HashRouter>
  );
}
