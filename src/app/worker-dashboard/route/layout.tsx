import React from 'react';

import Script from 'next/script';

export default function RouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const googleMapsApiKey = process.env['NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'];

  return (
    <>
      {googleMapsApiKey !== undefined &&
        googleMapsApiKey !== '' &&
        googleMapsApiKey !== 'your_google_maps_api_key' && (
          <Script
            src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places&loading=async`}
            strategy='beforeInteractive'
          />
        )}
      {children}
    </>
  );
}
