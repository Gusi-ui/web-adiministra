'use client';

import React from 'react';

import WorkerBottomNav from '@/components/layout/WorkerBottomNav';

export default function WorkerDashboardSectionLayout(
  props: React.PropsWithChildren
): React.JSX.Element {
  const { children } = props;
  return (
    <div className='pb-16'>
      {children}
      <WorkerBottomNav />
    </div>
  );
}
