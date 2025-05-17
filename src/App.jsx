import MainPage from './components/MainPage'
import './App.css'
import { LanguageProvider } from './i18n/LanguageContext'

function App() {
  return (
    <LanguageProvider>
      <MainPage />
    </LanguageProvider>
  )
}

export default App
