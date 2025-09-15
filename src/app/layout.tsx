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
  const googleMapsApiKey = process.env['NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'];

  return (
    <html lang='es'>
      <head>
        {googleMapsApiKey !== undefined &&
          googleMapsApiKey !== '' &&
          googleMapsApiKey !== 'your_google_maps_api_key' && (
            <script
              async
              defer
              src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places&loading=async`}
            />
          )}
      </head>
      <body className={`${geist.variable} ${geistMono.variable} font-sans`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
