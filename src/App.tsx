import { useState } from 'react';
import Header from './components/Header';
import MapView from './components/MapView';
import ListView from './components/ListView';
import CalendarView from './components/CalendarView';
import AddApartmentModal from './components/AddApartmentModal';
import { useApartments } from './hooks/useApartments';
import { useBlockedSlots } from './hooks/useBlockedSlots';
import { Apartment, AppView } from './types';

export default function App() {
  const [view, setView]                 = useState<AppView>('map');
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingApartment, setEditingApartment] = useState<Apartment | null>(null);

  const { apartments, loading, addApartment, updateApartment, deleteApartment } = useApartments();
  const { blockedSlots, addBlockedSlot, deleteBlockedSlot } = useBlockedSlots();

  const handleEdit = (apt: Apartment) => {
    setEditingApartment(apt);
    setShowAddModal(true);
  };

  const handleSave = async (data: Omit<Apartment, 'id' | 'createdAt'>) => {
    if (editingApartment) {
      await updateApartment(editingApartment.id, data);
    } else {
      await addApartment(data);
    }
  };

  const handleSetView = (v: AppView) => {
    setView(v);
    if (v === 'map') setPanelExpanded(false);
  };

  const panelOpen = view !== 'map';

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Header
        view={view}
        onSetView={handleSetView}
        onAddApartment={() => { setEditingApartment(null); setShowAddModal(true); }}
        apartmentCount={apartments.length}
      />

      <main className="flex-1 overflow-hidden relative">
        {/* Map always rendered as base layer */}
        <div
          className="absolute inset-0"
          style={{ opacity: loading ? 0.4 : 1, transition: 'opacity 0.2s' }}
        >
          <MapView
            apartments={apartments}
            onEdit={handleEdit}
            onDelete={deleteApartment}
            showList={panelOpen}
            listExpanded={panelExpanded}
          />
        </div>

        {/* List panel */}
        <ListView
          apartments={apartments}
          onEdit={handleEdit}
          onDelete={deleteApartment}
          show={view === 'list'}
          isExpanded={panelExpanded}
          onClose={() => { setView('map'); setPanelExpanded(false); }}
          onToggleExpand={() => setPanelExpanded(v => !v)}
        />

        {/* Calendar panel */}
        <CalendarView
          apartments={apartments}
          onEdit={handleEdit}
          blockedSlots={blockedSlots}
          onAddBlockedSlot={addBlockedSlot}
          onDeleteBlockedSlot={deleteBlockedSlot}
          show={view === 'calendar'}
          isExpanded={panelExpanded}
          onClose={() => { setView('map'); setPanelExpanded(false); }}
          onToggleExpand={() => setPanelExpanded(v => !v)}
        />
      </main>

      {showAddModal && (
        <AddApartmentModal
          onClose={() => { setShowAddModal(false); setEditingApartment(null); }}
          onSave={handleSave}
          editingApartment={editingApartment}
        />
      )}
    </div>
  );
}
