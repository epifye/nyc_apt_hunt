import { useState } from 'react';
import Header from './components/Header';
import MapView from './components/MapView';
import ListView from './components/ListView';
import AddApartmentModal from './components/AddApartmentModal';
import { useApartments } from './hooks/useApartments';
import { Apartment } from './types';

type View = 'map' | 'list';

export default function App() {
  const [view, setView] = useState<View>('map');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingApartment, setEditingApartment] = useState<Apartment | null>(null);

  const { apartments, addApartment, updateApartment, deleteApartment, replaceAll } = useApartments();

  const handleEdit = (apt: Apartment) => {
    setEditingApartment(apt);
    setShowAddModal(true);
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setEditingApartment(null);
  };

  const handleSave = (data: Omit<Apartment, 'id' | 'createdAt'>) => {
    if (editingApartment) {
      updateApartment(editingApartment.id, data);
    } else {
      addApartment(data);
    }
  };

  const handleImport = (imported: Apartment[]) => {
    const existing = apartments;
    const existingIds = new Set(existing.map(a => a.id));
    const newOnes = imported.filter(a => !existingIds.has(a.id));
    const merged = [...existing, ...newOnes];
    replaceAll(merged);
    if (newOnes.length === 0) {
      alert('All apartments in this file are already in your list.');
    } else {
      alert(`Imported ${newOnes.length} new apartment${newOnes.length > 1 ? 's' : ''}.`);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Header
        view={view}
        onViewChange={setView}
        onAddApartment={() => { setEditingApartment(null); setShowAddModal(true); }}
        apartmentCount={apartments.length}
        apartments={apartments}
        onImport={handleImport}
      />

      <main className="flex-1 overflow-hidden">
        {view === 'map' ? (
          <MapView
            apartments={apartments}
            onEdit={handleEdit}
            onDelete={deleteApartment}
          />
        ) : (
          <ListView
            apartments={apartments}
            onEdit={handleEdit}
            onDelete={deleteApartment}
          />
        )}
      </main>

      {showAddModal && (
        <AddApartmentModal
          onClose={handleModalClose}
          onSave={handleSave}
          editingApartment={editingApartment}
        />
      )}
    </div>
  );
}
