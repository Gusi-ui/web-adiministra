import React from 'react';

import Footer from './Footer';
import Header from './Header';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, showSidebar = true }) => (
  <div className='min-h-screen bg-gray-50 flex flex-col'>
    <Header />
    <div className='flex flex-1'>
      {showSidebar && <Sidebar />}
      <main className='flex-1 lg:ml-0 lg:pl-0'>{children}</main>
    </div>
    <Footer />
  </div>
);

export default Layout;
