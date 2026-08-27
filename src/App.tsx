import {
  BrowserRouter,
  Route,
  Routes,
} from 'react-router-dom'

import DashboardPage from '@/pages/DashboardPage'
import LandingPage from '@/pages/LandingPage'
import LessonWorkspacePage from '@/pages/LessonWorkspacePage'
import LibraryPage from '@/pages/LibraryPage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import NotFoundPage from '@/pages/NotFoundPage'
import TextbookModePage from '@/pages/TextbookModePage'
import TopicLessonWorkspacePage from '@/pages/TopicLessonWorkspacePage'
import TopicModePage from '@/pages/TopicModePage'

// CHALKBOX_PRODUCT_RELEASE_IMPORTS
import ProductSessionSync from '@/components/product/ProductSessionSync'
import ProtectedProductRoute from '@/components/product/ProtectedProductRoute'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import MyTextbooksPage from '@/pages/MyTextbooksPage'
import PrivateTextbookGeneratePage from '@/pages/PrivateTextbookGeneratePage'
import ProductHomePage from '@/pages/ProductHomePage'
import ProductLessonPage from '@/pages/ProductLessonPage'
import ProductLibraryPage from '@/pages/ProductLibraryPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
function App() {
  return (
    <BrowserRouter>
      <ProductSessionSync />
      <Routes>
        <Route
          path="/"
          element={
            <LandingPage />
          }
        />

        <Route
          path="/login"
          element={
            <LoginPage />
          }
        />

        <Route
          path="/register"
          element={
            <RegisterPage />
          }
        />

        <Route
          path="/dashboard"
          element={
            <DashboardPage />
          }
        />

        <Route
          path="/library"
          element={
            <LibraryPage />
          }
        />

        <Route
          path="/textbook"
          element={
            <TextbookModePage />
          }
        />

        <Route
          path="/topic"
          element={
            <TopicModePage />
          }
        />

        <Route
          path="/topic/lesson"
          element={
            <TopicLessonWorkspacePage />
          }
        />

        <Route
          path="/lesson/:lessonKey"
          element={
            <LessonWorkspacePage />
          }
        />
        {/* CHALKBOX_PRODUCT_RELEASE_ROUTES */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/app" element={<ProtectedProductRoute><ProductHomePage /></ProtectedProductRoute>} />
        <Route path="/app/library" element={<ProtectedProductRoute><ProductLibraryPage /></ProtectedProductRoute>} />
        <Route path="/app/textbooks" element={<ProtectedProductRoute><MyTextbooksPage /></ProtectedProductRoute>} />
        <Route path="/app/textbooks/:documentId/generate" element={<ProtectedProductRoute><PrivateTextbookGeneratePage /></ProtectedProductRoute>} />
        <Route path="/app/lesson/:planId" element={<ProtectedProductRoute><ProductLessonPage /></ProtectedProductRoute>} />

        <Route
          path="*"
          element={
            <NotFoundPage />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App