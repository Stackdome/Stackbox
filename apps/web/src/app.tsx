import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { PlaceholderPage } from './pages/placeholder/placeholder-page'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PlaceholderPage />} />
      </Routes>
    </BrowserRouter>
  )
}
