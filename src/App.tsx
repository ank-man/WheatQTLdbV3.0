import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import About from './pages/About'
import Tutorial from './pages/Tutorial'
import Statistics from './pages/Statistics'
import Team from './pages/Team'
import FAQ from './pages/FAQ'
import Contact from './pages/Contact'
import UsefulLinks from './pages/UsefulLinks'
import DataIndex from './pages/DataIndex'
import QTLPage from './pages/QTLPage'
import MetaQTLPage from './pages/MetaQTLPage'
import EpistaticPage from './pages/EpistaticPage'
import CandidateGenesPage from './pages/CandidateGenesPage'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/tutorial" element={<Tutorial />} />
        <Route path="/statistics" element={<Statistics />} />
        <Route path="/data" element={<DataIndex />} />
        <Route path="/data/qtl" element={<QTLPage />} />
        <Route path="/data/metaqtl" element={<MetaQTLPage />} />
        <Route path="/data/epistatic" element={<EpistaticPage />} />
        <Route path="/data/candidate-genes" element={<CandidateGenesPage />} />
        <Route path="/team" element={<Team />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/links" element={<UsefulLinks />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}
