import { useState } from 'react';
import { DeliveryOrdersList } from './DeliveryOrdersList';
import { CreateDeliveryOrder } from './CreateDeliveryOrder';
import { EditDeliveryOrder } from './EditDeliveryOrder';
import { DeliveryOrderDetails } from './DeliveryOrderDetails';

type ViewState = 'list' | 'create' | 'edit' | 'view';

export default function DeliveryOrdersPage() {
  const [view, setView] = useState<ViewState>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleBackToList = () => {
    setView('list');
    setSelectedId(null);
  };

  if (view === 'create') {
    return (
      <CreateDeliveryOrder 
        onBack={handleBackToList}
        onSuccess={(id) => {
          setSelectedId(id);
          setView('view');
        }}
      />
    );
  }

  if (view === 'edit' && selectedId) {
    return (
      <EditDeliveryOrder 
        id={selectedId}
        onBack={handleBackToList}
        onSuccess={() => setView('view')}
      />
    );
  }

  if (view === 'view' && selectedId) {
    return (
      <DeliveryOrderDetails 
        id={selectedId}
        onBack={handleBackToList}
      />
    );
  }

  return (
    <DeliveryOrdersList 
      onAdd={() => setView('create')}
      onEdit={(id) => {
        setSelectedId(id);
        setView('edit');
      }}
      onView={(id) => {
        setSelectedId(id);
        setView('view');
      }}
    />
  );
}

