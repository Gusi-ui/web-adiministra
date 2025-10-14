import React from 'react';

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { AuthProvider } from '@/contexts/AuthContext';

import './globals.css';
import { metadata as sharedMetadata } from './metadata';

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  ...sharedMetadata,
  title: 'SAD LAS - Sistema de Gestión',
  description:
    'Sistema de gestión de horas y asignaciones para trabajadores de servicios asistenciales domiciliarios',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='es'>
      <head />
      <body className={`${geist.variable} ${geistMono.variable} font-sans`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
