/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthProvider } from './AuthContext';
import Dashboard from './components/Dashboard';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background font-sans antialiased">
        <Dashboard />
        <Toaster position="top-right" />
      </div>
    </AuthProvider>
  );
}
